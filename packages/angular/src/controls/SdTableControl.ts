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
            const $this = $(this._elementRef.nativeElement);
            $this.on("scroll.sd-table", this.repositioning.bind(this));

            this.redraw();
            this.redrawSelection(false);

            SimgularHelpers.detectElementChange($this.get(0), () => {
                this.redraw();
                this.redrawSelection(false);
            }, {
                resize: false
            });

            const setSelectedCellIndexByEvent = (event: Event) => {
                const $target = $(event.target!);
                const $tableRows = $this.find("> table > tbody");
                const $selectedRow = $target.parents("tbody");
                const row = $tableRows.toArray().indexOf($selectedRow.get(0));

                const $selectedRowCellList = $selectedRow.find("> tr > *:not(th)");
                let $selectedCell = $target.parents("tr > *:not(th)");
                $selectedCell = $selectedCell.length > 0 ? $selectedCell : $target;

                const col = $selectedRowCellList.toArray().indexOf($selectedCell.get(0));

                if (row > -1 && col > -1) {
                    if (this._selectedCellIndex[0] !== row) {
                        this._zone.run(() => {
                            this.selectedRowChange.emit(row);
                        });
                    }
                    this._selectedCellIndex = [row, col];
                    this.redrawSelection(false);
                }
            };

            $this.get(0).addEventListener("mousedown", (event) => {
                setSelectedCellIndexByEvent(event);
            }, true);

            $this.get(0).addEventListener("focus", () => {
                this.refocusing();
            }, true);
        });
    }

    repositioning(): void {
        const $this = $(this._elementRef.nativeElement);
        $this.find("> table > thead > tr > *").css("marginTop", $this.scrollTop() || 0);
        $this.find("> table > * > tr > *._fixed").css("marginLeft", $this.scrollLeft() || 0);
    }

    refocusing(): void {
        const $this = $(this._elementRef.nativeElement);

        const $target = $(document.activeElement);
        if ($target.length < 1) return;

        const scrollLeft = $this.get(0).scrollLeft;
        const scrollTop = $this.get(0).scrollTop;

        const $fixedColumns = $this.find("*:first-child > *:first-child > *._fixed");
        const fixedWidth = $fixedColumns.toArray().sum(item => item.offsetWidth);
        const $fixedRows = $this.find("thead > * > *:first-child");
        const fixedHeight = $fixedRows.toArray().sum(item => item.offsetHeight);

        const $selectedCell = $target.parent().get(0).tagName === "TR" ? $target : $target.parents("tr > *:not(th)");
        if ($selectedCell.length < 1) return;

        const offsetLeft = $selectedCell.get(0).offsetLeft;
        const offsetTop = $selectedCell.get(0).offsetTop;

        if (scrollLeft > offsetLeft - fixedWidth) {
            $this.get(0).scrollLeft = offsetLeft - fixedWidth;
        }
        if (scrollTop > offsetTop - fixedHeight) {
            $this.get(0).scrollTop = offsetTop - fixedHeight;
        }

        if (scrollLeft + $this.outerWidth()! < offsetLeft + $selectedCell.outerWidth()!) {
            const scrollbarWidth = $this.get(0).offsetWidth - $this.get(0).clientWidth;
            $this.get(0).scrollLeft = offsetLeft + $selectedCell.outerWidth()! - $this.outerWidth()! + scrollbarWidth;
        }
        if (scrollTop + $this.outerHeight()! < offsetTop + $selectedCell.outerHeight()!) {
            const scrollbarHeight = $this.get(0).offsetHeight - $this.get(0).clientHeight;
            $this.get(0).scrollTop = offsetTop + $selectedCell.outerHeight()! - $this.outerHeight()! + scrollbarHeight;
        }
    }

    redraw(): void {
        const $this = $(this._elementRef.nativeElement);
        const $table = $this.find("> table");
        const $cells = $this.find("> table > * > tr > *");

        //-- 초기화
        $this.css("width", "1000000px");

        $table.css({
            display: "",
            width: "",
            height: ""
        });

        $cells.css({
            position: "",
            display: "",
            top: "",
            left: "",
            width: "",
            height: "",
            "border-right": "",
            "border-bottom-color": ""
        });
        $cells.removeClass("_fixed");
        $cells.filter("*:not(th,sd-column-selector)").attr("tabindex", this.sheet ? "0" : "");

        //-- fixed 셀 설정
        if (this.fixedColumns) {
            const cellMap = this._getCellMap();
            for (const row of cellMap) {
                for (let colIndex = 0; colIndex < row.length; colIndex++) {
                    const $cell = row[colIndex];
                    if (colIndex < this.fixedColumns) {
                        $cell.addClass("_fixed");
                    }
                }
            }
        }

        //-- 테이블 크기 가져오기
        const tableStat = {
            width: $table.width() || 0,
            height: $table.height() || 0
        };

        //-- 각 셀 위치/크기 가져오기
        const cellStats = $cells.toArray()
            .map((cell, index) => {
                const result = {
                    $cell: $(cell),
                    top: $(cell).get(0).offsetTop,
                    left: $(cell).get(0).offsetLeft,
                    width: $(cell).outerWidth()!/* + 1*/,
                    height: $(cell).outerHeight()! + 1
                };

                result["z-index"] = $cells.length - index;
                if (/*$(cell).is("._fixed") &&*/ $(cell).parent().children("._fixed").last().get(0) === cell) {
                    result["border-right"] = "1px solid #9E9E9E";
                    result["z-index"] = $cells.length + index;
                }
                if ($(cell).closest("thead,tbody").get(0).tagName.toLowerCase() === "thead") {
                    result["border-bottom-color"] = "#9E9E9E";
                    result["z-index"] = ($cells.length * 2) + index;

                    if ($(cell).is("._fixed")) {
                        result["z-index"] = ($cells.length * 3) + index;
                    }
                }

                return result;
            });

        //-- 테이블 크기 지정
        $table.css({
            display: "block",
            width: tableStat.width,
            height: tableStat.height
        });

        //-- 각 셀 위치/크기 지정
        for (const stat of cellStats) {
            stat.$cell.css({
                position: "absolute",
                display: "block",
                "z-index": stat["z-index"],
                top: stat.top,
                left: stat.left,
                width: stat.width,
                height: stat.height,
                "border-right": stat["border-right"],
                "border-bottom-color": stat["border-bottom-color"]
            });
        }

        this.repositioning();

        $this.css("width", "");

        this.refocusing();
    }

    redrawSelection(focusing: boolean = true): void {
        if (!this.sheet) return;

        const $this = $(this._elementRef.nativeElement);
        $this.find("> table > tbody").removeClass("sd-background-primary-state");

        if (this._selectedCellIndex[0] === undefined || this._selectedCellIndex[1] === undefined) {
            $this.find("*").trigger("blur");
            return;
        }

        const $selectedRow = $this.find("> table > tbody").eq(this._selectedCellIndex[0]!);
        if ($selectedRow.length < 1) {
            this._zone.run(() => {
                this._selectedCellIndex = [undefined, undefined];
                this.selectedRowChange.emit(undefined);
            });
            return;
        }

        const $selectedCell = $selectedRow.find("> tr > *:not(th)").eq(this._selectedCellIndex[1]!);
        if (this.selectable) {
            $selectedRow.addClass("sd-background-primary-state");
        }

        if (focusing) {
            $selectedCell.trigger("focus");
        }
    }

    private _getCellMap(): JQuery[][] {
        const $this = $(this._elementRef.nativeElement);

        const result: JQuery[][] = [];
        $this.find("> table > * > tr").each((rowIndex, row) => {
            if (!result[rowIndex]) {
                result[rowIndex] = [];
            }

            let colIndex = 0;
            $(row).children("*").each((i, cell) => {
                while (result[rowIndex][colIndex]) {
                    colIndex++;
                }
                const rowspan = Number($(cell).attr("rowspan")) || 1;
                const colspan = Number($(cell).attr("colspan")) || 1;
                for (let r = 0; r < rowspan; r++) {
                    for (let c = 0; c < colspan; c++) {
                        if (!result[rowIndex + r]) {
                            result[rowIndex + r] = [];
                        }
                        result[rowIndex + r][colIndex + c] = $(cell);
                    }
                }
            });
        });

        return result;
    }

    onKeydown(event: KeyboardEvent): void {
        const $this = $(this._elementRef.nativeElement);

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

            const $selectedRow = $this.find("> table > tbody").eq(this._selectedCellIndex[0]!);
            const nextCellElement = $selectedRow.find("> tr > *:not(th)").get(this._selectedCellIndex[1]! + 1);
            if (nextCellElement) {
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

                    const $selectedRow = $this.find("> table > tbody").eq(rowIndex);
                    const nextCellElement = $selectedRow.find("> tr > *:not(th)").get(this._selectedCellIndex[1]!);
                    if (nextCellElement) {
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
                if (rowIndex >= $this.find("> table > tbody").length) {
                    rowIndex = this._selectedCellIndex[0]!;
                    break;
                }

                const $selectedRow = $this.find("> table > tbody").eq(rowIndex);
                const nextCellElement = $selectedRow.find("> tr > *:not(th)").get(this._selectedCellIndex[1]!);
                if (nextCellElement) {
                    break;
                }
            }

            this._selectedCellIndex[0] = rowIndex;
            this.selectedRowChange.emit(rowIndex);
            this.redrawSelection();
        }

        else if (event.key === "Tab") {
            event.preventDefault();

            const $selectedRow = $this.find("> table > tbody").eq(this._selectedCellIndex[0]!);

            if (!event.shiftKey) {
                let nextCellElement = $selectedRow.find("> tr > *:not(th)").get(this._selectedCellIndex[1]! + 1);
                if (nextCellElement) {
                    this._selectedCellIndex[1]!++;

                    if (
                        document.activeElement.tagName.toLowerCase() !== "td" &&
                        !document.activeElement.tagName.toLowerCase().startsWith("sd-cell")
                    ) {
                        this.redrawSelection();
                        $(nextCellElement).find("input, select, button").trigger("focus");
                    }
                    else {
                        this.redrawSelection();
                    }
                }
                else {
                    nextCellElement = $selectedRow.next().find("> tr > *:not(th)").get(0);
                    if (nextCellElement) {
                        this._selectedCellIndex[0]!++;
                        this.selectedRowChange.emit(this._selectedCellIndex[0]);

                        this._selectedCellIndex[1] = 0;

                        if (
                            document.activeElement.tagName.toLowerCase() !== "td" &&
                            !document.activeElement.tagName.toLowerCase().startsWith("sd-cell")
                        ) {
                            this.redrawSelection();
                            $(nextCellElement).find("input, select, button").trigger("focus");
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

                    const nextCellElement = $selectedRow.find("> tr > *:not(th)").get(this._selectedCellIndex[1]!);
                    if (
                        document.activeElement.tagName.toLowerCase() !== "td" &&
                        !document.activeElement.tagName.toLowerCase().startsWith("sd-cell")
                    ) {
                        this.redrawSelection();
                        $(nextCellElement).find("input, select, button").trigger("focus");
                    }
                    else {
                        this.redrawSelection();
                    }
                }
                else if (this._selectedCellIndex[0]! > 0) {
                    this._selectedCellIndex[0]!--;
                    this.selectedRowChange.emit(this._selectedCellIndex[0]);

                    this._selectedCellIndex[1] = $selectedRow.find("> tr > *:not(th)").length - 1;

                    const nextCellElement = $selectedRow.prev().find("> tr > *:not(th)").get(0);
                    if (
                        document.activeElement.tagName.toLowerCase() !== "td" &&
                        !document.activeElement.tagName.toLowerCase().startsWith("sd-cell")
                    ) {
                        this.redrawSelection();
                        $(nextCellElement).find("input, select, button").trigger("focus");
                    }
                    else {
                        this.redrawSelection();
                    }
                }
            }
        }

        else if (event.key === "F2") {
            event.preventDefault();
            const $selectedRow = $this.find("> table > tbody").eq(this._selectedCellIndex[0]!);
            const $selectedCell = $selectedRow.find("> tr > *:not(th)").eq(this._selectedCellIndex[1]!);
            $selectedCell.find("input, select, button").eq(0).trigger("focus");
        }

        else if (event.key === "Escape") {
            event.preventDefault();
            this.redrawSelection();
        }

        else if (event.key === "Enter") {
            event.preventDefault();

            const $selectedRow = $this.find("> table > tbody").eq(this._selectedCellIndex[0]!);
            const nextCellElement = $selectedRow.next().find("> tr > *:not(th)").get(this._selectedCellIndex[1]!);
            if (nextCellElement) {
                this._selectedCellIndex[0]!++;
                this.selectedRowChange.emit(this._selectedCellIndex[0]);

                if (
                    document.activeElement.tagName.toLowerCase() !== "td" &&
                    !document.activeElement.tagName.toLowerCase().startsWith("sd-cell")
                ) {
                    this.redrawSelection();
                    $(nextCellElement).find("input, select, button").trigger("focus");
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

            const $selectedRow = $this.find("> table > tbody").eq(this._selectedCellIndex[0]!);
            const $selectedCell = $selectedRow.find("> tr > *:not(th)").eq(this._selectedCellIndex[1]!);

            if ($selectedCell.has("sd-text-field").length) {
                $selectedCell.find("sd-text-field > input").eq(0).trigger("focus");
                return;
            }

            if ($selectedCell.has("button").length) {
                $selectedCell.find("button").eq(0).trigger("click");
                return;
            }

            if ($selectedCell.has("a").length) {
                $selectedCell.find("a").get(0).click();
                return;
            }

            if ($selectedCell.has("sd-checkbox").length) {
                $selectedCell.find("sd-checkbox > label").eq(0).trigger("click");
                return;
            }

            if ($selectedCell.has("select").length) {
                $selectedCell.find("select").eq(0).trigger("focus");
                return;
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
    @Input() theme = "default";
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
            <i class="fas fa-fw fa-columns"></i>
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

    constructor(private _focus: SdFocusProvider,
                private _cdr: ChangeDetectorRef) {
    }

    ngAfterViewInit(): void {
        const $dropdown = $(this.dropdownElementRef!.nativeElement);
        $dropdown.get(0).addEventListener("blur", (e) => {
            if ($dropdown.has(e.relatedTarget as any).length < 1) {
                this.isDropdownOpen = false;
                this._cdr.markForCheck();
            }
        }, true);
    }

    async openDropdown(): Promise<void> {
        this.isDropdownOpen = true;
        const $dropdown = $(this.dropdownElementRef!.nativeElement);
        await Wait.true(() => $dropdown.css("display") === "block");
        this._focus.next($dropdown);
    }

    onCheckChange(column: string, value: boolean): void {
        value ? this._value.push(column) : this._value.remove(column);
        this.valueChange.emit(this._value);
    }
}
