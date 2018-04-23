//tslint:disable:no-null-keyword

import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    NgZone,
    Output,
    ViewChild
} from "@angular/core";
import {SimgularHelpers} from "../helpers/SimgularHelpers";
import {DateOnly, Wait} from "@simplism/core";
import {SdFocusProvider} from "../providers/SdFocusProvider";
import {ThemeStrings} from "..";

@Component({
    selector: "sd-table",
    template: `
        <table [ngClass]="styleClass">
            <ng-content></ng-content>
        </table>`,
    host: {
        "(keydown)": "onKeydown($event)"
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdTableControl implements AfterViewInit {
    private _selectedCellIndex: [number | undefined, number | undefined] = [undefined, undefined];

    @Input() fixedColumns = 0;
    @Input() full = false;
    @Input() stripe = false;
    @Input() clickable = false;
    @Input() bordered = false;
    @Input() hoverable = true;
    @Input() selectable = true;

    @Input() set selectedRow(value: number | undefined) {
        this._selectedCellIndex[0] = value;
        this.redrawSelection();
    }

    @Output() selectedRowChange = new EventEmitter<number | undefined>();

    @Input()
    set sheet(value: boolean) {
        this._sheet = value;
        this.redraw();
    }

    get sheet(): boolean {
        return this._sheet;
    }

    private _sheet = false;

    get styleClass(): string[] {
        return [
            this.clickable ? "_clickable" : "",
            this.full ? "_full" : "",
            this.stripe ? "_stripe" : "",
            this.sheet ? "_sheet" : "",
            this.bordered ? "_bordered" : "",
            this.hoverable ? "_hoverable" : "",
            this.selectable ? "_selectable" : ""
        ].filter(item => item);
    }

    constructor(private _elementRef: ElementRef,
                private _zone: NgZone) {
    }

    ngAfterViewInit(): void {
        this._zone.runOutsideAngular(() => {
            const thisElem = this._elementRef.nativeElement as HTMLElement;
            thisElem.addEventListener("scroll", this.repositioning.bind(this));

            this.redraw();
            this.redrawSelection(false);

            SimgularHelpers.detectElementChange(thisElem, () => {
                this.redraw();
                this.redrawSelection(false);
            }, {
                resize: false
            });

            SimgularHelpers.detectElementChange(thisElem, () => {
                this.refocusing();
            }, {
                childList: false
            });

            const setSelectedCellIndexByEvent = (event: Event) => {
                const targetElem = event.target as HTMLElement;

                const rowElemList = Array.from(thisElem.querySelectorAll(":scope > table > tbody"));

                const selectedRowElem = this.getTargetRowElem(targetElem);
                if (selectedRowElem === null) return;
                const rowIndex = rowElemList.indexOf(selectedRowElem);

                const selectedCellElem = this.getTargetCellElem(targetElem);
                if (selectedCellElem === null) return;

                const selectedRowCellElemList = Array.from(selectedRowElem.querySelectorAll(":scope > tr > *:not(th)"));
                const colIndex = selectedRowCellElemList.indexOf(selectedCellElem);

                if (this._selectedCellIndex[0] !== rowIndex) {
                    this._zone.run(() => {
                        this.selectedRowChange.emit(rowIndex);
                    });
                }
                this._selectedCellIndex = [rowIndex, colIndex];
                this.redrawSelection(false);
            };

            thisElem.addEventListener("mousedown", event => {
                setSelectedCellIndexByEvent(event);
            }, true);

            thisElem.addEventListener("focus", () => {
                this.refocusing();
            }, true);
        });
    }

    getTargetRowElem(targetElem: HTMLElement): HTMLElement | null {
        let selectedRowElem: HTMLElement | null = targetElem;
        while (!(selectedRowElem === null || selectedRowElem!.tagName.toLowerCase() === "tbody")) {
            selectedRowElem = selectedRowElem.parentElement;
        }
        return selectedRowElem;
    }

    getTargetCellElem(targetElem: HTMLElement): HTMLElement | null {
        let selectedCellElem: HTMLElement | null = targetElem;
        while (!(selectedCellElem === null || selectedCellElem!.tagName.toLowerCase() === "td" || selectedCellElem!.tagName.toLowerCase().startsWith("sd-cell"))) {
            selectedCellElem = selectedCellElem.parentElement;
        }
        return selectedCellElem;
    }

    getCellElem(rowIndex: number, colIndex: number): HTMLElement | null {
        const thisElem = this._elementRef.nativeElement as HTMLElement;
        const rowElem = thisElem.querySelectorAll(":scope > table > tbody")[rowIndex] as HTMLElement;
        return rowElem ? rowElem.querySelectorAll(":scope > tr > *:not(th)")[colIndex] as HTMLElement : null;
    }

    repositioning(): void {
        const thisElem = this._elementRef.nativeElement as HTMLElement;

        const headerCellList = Array.from(thisElem.querySelectorAll(":scope > table > thead > tr > *")) as HTMLElement[];
        for (const item of headerCellList) {
            item.style.marginTop = (thisElem.scrollTop || 0) + "px";
        }

        const fixedCellList = Array.from(thisElem.querySelectorAll(":scope > table > * > tr > *._fixed")) as HTMLElement[];
        for (const item of fixedCellList) {
            item.style.marginLeft = (thisElem.scrollLeft || 0) + "px";
        }
    }

    refocusing(): void {
        const thisElem = this._elementRef.nativeElement as HTMLElement;
        const targetElem = document.activeElement as HTMLElement;
        if (!targetElem) return;

        const scrollLeft = thisElem.scrollLeft;
        const scrollTop = thisElem.scrollTop;

        const fixedColumnElemList = Array.from(thisElem.querySelectorAll(":scope > table > *:first-child > tr:first-child > *._fixed")) as HTMLElement[];
        const fixedWidth = fixedColumnElemList.sum(item => item.offsetWidth);
        const fixedRowElemList = Array.from(thisElem.querySelectorAll(":scope > table > thead > tr > *:first-child")) as HTMLElement[];
        const fixedHeight = fixedRowElemList.sum(item => item.offsetHeight);

        const selectedCellElem = this.getTargetCellElem(targetElem);
        if (selectedCellElem === null) return;

        const offsetLeft = selectedCellElem.offsetLeft;
        const offsetTop = selectedCellElem.offsetTop;

        if (scrollLeft > offsetLeft - fixedWidth) {
            thisElem.scrollLeft = offsetLeft - fixedWidth;
        }

        if (scrollTop > offsetTop - fixedHeight) {
            thisElem.scrollTop = offsetTop - fixedHeight;
        }

        if (scrollLeft + thisElem.offsetWidth < offsetLeft + selectedCellElem.offsetWidth) {
            const scrollbarWidth = thisElem.offsetWidth - thisElem.clientWidth;
            thisElem.scrollLeft = offsetLeft + selectedCellElem.offsetWidth - thisElem.offsetWidth + scrollbarWidth;
        }

        if (scrollTop + thisElem.offsetHeight < offsetTop + selectedCellElem.offsetHeight) {
            const scrollbarHeight = thisElem.offsetHeight - thisElem.clientHeight;
            thisElem.scrollTop = offsetTop + selectedCellElem.offsetHeight - thisElem.offsetHeight + scrollbarHeight;
        }
    }

    redraw(): void {
        const thisElem = this._elementRef.nativeElement as HTMLElement;
        const tableElem = thisElem.querySelector(":scope > table") as HTMLTableElement;
        const cellElemList = Array.from(tableElem.querySelectorAll(":scope > * > tr > *")) as HTMLElement[];

        //-- 초기화
        thisElem.style.width = "10000px";

        tableElem.style.display = null;
        tableElem.style.width = null;
        tableElem.style.height = null;

        for (const cellElem of cellElemList) {
            cellElem.style.position = null;
            cellElem.style.display = null;
            cellElem.style.top = null;
            cellElem.style.left = null;
            cellElem.style.width = null;
            cellElem.style.height = null;
            cellElem.style.borderRight = null;
            cellElem.style.borderBottom = null;
            cellElem.style.zIndex = null;
            cellElem.classList.remove("_fixed");
            if (!["th", "sd-column-selector"].includes(cellElem.tagName.toLowerCase())) {
                if (this.sheet) {
                    cellElem.setAttribute("tabindex", "0");
                } else {
                    cellElem.removeAttribute("tabindex");
                }
            }
        }

        //-- fixed 셀 설정
        if (this.fixedColumns) {
            const cellMap = this._getCellElemMap();
            for (const row of cellMap) {
                for (const cellElem of row.filter((item, i) => i < this.fixedColumns)) {
                    cellElem.classList.add("_fixed");
                }
            }
        }

        //-- 테이블 크기 가져오기
        const tableStat = {
            width: tableElem.offsetWidth || 0,
            height: tableElem.offsetHeight || 0
        };

        //-- 각 셀 위치/크기 가져오기
        const cellStats = cellElemList.map((item, i) => {
            const result: {
                elem: HTMLElement;
                top: number;
                left: number;
                width: number;
                height: number;
                zIndex: number;
                borderRight: string | null;
                borderBottom: string | null;
            } = {
                elem: item,
                top: item.offsetTop,
                left: item.offsetLeft,
                width: item.offsetWidth,
                height: item.offsetHeight + 1,
                zIndex: cellElemList.length - i,
                borderRight: null,
                borderBottom: null
            };

            if (item.classList.contains("_fixed")) {
                result.zIndex = cellElemList.length + i;

                if (Array.from(item.parentElement!.querySelectorAll(":scope > ._fixed")).last() === item) {
                    result.borderRight = "1px solid #9E9E9E";
                }
            }

            if (item.parentElement!.parentElement!.tagName.toLowerCase() === "thead") {
                result.borderBottom = "1px solid #9E9E9E";

                if (item.classList.contains("_fixed")) {
                    result.zIndex = (cellElemList.length * 3) + i;
                } else {
                    result.zIndex = (cellElemList.length * 2) + i;
                }
            }

            return result;
        });


        //-- 테이블 크기 지정
        tableElem.style.display = "block";
        tableElem.style.width = tableStat.width + "px";
        tableElem.style.height = tableStat.height + "px";

        //-- 각 셀 위치/크기 지정
        for (const stat of cellStats) {
            stat.elem.style.position = "absolute";
            stat.elem.style.display = "block";
            stat.elem.style.top = stat.top + "px";
            stat.elem.style.left = stat.left + "px";
            stat.elem.style.width = stat.width + "px";
            stat.elem.style.height = stat.height + "px";
            stat.elem.style.borderRight = stat.borderRight;
            stat.elem.style.borderBottom = stat.borderBottom;
            stat.elem.style.zIndex = stat.zIndex.toString();
        }

        this.repositioning();

        thisElem.style.width = null;

        this.refocusing();
    }

    redrawSelection(focusing: boolean = true): void {
        if (!this.sheet) return;

        const thisElem = this._elementRef.nativeElement as HTMLElement;
        const rowElemList = Array.from(thisElem.querySelectorAll(":scope > table > tbody"));
        for (const rowElem of rowElemList) {
            rowElem.classList.remove("sd-background-primary-state");
        }

        if (this._selectedCellIndex[0] === undefined || this._selectedCellIndex[1] === undefined) {
            const targetElem = thisElem.querySelector(":focus") as HTMLElement;
            if (targetElem) targetElem.blur();
            this._selectedCellIndex[1] = undefined;
            return;
        }

        const selectedRowElem = thisElem.querySelectorAll(":scope > table > tbody").item(this._selectedCellIndex[0]!) as HTMLElement;
        if (!selectedRowElem) {
            this._zone.run(() => {
                this._selectedCellIndex = [undefined, undefined];
                this.selectedRowChange.emit(undefined);
            });
            return;
        }

        const selectedCellElem = selectedRowElem.querySelectorAll(":scope > tr > *:not(th)").item(this._selectedCellIndex[1]!) as HTMLElement;
        if (!selectedCellElem) {
            this._zone.run(() => {
                this._selectedCellIndex = [undefined, undefined];
                this.selectedRowChange.emit(undefined);
            });
            return;
        }

        if (this.selectable) {
            selectedRowElem.classList.add("sd-background-primary-state");
        }

        if (focusing) {
            if (!Array.from(selectedCellElem.querySelectorAll(":scope *")).includes(document.activeElement)) {
                selectedCellElem.focus();
            }
        }
    }

    private _getCellElemMap(): HTMLElement[][] {
        const thisElem = this._elementRef.nativeElement as HTMLElement;
        const tableElem = thisElem.querySelector(":scope > table") as HTMLTableElement;
        const rowElemList = Array.from(tableElem.querySelectorAll(":scope > * > tr")) as HTMLElement[];

        const result: HTMLElement[][] = [];
        for (let rowIndex = 0; rowIndex < rowElemList.length; rowIndex++) {
            if (!result[rowIndex]) result[rowIndex] = [];

            const cellElemList = Array.from(rowElemList[rowIndex].querySelectorAll(":scope > *")) as HTMLTableCellElement[];
            let colIndex = 0;
            for (const cellElem of cellElemList) {
                while (result[rowIndex][colIndex]) {
                    colIndex++;
                }

                const rowspan = cellElem.rowSpan || 1;
                const colspan = cellElem.colSpan || 1;
                for (let r = 0; r < rowspan; r++) {
                    for (let c = 0; c < colspan; c++) {
                        if (!result[rowIndex + r]) result[rowIndex + r] = [];
                        result[rowIndex + r][colIndex + c] = cellElem;
                    }
                }
            }
        }

        return result;
    }

    onKeydown(event: KeyboardEvent): void {
        const thisElem = this._elementRef.nativeElement as HTMLElement;

        if (event.key === "ArrowLeft") {
            if (document.activeElement.tagName.toLowerCase() === "input") {
                return;
            }
            event.preventDefault();

            if (this._selectedCellIndex[1]! > 0) {
                this._selectedCellIndex[1]!--;
                this.redrawSelection();
            }
        }

        else if (event.key === "ArrowRight") {
            if (document.activeElement.tagName.toLowerCase() === "input") {
                return;
            }

            event.preventDefault();

            const nextCellElem = this.getCellElem(this._selectedCellIndex[0]!, this._selectedCellIndex[1]! + 1);
            if (nextCellElem) {
                this._selectedCellIndex[1]!++;
                this.redrawSelection();
            }
        }

        else if (event.key === "ArrowUp") {
            if (document.activeElement.tagName.toLowerCase() === "input") {
                return;
            }
            if (document.activeElement.tagName.toLowerCase() === "select") {
                return;
            }

            event.preventDefault();

            if (this._selectedCellIndex[0]! > 0) {
                let rowIndex = this._selectedCellIndex[0]!;
                while (true) {
                    rowIndex--;
                    if (rowIndex < 0) {
                        rowIndex = this._selectedCellIndex[0]!;
                        break;
                    }

                    const nextCellElem = this.getCellElem(rowIndex, this._selectedCellIndex[1]!);
                    if (nextCellElem) {
                        break;
                    }
                }

                this._selectedCellIndex[0] = rowIndex;
                this.selectedRowChange.emit(rowIndex);
                this.redrawSelection();
            }
        }

        else if (event.key === "ArrowDown") {
            if (document.activeElement.tagName.toLowerCase() === "input") {
                return;
            }
            if (document.activeElement.tagName.toLowerCase() === "select") {
                return;
            }

            event.preventDefault();

            let rowIndex = this._selectedCellIndex[0]!;
            while (true) {
                rowIndex++;
                if (rowIndex >= thisElem.querySelectorAll(":scope > table > tbody").length) {
                    rowIndex = this._selectedCellIndex[0]!;
                    break;
                }

                const nextCellElem = this.getCellElem(rowIndex, this._selectedCellIndex[1]!);
                if (nextCellElem) {
                    break;
                }
            }

            this._selectedCellIndex[0] = rowIndex;
            this.selectedRowChange.emit(rowIndex);
            this.redrawSelection();
        }

        else if (event.key === "Tab") {
            event.preventDefault();

            if (!event.shiftKey) {
                const nextCellElem = this.getCellElem(this._selectedCellIndex[0]!, this._selectedCellIndex[1]! + 1);
                if (nextCellElem) {
                    this._selectedCellIndex[1]!++;

                    if (
                        document.activeElement.tagName.toLowerCase() !== "td" &&
                        !document.activeElement.tagName.toLowerCase().startsWith("sd-cell")
                    ) {
                        this.redrawSelection();
                        const nextCellControlElem = nextCellElem.querySelector(":scope input, :scope select, :scope button") as HTMLElement;
                        if (nextCellControlElem) nextCellControlElem.focus();
                    }
                    else {
                        this.redrawSelection();
                    }
                }
                else {
                    const nextCellElem = this.getCellElem(this._selectedCellIndex[0]! + 1, 0);
                    if (nextCellElem) {
                        this._selectedCellIndex[0]!++;
                        this.selectedRowChange.emit(this._selectedCellIndex[0]);

                        this._selectedCellIndex[1] = 0;

                        if (
                            document.activeElement.tagName.toLowerCase() !== "td" &&
                            !document.activeElement.tagName.toLowerCase().startsWith("sd-cell")
                        ) {
                            this.redrawSelection();
                            const nextCellControlElem = nextCellElem.querySelector(":scope input, :scope select, :scope button") as HTMLElement;
                            if (nextCellControlElem) nextCellControlElem.focus();
                        }
                        else {
                            this.redrawSelection();
                        }
                    }
                }
            }
            else {
                if (this._selectedCellIndex[1]! > 0) {
                    this._selectedCellIndex[1]!--;

                    const nextCellElem = this.getCellElem(this._selectedCellIndex[0]!, this._selectedCellIndex[1]!);
                    if (nextCellElem) {
                        if (
                            document.activeElement.tagName.toLowerCase() !== "td" &&
                            !document.activeElement.tagName.toLowerCase().startsWith("sd-cell")
                        ) {
                            this.redrawSelection();
                            const nextCellControlElem = nextCellElem.querySelector(":scope input, :scope select, :scope button") as HTMLElement;
                            if (nextCellControlElem) nextCellControlElem.focus();
                        }
                        else {
                            this.redrawSelection();
                        }
                    }
                }
                else if (this._selectedCellIndex[0]! > 0) {
                    this._selectedCellIndex[0]!--;
                    this.selectedRowChange.emit(this._selectedCellIndex[0]);

                    const nextCellElem = this.getCellElem(this._selectedCellIndex[0]!, 0);
                    if (nextCellElem) {
                        const selectedRowElem = thisElem.querySelectorAll(":scope > table > tbody")[this._selectedCellIndex[0]!] as HTMLElement;
                        if (selectedRowElem) {
                            this._selectedCellIndex[1] = selectedRowElem.querySelectorAll(":scope > tr > *:not(th)").length - 1;

                            if (
                                document.activeElement.tagName.toLowerCase() !== "td" &&
                                !document.activeElement.tagName.toLowerCase().startsWith("sd-cell")
                            ) {
                                this.redrawSelection();
                                const nextCellControlElem = nextCellElem.querySelector(":scope input, :scope select, :scope button") as HTMLElement;
                                if (nextCellControlElem) nextCellControlElem.focus();
                            }
                            else {
                                this.redrawSelection();
                            }
                        }
                    }
                }
            }
        }

        else if (event.key === "F2") {
            event.preventDefault();
            const selectedCellElem = this.getCellElem(this._selectedCellIndex[0]!, this._selectedCellIndex[1]!);
            if (selectedCellElem) {
                const selectedCellControlElem = selectedCellElem.querySelector(":scope input, :scope select, :scope button") as HTMLElement;
                if (selectedCellControlElem) selectedCellControlElem.focus();
            }
        }

        else if (event.key === "Escape") {
            event.preventDefault();
            const selectedCellElem = this.getCellElem(this._selectedCellIndex[0]!, this._selectedCellIndex[1]!);
            if (selectedCellElem) {
                selectedCellElem.focus();
            }
        }

        else if (event.key === "Enter") {
            event.preventDefault();

            const nextCellElem = this.getCellElem(this._selectedCellIndex[0]! + 1, this._selectedCellIndex[1]!);
            if (nextCellElem) {
                this._selectedCellIndex[0]!++;
                this.selectedRowChange.emit(this._selectedCellIndex[0]);

                if (
                    document.activeElement.tagName.toLowerCase() !== "td" &&
                    !document.activeElement.tagName.toLowerCase().startsWith("sd-cell")
                ) {
                    this.redrawSelection();
                    const nextCellControlElem = nextCellElem.querySelector(":scope input, :scope select, :scope button") as HTMLElement;
                    if (nextCellControlElem) nextCellControlElem.focus();
                }
                else {
                    this.redrawSelection();
                }
            }
        }

        else if (event.key === " ") {
            if (document.activeElement.tagName.toLowerCase() === "input") {
                return;
            }
            if (document.activeElement.tagName.toLowerCase() === "select") {
                return;
            }

            event.preventDefault();

            const selectedCellElem = this.getCellElem(this._selectedCellIndex[0]!, this._selectedCellIndex[1]!);
            if (selectedCellElem) {
                const inputElem = selectedCellElem.querySelector(":scope input, :scope select") as HTMLElement;
                if (inputElem) {
                    inputElem.focus();
                    return;
                }

                const buttonElem = selectedCellElem.querySelector(":scope button, :scope a, :scope sd-checkbox > label") as HTMLElement;
                if (buttonElem) {
                    buttonElem.click();
                    return;
                }
            }
        }
    }
}

@Component({
    selector: "sd-cell",
    template: `
        <ng-content></ng-content>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdCellControl {
}

@Component({
    selector: "sd-cell-text-field",
    template: `
        <sd-text-field [size]="'sm'"
                       [type]="type"
                       [value]="value"
                       (valueChange)="valueChange.emit($event)"
                       [disabled]="disabled"
                       [required]="required"
                       [step]="step"
                       [placeholder]="placeholder"
                       [maxLength]="maxLength"
                       [min]="min"
                       [max]="max">
            <ng-content></ng-content>
        </sd-text-field>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdCellTextFieldControl {
    @Input() type = "text";
    @Input() value: any;
    @Output() valueChange = new EventEmitter<any>();
    @Input() placeholder = "";
    @Input() disabled = false;
    @Input() required = false;
    @Input() maxLength: number | undefined = undefined;
    @Input() step = 1;
    @Input() min: number | undefined = undefined;
    @Input() max: number | undefined = undefined;
}

@Component({
    selector: "sd-cell-button",
    template: `
        <sd-button [size]="'sm'"
                   [theme]="theme"
                   [focusable]="focusable"
                   [disabled]="disabled"
                   [selected]="selected"
                   [style]="style"
                   [class]="class"
                   [type]="type"
                   [required]="required"
                   (click)="buttonClick.emit($event)"
                   [inline]="true"
                   (deselect)="deselect.emit()">
            <ng-content></ng-content>
        </sd-button>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdCellButtonControl {
    @Input() theme?: ThemeStrings;
    @Input() focusable = true;
    @Input() disabled = false;
    @Input() selected = false;
    @Input() style = "";
    @Input() class: string | undefined;
    @Input() type = "default";
    @Input() required = false;

    @Output("button.click") buttonClick = new EventEmitter<MouseEvent>();
    @Output() deselect = new EventEmitter<void>();
}

@Component({
    selector: "sd-cell-date-picker",
    template: `
        <sd-date-picker [size]="'sm'"
                        [type]="type"
                        [value]="value"
                        (valueChange)="valueChange.emit($event)"
                        [disabled]="disabled"
                        [required]="required"></sd-date-picker>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdCellDatePickerControl {
    @Input() type: "date" | "month" | "year" = "date";
    @Input() value: DateOnly | undefined;
    @Output() valueChange = new EventEmitter<DateOnly | undefined>();
    @Input() disabled = false;
    @Input() required = false;
}

@Component({
    selector: "sd-cell-select",
    template: `
        <sd-select [size]="'sm'"
                   [focusable]="focusable"
                   [inline]="inline"
                   [disabled]="disabled"
                   [required]="required"
                   [style]="style"
                   [value]="value"
                   [keyField]="keyField"
                   (valueChange)="valueChange.emit($event)">
            <ng-content></ng-content>
        </sd-select>`,
    host: {
        "[class._disabled]": "disabled"
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdCellSelectControl {
    @Input() focusable = true;
    @Input() inline = false;
    @Input() disabled = false;
    @Input() required = false;
    @Input() style = "";
    @Input() value: any;
    @Output() valueChange = new EventEmitter<any>();
    @Input() keyField: string | undefined;
}

@Component({
    selector: "sd-cell-checkbox",
    template: `
        <sd-checkbox [disabled]="disabled"
                     [value]="value"
                     (valueChange)="valueChange.emit($event)">
            <ng-content></ng-content>
        </sd-checkbox>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdCellCheckboxControl {
    @Input() value = false;
    @Output() valueChange: EventEmitter<boolean> = new EventEmitter<boolean>();
    @Input() disabled = false;
}

@Component({
    selector: "sd-column-selector",
    template: `
        <a (click)="openDropdown()">
            <sd-icon [icon]="'columns'" [fixedWidth]="true"></sd-icon>
        </a>
        <sd-dropdown #dropdown
                     [open]="isDropdownOpen">
            <sd-list>
                <sd-list-item *ngFor="let column of columnList">
                    <sd-checkbox [value]="value.includes(column)"
                                 (valueChange)="onCheckChange(column, $event)">
                        {{column}}
                    </sd-checkbox>
                </sd-list-item>
            </sd-list>
        </sd-dropdown>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdColumnSelectorControl implements AfterViewInit {
    @ViewChild("dropdown", {read: ElementRef}) dropdownElementRef?: ElementRef;

    @Input()
    set value(value: string[]) {
        this._value = Object.clone(value);
    }

    get value(): string[] {
        return this._value;
    }

    private _value: string[] = [];

    @Output() valueChange: EventEmitter<string[]> = new EventEmitter<string[]>();
    @Input() columnList: string[] = [];

    isDropdownOpen = false;

    constructor(private _cdr: ChangeDetectorRef,
                private _focus: SdFocusProvider) {
    }

    ngAfterViewInit(): void {
        const dropdownElem = this.dropdownElementRef!.nativeElement as HTMLElement;
        dropdownElem.addEventListener("blur", (e) => {
            if (!Array.from(dropdownElem.querySelectorAll(":scope *")).includes(e.relatedTarget as Element)) {
                this.isDropdownOpen = false;
                this._cdr.markForCheck();
            }
        }, true);
    }

    async openDropdown(): Promise<void> {
        this.isDropdownOpen = true;

        const dropdownElem = this.dropdownElementRef!.nativeElement as HTMLElement;
        await Wait.true(() => getComputedStyle(dropdownElem).display === "block");
        this._focus.next(dropdownElem);
    }

    onCheckChange(column: string, value: boolean): void {
        value ? this._value.push(column) : this._value.remove(column);
        this.valueChange.emit(this._value);
    }
}
