import "../helpers/ElementExtensions";
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ContentChild,
    ContentChildren,
    DoCheck,
    ElementRef,
    EventEmitter,
    forwardRef,
    Input,
    IterableDiffers,
    NgZone,
    OnChanges,
    Output,
    QueryList,
    SimpleChanges,
    TemplateRef
} from "@angular/core";
import {SimgularHelpers} from "../helpers/SimgularHelpers";
import {Logger} from "@simplism/core";
import {IterableDiffer} from "@angular/core/src/change_detection/differs/iterable_differs";
import {SdLocalStorageProvider} from "../providers/SdLocalStorageProvider";
import {SdModalProvider} from "../providers/SdModalProvider";
import {SdSheetColumnConfigModal} from "../modals/SdSheetColumnConfigModal";

@Component({
    selector: "sd-sheet",
    template: `
        <table>
            <thead>
            <tr>
                <th style="text-align: center">
                    <a (click)="onConfigButtonClick()" *ngIf="id">
                        <sd-icon icon="columns" [fixedWidth]="true"></sd-icon>
                    </a>
                </th>
                <th *ngFor="let column of displayColumns; trackBy: columnsTrackByFn">
                    {{ column.title }}
                </th>
            </tr>
            <tr *ngIf="hasHeaderTemplate">
                <th></th>
                <th *ngFor="let column of displayColumns; trackBy: columnsTrackByFn">
                    <ng-template [ngTemplateOutlet]="column.headerTemplateRef"></ng-template>
                </th>
            </tr>
            </thead>
            <tbody *ngFor="let item of displayItems; trackBy: itemsTrackByFn; let index = index">
            <tr>
                <td (click)="onFirstCellClick($event)">
                    <ng-container *ngIf="seqProp">
                        <a (click)="onSeqUpButtonClick(item)">
                            <sd-icon icon="angle-up" [fixedWidth]="true"></sd-icon>
                        </a>
                        <a (click)="onSeqDownButtonClick(item)">
                            <sd-icon icon="angle-down" [fixedWidth]="true"></sd-icon>
                        </a>
                    </ng-container>
                    <ng-container *ngIf="this.keyProp && !item[this.keyProp] && !this.disabled">
                        <a (click)="onItemRemoveButtonClick(item)">
                            <sd-icon icon="times" [fixedWidth]="true"></sd-icon>
                        </a>
                    </ng-container>
                </td>
                <td *ngFor="let column of displayColumns; trackBy: columnsTrackByFn"
                    [class]="'sd-sheet-column' + (column.class ? ' ' + column.class : '')"
                    [style]="column.style"
                    tabindex="0"
                    [attr.title]="column.title"
                    [attr.sd-fill]="column.fill">
                    <ng-template [ngTemplateOutlet]="column.itemTemplateRef"
                                 [ngTemplateOutletContext]="{item: item}"></ng-template>
                    <div class="outline"></div>
                </td>
            </tr>
            </tbody>
        </table>
        <div class="selector"></div>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdSheetControl implements OnChanges, AfterViewInit, DoCheck {
    private _logger = new Logger("SdSheet");

    @Input() id?: string;
    @Input() items?: any[];
    @Input() keyProp?: string;
    @Input() seqProp?: string;
    @Input() fixedColumnLength?: number;
    @Input() disabled?: boolean;
    @Input() selectedItem?: any;
    @Output() selectedItemChange = new EventEmitter<any | undefined>();
    @Output() remove = new EventEmitter<any>();

    _itemsDiffer?: IterableDiffer<any>;

    ngOnChanges(changes: SimpleChanges): void {
        SimgularHelpers.typeValidate(changes, {
            id: String,
            items: Array,
            keyProp: String,
            seqProp: String,
            fixedColumnLength: Number,
            disabled: Boolean
        });

        if (!this._itemsDiffer && changes["items"].currentValue) {
            this._itemsDiffer = this._differs.find(changes["items"].currentValue).create(this.itemsTrackByFn);
        }
    }

    itemsTrackByFn(index: number, item: any): any {
        if (this.keyProp && (item[this.keyProp] != undefined)) {
            return item[this.keyProp];
        }
        else {
            return item;
        }
    }

    @ContentChildren(forwardRef(() => SdSheetColumnControl)) columnControlList!: QueryList<SdSheetColumnControl>;

    get columns(): ISdSheetColumnDef[] {
        const currColumns = this.columnControlList.toArray().map((item, i) => ({
            title: item.title,
            sequence: i,
            isVisible: true,
            class: item.class,
            style: item.style,
            fill: item.fill,
            itemTemplateRef: item.itemTemplateRef,
            headerTemplateRef: item.headerTemplateRef
        }));

        const titleConfigs = (this._localStorage.get("simgular.sd-sheet.columns." + this.id) || []) as ISdSheetColumnDef[];

        for (const currColumn of currColumns) {
            const currConfig = titleConfigs.find(item => item.title === currColumn.title);
            Object.assign(currColumn, currConfig);
        }
        return currColumns.orderBy(item => item.sequence);
    }

    get displayColumns(): ISdSheetColumnDef[] {
        return this.columns.filter(item => item.isVisible);
    }

    get hasHeaderTemplate(): boolean {
        return this.displayColumns.some(item => !!item.headerTemplateRef);
    }

    get displayItems(): any[] | undefined {
        return this.items && this.seqProp ? this.items.orderBy(item => item[this.seqProp!]) : this.items;
    }

    columnsTrackByFn = (item: ISdSheetColumnDef) => item.title ? item.title : item;

    constructor(private _elementRef: ElementRef,
                private _differs: IterableDiffers,
                private _cdr: ChangeDetectorRef,
                private _localStorage: SdLocalStorageProvider,
                private _modal: SdModalProvider,
                private _zone: NgZone) {
    }

    ngDoCheck(): void {
        if (this._itemsDiffer) {
            const changes = this._itemsDiffer.diff(this.items!);
            if (changes) {
                this._logger.log("itemsChanged");
                this._cdr.markForCheck();
            }
        }
    }

    ngAfterViewInit(): void {
        this.redraw();
        const thisEl = this._elementRef.nativeElement as HTMLElement;

        this._zone.runOutsideAngular(() => {
            SimgularHelpers.detectElementChange(thisEl.find("> table")!, () => {
                this.redraw();
            }, {resize: false});
            thisEl.on("scroll", () => this.repositioning());
            thisEl.on("keydown", (event: KeyboardEvent) => this.onDocumentKeydown(event), true);
            thisEl.on("focus", (event: FocusEvent) => this.onFocus(event), true);
            thisEl.on("blur", (event: FocusEvent) => this.onBlur(event), true);
        });
    }

    onDocumentKeydown(event: KeyboardEvent): void {
        if (event.key.startsWith("Arrow")) {
            event.preventDefault();
        }

        const thisEl = this._elementRef.nativeElement as HTMLElement;
        const targetEl = event.target as HTMLElement;
        if (event.key === "Escape") {
            const cellEl = targetEl.matches("td") ? targetEl : targetEl.findParent("td");
            if (!cellEl) return;

            cellEl.focus();
        }
        else if (event.key === "F2") {
            const cellEl = targetEl.matches("td") ? targetEl : targetEl.findParent("td");
            if (!cellEl) return;

            const focusableEl = cellEl.findFocusable();
            if (!focusableEl) return;

            focusableEl.focus();
        }
        else if (event.key === "ArrowDown" && targetEl.tagName === "TD") {
            const cellEl = targetEl as HTMLTableCellElement;
            const trEl = cellEl.parentElement as HTMLTableRowElement;

            const nextTrEl = thisEl.findAll("> table > * > tr")[trEl.rowIndex + 1];
            if (!nextTrEl) return;

            const nextCellEl = nextTrEl.children.item(cellEl.cellIndex) as HTMLElement | undefined;
            if (!nextCellEl || !nextCellEl.classList.contains("sd-sheet-column")) return;

            nextCellEl.focus();
        }
        else if (event.key === "ArrowUp" && targetEl.tagName === "TD") {
            const cellEl = targetEl as HTMLTableCellElement;
            const trEl = cellEl.parentElement as HTMLTableRowElement;

            const nextTrEl = thisEl.findAll("> table > * > tr")[trEl.rowIndex - 1];
            if (!nextTrEl) return;

            const nextCellEl = nextTrEl.children.item(cellEl.cellIndex) as HTMLElement | undefined;
            if (!nextCellEl || !nextCellEl.classList.contains("sd-sheet-column")) return;

            nextCellEl.focus();
        }
        else if (event.key === "ArrowLeft" && targetEl.tagName === "TD") {
            const cellEl = targetEl as HTMLTableCellElement;
            const trEl = cellEl.parentElement as HTMLTableRowElement;

            const nextTrEl = thisEl.findAll("> table > * > tr")[trEl.rowIndex];
            if (!nextTrEl) return;

            const nextCellEl = nextTrEl.children.item(cellEl.cellIndex - 1) as HTMLElement | undefined;
            if (!nextCellEl || !nextCellEl.classList.contains("sd-sheet-column")) return;

            nextCellEl.focus();
        }
        else if (event.key === "ArrowRight" && targetEl.tagName === "TD") {
            const cellEl = targetEl as HTMLTableCellElement;
            const trEl = cellEl.parentElement as HTMLTableRowElement;

            const nextTrEl = thisEl.findAll("> table > * > tr")[trEl.rowIndex];
            if (!nextTrEl) return;

            const nextCellEl = nextTrEl.children.item(cellEl.cellIndex + 1) as HTMLElement | undefined;
            if (!nextCellEl || !nextCellEl.classList.contains("sd-sheet-column")) return;

            nextCellEl.focus();
        }
        else if (event.key === "Tab" && !event.shiftKey && targetEl.tagName === "TD") {
            const cellEl = targetEl as HTMLTableCellElement;
            const trEl = cellEl.parentElement as HTMLTableRowElement;

            let nextTrEl = thisEl.findAll("> table > * > tr")[trEl.rowIndex];
            if (!nextTrEl) return;

            let nextCellEl = nextTrEl.children.item(cellEl.cellIndex + 1) as HTMLElement | undefined;
            if (!nextCellEl || !nextCellEl.classList.contains("sd-sheet-column")) {
                nextTrEl = thisEl.findAll("> table > * > tr")[trEl.rowIndex + 1];
                if (!nextTrEl) return;

                nextCellEl = nextTrEl.find("> *.sd-sheet-column");
                if (!nextCellEl || !nextCellEl.classList.contains("sd-sheet-column")) return;
            }

            nextCellEl.focus();
            event.preventDefault();
        }
        else if (event.key === "Tab" && event.shiftKey && targetEl.tagName === "TD") {
            const cellEl = targetEl as HTMLTableCellElement;
            const trEl = cellEl.parentElement as HTMLTableRowElement;

            let nextTrEl = thisEl.findAll("> table > * > tr")[trEl.rowIndex];
            if (!nextTrEl) return;

            let nextCellEl = nextTrEl.children.item(cellEl.cellIndex - 1) as HTMLElement | undefined;
            if (!nextCellEl || !nextCellEl.classList.contains("sd-sheet-column")) {
                nextTrEl = thisEl.findAll("> table > * > tr")[trEl.rowIndex - 1];
                if (!nextTrEl) return;

                const nextCellEls = nextTrEl.findAll("> *.sd-sheet-column");
                nextCellEl = nextCellEls[nextCellEls.length - 1];
                if (!nextCellEl || !nextCellEl.classList.contains("sd-sheet-column")) return;
            }

            nextCellEl.focus();
            event.preventDefault();
        }
    }

    onFocus(event: FocusEvent): void {
        this.selectRow(event.target as HTMLElement);
        this.redrawFocusedOutline();
    }

    onBlur(event: FocusEvent): void {
        const targetEl = event.target as HTMLElement;

        const rowEl = targetEl.findParent("tr");
        if (!rowEl) return;

        const cellEl = targetEl.matches("td") ? targetEl : targetEl.findParent("td");
        if (!cellEl) return;

        const prevZIndex = cellEl.getAttribute("sd-prev-z-index");
        if (prevZIndex == null) return;

        cellEl.style.zIndex = prevZIndex;
        cellEl.removeAttribute("sd-prev-z-index");
    }

    onFirstCellClick(event: Event): void {
        this.selectRow(event.target as HTMLElement);
    }

    onSeqUpButtonClick(item: any): void {
        const items = this.items!.orderBy(item => item[this.seqProp!]);
        const index = items.indexOf(item);
        const prevItem = items[index - 1];
        if (!prevItem) return;

        const prevSeq = prevItem[this.seqProp!];
        prevItem[this.seqProp!] = item[this.seqProp!];
        item[this.seqProp!] = prevSeq;
    }

    onSeqDownButtonClick(item: any): void {
        const items = this.items!.orderBy(item => item[this.seqProp!]);
        const index = items.indexOf(item);
        const nextItem = items[index + 1];
        if (!nextItem) return;

        const nextSeq = nextItem[this.seqProp!];
        nextItem[this.seqProp!] = item[this.seqProp!];
        item[this.seqProp!] = nextSeq;
    }

    onItemRemoveButtonClick(item: any): void {
        const itemIndex = this.items!.indexOf(item);
        this.items!.splice(itemIndex, 1);
        this.remove.emit(item);
    }

    async onConfigButtonClick(): Promise<void> {
        const result = await this._modal.show("표시설정", SdSheetColumnConfigModal, {columns: this.columns});
        if (result) {
            this._localStorage.set("simgular.sd-sheet.columns." + this.id, result.columns);
            this._cdr.detectChanges();
        }
    }

    selectRow(target: HTMLElement): void {
        const thisEl = this._elementRef.nativeElement as HTMLElement;

        const row = target.findParent("tr");
        if (!row) return;

        const rowEls = thisEl.findAll(`> table > tbody > tr`);
        this._zone.run(() => {
            this.selectedItemChange.emit(this.items![rowEls.indexOf(row)]);
        });
        this.redrawSelectedRowOverlay();
    }

    redraw(): void {
        const thisEl = this._elementRef.nativeElement as HTMLElement;

        this._logger.log("redraw");

        const tableEl = thisEl.find("> table")!;
        const cellEls = tableEl.findAll("> * > tr > *");

        //-- 초기화
        thisEl.style.width = "10000px";

        thisEl.style.paddingTop = null;
        thisEl.style.paddingLeft = null;

        for (const cellElem of cellEls) {
            cellElem.style.top = null;
            cellElem.style.left = null;
            cellElem.style.minWidth = null;
            cellElem.style.minHeight = null;
            cellElem.style.position = null;
            cellElem.style.zIndex = null;
            cellElem.style.marginTop = null;
            cellElem.style.marginLeft = null;
        }

        thisEl.offsetHeight;

        //-- 셀 스타일 변경사항들 가져오기
        const cellStyles: [HTMLElement, string, string][] = [];

        // 각 셀 크기 고정
        for (const cellEl of cellEls) {
            cellStyles.push([cellEl, "min-width", cellEl.offsetWidth + "px"]);
            cellStyles.push([cellEl, "min-height", cellEl.offsetHeight + "px"]);
        }

        // title 셀 설정
        const cellLength = thisEl.findAll("> table > * > tr > *").length;
        let currIndex = cellLength + 1;
        const titleCellEls = tableEl.findAll(`> thead > tr > *`);
        for (let i = 0; i < titleCellEls.length; i++) {
            const titleCellEl = titleCellEls[i];
            cellStyles.push([titleCellEl, "min-width", titleCellEl.offsetWidth + "px"]);
            cellStyles.push([titleCellEl, "min-height", titleCellEl.offsetHeight + "px"]);
            cellStyles.push([titleCellEl, "top", titleCellEl.offsetTop + "px"]);
            cellStyles.push([titleCellEl, "left", titleCellEl.offsetLeft + "px"]);
            cellStyles.push([titleCellEl, "position", "absolute"]);
            cellStyles.push([titleCellEl, "z-index", (currIndex--).toString()]);
        }

        // fixed 셀 설정
        if (this.fixedColumnLength) {
            const fixedCellEls = tableEl.findAll(`> tbody > tr > *:nth-child(-n+${this.fixedColumnLength})`);
            for (const fixedCellEl of fixedCellEls) {
                cellStyles.push([fixedCellEl, "min-width", fixedCellEl.offsetWidth + "px"]);
                cellStyles.push([fixedCellEl, "min-height", fixedCellEl.offsetHeight + "px"]);
                cellStyles.push([fixedCellEl, "top", fixedCellEl.offsetTop + "px"]);
                cellStyles.push([fixedCellEl, "left", fixedCellEl.offsetLeft + "px"]);
                cellStyles.push([fixedCellEl, "position", "absolute"]);
                cellStyles.push([fixedCellEl, "z-index", (currIndex--).toString()]);
            }
        }

        // 포커싱된 셀 z-index 수정
        const focusedCellElem = thisEl.find("*[sd-prev-z-index]");
        if (focusedCellElem) {
            cellStyles.push([focusedCellElem, "z-index", (cellLength + 2).toString()]);
        }

        //-- 실제 스타일 변경
        for (const cellStyle of cellStyles) {
            cellStyle[0].style[cellStyle[1]] = cellStyle[2];
        }

        // thead만큼 상단 띄우기
        const headFirstCellEls = tableEl.findAll("> thead > tr > *:nth-child(1)");
        thisEl.style.paddingTop = headFirstCellEls.sum(item => item.offsetHeight) + "px";

        // fixed만큼 좌측 띄우기
        if (this.fixedColumnLength) {
            const fixedColumnElList = tableEl.findAll(`> thead:first-child > tr > *:nth-child(-n+${this.fixedColumnLength})`);
            const fixedWidth = fixedColumnElList.map(item => item.offsetWidth).reduce((p, n) => p + n);
            thisEl.style.paddingLeft = fixedWidth + "px";
        } else {
            thisEl.style.paddingLeft = null;
        }

        thisEl.style.width = null;

        this.repositioning();
        this.redrawSelectedRowOverlay();
    }

    repositioning(): void {
        const thisEl = this._elementRef.nativeElement as HTMLElement;
        const titleCellEls = thisEl.findAll("> table > thead > tr > *");
        for (const titleCellEl of titleCellEls) {
            titleCellEl.style.marginTop = thisEl.scrollTop + "px";
        }

        if (this.fixedColumnLength) {
            const fixedCellEls = thisEl.findAll(`> table > * > tr > *:nth-child(-n+${this.fixedColumnLength})`);
            for (const fixedCellEl of fixedCellEls) {
                fixedCellEl.style.marginLeft = thisEl.scrollLeft + "px";
            }
        }
    }

    redrawFocusedOutline(): void {
        const thisEl = this._elementRef.nativeElement as HTMLElement;
        const targetEl = document.activeElement as HTMLElement | undefined;
        if (!targetEl) return;

        const cellEl = targetEl.matches("td") ? targetEl : targetEl.findParent("td");
        if (!cellEl) return;

        const cellLength = thisEl.findAll("> table > * > tr > *").length;
        cellEl.setAttribute("sd-prev-z-index", cellEl.style.zIndex!);
        cellEl.style.zIndex = (cellLength + 2).toString();

        const scrollLeft = thisEl.scrollLeft;
        const scrollTop = thisEl.scrollTop;

        const headFirstCellEls = thisEl.findAll("> table > thead > tr > *:nth-child(1)");
        const fixedHeight = headFirstCellEls.sum(item => item.offsetHeight);

        const offsetLeft = cellEl.offsetLeft;
        const offsetTop = cellEl.offsetTop;

        if (scrollTop > offsetTop - fixedHeight) {
            thisEl.scrollTop = offsetTop - fixedHeight;
        }

        if (this.fixedColumnLength) {
            const fixedColumnEls = thisEl.findAll(`> table > thead:first-child > tr > *:nth-child(-n+${this.fixedColumnLength})`);
            const fixedWidth = fixedColumnEls.sum(item => item.offsetWidth);

            if (scrollLeft > offsetLeft - fixedWidth) {
                thisEl.scrollLeft = offsetLeft - fixedWidth;
            }
        }

        if (scrollTop + thisEl.offsetHeight < offsetTop + cellEl.offsetHeight) {
            const scrollbarHeight = thisEl.offsetHeight - thisEl.clientHeight;
            thisEl.scrollTop = offsetTop + cellEl.offsetHeight - thisEl.offsetHeight + scrollbarHeight;
        }

        if (scrollLeft + thisEl.offsetWidth < offsetLeft + cellEl.offsetWidth) {
            const scrollbarWidth = thisEl.offsetWidth - thisEl.clientWidth;
            thisEl.scrollLeft = offsetLeft + cellEl.offsetWidth - thisEl.offsetWidth + scrollbarWidth;
        }
    }

    redrawSelectedRowOverlay(): void {
        const thisEl = this._elementRef.nativeElement as HTMLElement;
        const cellLength = thisEl.findAll("> table > * > tr > *").length;

        const selectorEl = thisEl.find("> .selector")!;
        if (this.items && this.selectedItem != undefined && this.items.includes(this.selectedItem)) {
            const selectedRow = this.items.indexOf(this.selectedItem);
            const row = thisEl.find(`> table > tbody:nth-child(${selectedRow + 2}) > tr`);
            if (row) {
                selectorEl.style.top = row.offsetTop + Number(thisEl.style.paddingTop!.slice(0, -2)) + "px";
                selectorEl.style.left = row.offsetLeft + "px";
                selectorEl.style.width = row.offsetWidth + (thisEl.style.paddingLeft ? Number(thisEl.style.paddingLeft.slice(0, -2)) : 0) - 1 + "px";
                selectorEl.style.height = row.offsetHeight - 1 + "px";
                selectorEl.style.zIndex = (cellLength + 3).toString();
                selectorEl.style.display = "block";
            }
        }
        else {
            selectorEl.style.display = "none";
        }
    }
}

@Component({
    selector: `sd-sheet-column`,
    template: ``,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdSheetColumnControl implements OnChanges {
    @Input() title: string = "";
    @Input() class?: string;
    @Input() style?: string;
    @Input() fill?: boolean;

    ngOnChanges(changes: SimpleChanges): void {
        SimgularHelpers.typeValidate(changes, {
            title: {
                type: String,
                required: true
            },
            class: String,
            style: String,
            fill: Boolean
        });
    }

    @ContentChild("item") itemTemplateRef?: TemplateRef<any>;
    @ContentChild("header") headerTemplateRef?: TemplateRef<any>;
}

export interface ISdSheetColumnDef {
    title: string;
    sequence: number;
    isVisible: boolean;
    class?: string;
    style?: string;
    fill?: boolean;
    itemTemplateRef?: TemplateRef<any>;
    headerTemplateRef?: TemplateRef<any>;
}