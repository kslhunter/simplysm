import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  DoCheck,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  IterableDiffer,
  IterableDiffers,
  OnInit,
  Output,
  QueryList
} from "@angular/core";
import {SdSheetColumnControl} from "./sd-sheet-column.control";
import {SdTypeValidate} from "../decorators/SdTypeValidate";
import {animate, state, style, transition, trigger} from "@angular/animations";
import {SdLocalStorageProvider} from "../providers/SdLocalStorageProvider";

@Component({
  selector: "sd-sheet",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="_content _head" [style.top.px]="headTop">
      <div class="_row" *ngIf="hasHeaderGroup">
        <div class="_col-group _fixed-col-group" [style.left.px]="fixedLeft">
          <div class="_col _first-col">
            <div class="_border"></div>
          </div>
          <div class="_col" *ngFor="let headerGroup of fixedHeaderGroups; trackBy: trackByIndexFn"
               [style.width.px]="headerGroup.width">
            {{ headerGroup.header }}
            <div class="_border"></div>
          </div>
        </div>
        <div class="_col-group" [style.padding-left.px]="fixedColumnWidth">
          <div class="_col" *ngFor="let headerGroup of nonFixedHeaderGroups; trackBy: trackByIndexFn"
               [style.width.px]="headerGroup.width">
            {{ headerGroup.header }}
            <div class="_border"></div>
          </div>
        </div>
      </div>
      <div class="_row">
        <div class="_col-group _fixed-col-group" [style.left.px]="fixedLeft">
          <div class="_col _first-col">
            <div class="_border"></div>
          </div>
          <div class="_col" *ngFor="let columnControl of fixedColumnControls; trackBy: trackByColumnControlFn"
               [style.width.px]="getWidth(columnControl)"
               [attr.col-index]="getIndex(columnControl)"
               [attr.title]="columnControl.help">
            {{ columnControl.header && columnControl.header.split(".").last() }}
            <div class="_border" [style.cursor]="id ? 'ew-resize' : undefined"
                 (mousedown)="onHeadBorderMousedown($event)"></div>
          </div>
        </div>
        <div class="_col-group" [style.padding-left.px]="fixedColumnWidth">
          <div class="_col" *ngFor="let columnControl of nonFixedColumnControls; trackBy: trackByColumnControlFn"
               [style.width.px]="getWidth(columnControl)"
               [attr.col-index]="getIndex(columnControl)"
               [attr.title]="columnControl.help">
            {{ columnControl.header && columnControl.header.split(".").last() }}
            <div class="_border" [style.cursor]="id ? 'ew-resize' : undefined"
                 (mousedown)="onHeadBorderMousedown($event)"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="_content _body">
      <div class="_row" *ngFor="let item of items; trackBy: trackByItemFn" [@rowState]="'in'">
        <div class="_col-group _fixed-col-group" [style.left.px]="fixedLeft">
          <div class="_col _first-col" (click)="onFirstColClick($event)">
            <sd-icon [icon]="'arrow-right'" *ngIf="selectable"
                     [ngClass]="{'sd-text-color-primary-default': selectedItem === item, 'sd-text-color-bluegrey-darker': selectedItem !== item}"></sd-icon>
          </div>
          <div class="_col" *ngFor="let columnControl of fixedColumnControls; trackBy: trackByColumnControlFn"
               [style.width.px]="getWidth(columnControl)" tabindex="0"
               (keydown)="onCellKeydown($event)"
               (focus)="onCellFocus($event)">
            <ng-template [ngTemplateOutlet]="columnControl.itemTemplateRef"
                         [ngTemplateOutletContext]="{item: item}"></ng-template>
          </div>
        </div>
        <div class="_col-group" [style.padding-left.px]="fixedColumnWidth">
          <div class="_col" *ngFor="let columnControl of nonFixedColumnControls; trackBy: trackByColumnControlFn"
               [style.width.px]="getWidth(columnControl)" tabindex="0"
               (keydown)="onCellKeydown($event)"
               (focus)="onCellFocus($event)">
            <ng-template [ngTemplateOutlet]="columnControl.itemTemplateRef"
                         [ngTemplateOutletContext]="{item: item}"></ng-template>
          </div>
        </div>
      </div>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;
      position: relative;
      width: 100%;
      max-height: 100%;
      overflow: auto;
      background: black;

      ._content {
        white-space: nowrap;
        width: fit-content;
      }

      ._head {
        display: block;
        position: absolute;
        z-index: 2;
        top: 0;
        left: 0;
        white-space: nowrap;
      }

      ._col-group {
        display: inline-block;
      }

      ._col {
        position: relative;
        display: inline-block;
        vertical-align: top;
        height: 24px;

        &:focus {
          outline: none;
        }
      }

      ._head ._col {
        background: theme-color(bluegrey, darkest);
        text-align: center;
        padding: gap(xs) gap(sm);
        border-top: 1px solid get($trans-color, default);
        border-bottom: 1px solid get($trans-color, dark);
        user-select: none;

        > ._border {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          width: 4px;
          border-right: 1px solid theme-color(bluegrey, darker);
        }
      }

      ._body ._col {
        background: black;
        border-right: 1px solid theme-color(bluegrey, darker);
        border-bottom: 1px solid theme-color(bluegrey, darker);

        /deep/ sd-textfield > input {
          border: none;
          padding: gap(xs) gap(sm);

          &[type=year],
          &[type=month],
          &[type=date],
          &[type=datetime],
          &[type=datetime-local] {
            padding: gap(xs) - 2 gap(sm) gap(xs) - 1 gap(sm);
          }
        }

        /deep/ sd-combobox {
          > ._icon {
            top: 0;
            right: 0;
            width: 24px;
            padding: gap(xs) 0;
          }

          > sd-textfield > input {
            padding-right: 24px;
          }
        }

        /deep/ sd-select > select {
          border: none;
          padding: gap(xs) - 3 gap(sm) gap(xs) gap(sm) - 4;
        }

        /deep/ sd-checkbox > label {
          display: inline-block;
          width: auto;
          border: none;
          padding: gap(xs) gap(sm);
        }

        /deep/ sd-button > button {
          border: none;
          padding: gap(xs) gap(sm);
        }
      }

      ._head ._col._first-col,
      ._body ._col._first-col {
        width: 24px;
        text-align: center;
        padding: gap(xs);
      }

      ._body ._col._first-col {
        background: theme-color(bluegrey, darkest);
      }

      ._fixed-col-group {
        position: absolute;
        z-index: 1;
        top: 0;
        left: 0;
      }

      ._row {
        position: relative;
      }

      &[sd-selectable=true] ._body ._first-col {
        cursor: pointer;
      }

      /deep/ > ._cell-indicator {
        position: fixed;
        top: 0;
        left: 0;
        border: 2px solid theme-color(primary, default);
        opacity: 0;
        z-index: 3;
        pointer-events: none;
        transition: opacity .1s linear;
      }
    }
  `],
  animations: [
    trigger("rowState", [
      state("void", style({height: "0"})),
      state("*", style({height: "*"})),
      transition("void <=> *", animate(".1s ease-out"))
    ])
  ]
})
export class SdSheetControl implements DoCheck, OnInit {
  @ContentChildren(SdSheetColumnControl)
  public columnControls?: QueryList<SdSheetColumnControl>;

  @Input()
  @SdTypeValidate(Array)
  public items?: any[];

  @Input()
  @SdTypeValidate(Function)
  public trackBy?: (index: number, item: any) => any;

  public headTop = 0;
  public fixedLeft = 0;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-selectable")
  public selectable?: boolean;

  @Input()
  public selectedItem: any;

  @Output()
  public readonly selectedItemChange = new EventEmitter<any>();

  @Input()
  @SdTypeValidate(String)
  public id?: string;

  @HostBinding("style.padding-top")
  public get paddingTop(): string {
    return this.hasHeaderGroup ? "48px" : "24px";
  }

  public get hasHeaderGroup(): boolean {
    return this.columnControls ? this.columnControls.some(item => !!item.header && item.header.includes(".")) : false;
  }

  public get fixedHeaderGroups(): { header?: string; width: number }[] {
    const result: { header?: string; width: number }[] = [];
    for (const item of this.fixedColumnControls) {
      const header = (item.header && item.header.split(".").length === 2) ? item.header.split(".")[0] : undefined;
      if (result.last() && result.last()!.header === header) {
        result.last()!.width += this.getWidth(item);
      }
      else {
        result.push({
          header,
          width: this.getWidth(item)
        });
      }
    }

    return result;
  }

  public get nonFixedHeaderGroups(): { header?: string; width: number }[] {
    const result: { header?: string; width: number }[] = [];
    for (const item of this.nonFixedColumnControls) {
      const header = (item.header && item.header.split(".").length === 2) ? item.header.split(".")[0] : undefined;
      if (result.last() && result.last()!.header === header) {
        result.last()!.width += this.getWidth(item);
      }
      else {
        result.push({
          header,
          width: this.getWidth(item)
        });
      }
    }

    return result;
  }

  public get fixedColumnControls(): SdSheetColumnControl[] {
    return this.columnControls ? this.columnControls.filter(item => !!item.fixed) : [];
  }

  public get nonFixedColumnControls(): SdSheetColumnControl[] {
    return this.columnControls ? this.columnControls.filter(item => !item.fixed) : [];
  }

  public get fixedColumnWidth(): number {
    if (this.fixedColumnControls.length > 0) {
      return this.fixedColumnControls.map(item => item.width).reduce((a, b) => a + b) + 24;
    }
    else {
      return 24;
    }
  }

  public trackByColumnControlFn(index: number, item: SdSheetColumnControl): any {
    return item.guid;
  }

  public trackByItemFn(index: number, item: any): any {
    if (this.trackBy) {
      return this.trackBy(index, item);
    }
    else {
      return item;
    }
  }

  public trackByIndexFn(index: number): any {
    return index;
  }

  private readonly _iterableDiffer: IterableDiffer<any>;
  private _columnConfigs: {
    header?: string;
    index: number;
    width: number;
  }[] = [];

  public constructor(private readonly _iterableDiffers: IterableDiffers,
                     private readonly _cdr: ChangeDetectorRef,
                     private readonly _elRef: ElementRef<HTMLElement>,
                     private readonly _localStorage: SdLocalStorageProvider) {
    this._iterableDiffer = this._iterableDiffers.find([]).create(this.trackByItemFn);

    this._elRef.nativeElement.addEventListener(
      "focus",
      (event: Event) => {
        this.selectRow(event.target as HTMLElement);
      },
      true
    );
  }

  public ngOnInit(): void {
    this._loadColumnConfigs();
  }

  public ngDoCheck(): void {
    if (this.items && this._iterableDiffer.diff(this.items)) {
      this._cdr.markForCheck();
    }
  }

  public getIndex(columnControl: SdSheetColumnControl): number {
    return this.columnControls!.toArray().indexOf(columnControl);
  }

  public getWidth(columnControl: SdSheetColumnControl): number {
    const index = this.getIndex(columnControl);
    const columnConfig = this._columnConfigs.single(item => item.header === columnControl.header && item.index === index);
    return columnConfig ? columnConfig.width : columnControl.width;
  }

  public selectRow(targetEl: Element): void {
    if (!this.selectable) return;

    const rowEl = targetEl.findParent("._row");
    if (rowEl) {
      const bodyEl = rowEl.parentElement as Element;
      const rowIndex = Array.from(bodyEl.children).indexOf(rowEl);
      const selectedItem = this.items![rowIndex];
      if (this.selectedItem !== selectedItem) {
        this.selectedItem = this.items![rowIndex];
        this.selectedItemChange.emit(this.selectedItem);
      }
    }
  }

  public onFirstColClick(event: Event): void {
    if (!this.selectable) return;

    const targetEl = event.target as Element;
    const rowEl = targetEl.findParent("._row");
    if (!rowEl) return;

    const bodyEl = rowEl.parentElement as Element;
    const rowIndex = Array.from(bodyEl.children).indexOf(rowEl);

    if (this.items!.indexOf(this.selectedItem) === rowIndex) {
      if (this.selectedItem !== undefined) {
        this.selectedItem = undefined;
        this.selectedItemChange.emit(undefined);
      }
    }
    else {
      this.selectRow(event.target as Element);
    }
  }

  @HostListener("scroll", ["$event"])
  public onScroll(event: Event): void {
    const el = event.target as Element;
    this.headTop = el.scrollTop;
    this.fixedLeft = el.scrollLeft;

    if (document.activeElement.classList.contains("_col")) {
      const cellEl = document.activeElement as HTMLDivElement;
      const indicatorEl = this._elRef.nativeElement.findAll("._cell-indicator")[0] as (HTMLDivElement | undefined);

      if (indicatorEl) {
        Object.assign(
          indicatorEl.style,
          {
            top: (cellEl.windowOffset.top - 2) + "px",
            left: (cellEl.windowOffset.left - 2) + "px",
            width: (cellEl.offsetWidth + 4 - 1) + "px",
            height: (cellEl.offsetHeight + 4 - 1) + "px"
          }
        );
      }
    }
  }

  public onCellFocus(event: FocusEvent): void {
    const indicator = document.createElement("div");
    indicator.classList.add("_cell-indicator");

    const cell = event.target as HTMLDivElement;
    Object.assign(
      indicator.style,
      {
        top: (cell.windowOffset.top - 2) + "px",
        left: (cell.windowOffset.left - 2) + "px",
        width: (cell.offsetWidth + 4 - 1) + "px",
        height: (cell.offsetHeight + 4 - 1) + "px"
      }
    );

    this._elRef.nativeElement.appendChild(indicator);

    // force a repaint
    indicator.offsetWidth; //tslint:disable-line:no-unused-expression

    indicator.style.opacity = "1";

    const blurFn = () => {
      cell.removeEventListener("blur", blurFn);
      indicator.style.opacity = "0";
      indicator.addEventListener("transitionend", () => {
        indicator.remove();
      });
    };
    cell.addEventListener("blur", blurFn);
  }

  public onHeadBorderMousedown(event: MouseEvent): void {
    if (!this.id) return;

    const cellEl = (event.target as HTMLElement).findParent("._col") as HTMLElement;
    const startX = event.clientX;
    const startWidth = cellEl.clientWidth;

    const doDrag = (e: MouseEvent) => {
      cellEl.style.width = `${startWidth + e.clientX - startX}px`;
    };

    const stopDrag = () => {
      document.documentElement.removeEventListener("mousemove", doDrag, false);
      document.documentElement.removeEventListener("mouseup", stopDrag, false);

      const index = Number(cellEl.getAttribute("col-index"));
      const columnControl = this.columnControls!.toArray()[index];

      const columnConfig = this._columnConfigs.single(item => item.header === columnControl.header && item.index === index);
      if (columnConfig) {
        columnConfig.width = cellEl.offsetWidth;
      }
      else {
        this._columnConfigs.push({
          header: columnControl.header,
          width: cellEl.offsetWidth,
          index
        });
      }
      this._saveColumnConfigs();

      this._cdr.markForCheck();
    };
    document.documentElement.addEventListener("mousemove", doDrag, false);
    document.documentElement.addEventListener("mouseup", stopDrag, false);
  }

  public onCellKeydown(event: KeyboardEvent): void {
    const targetEl = event.target as HTMLElement;
    if (targetEl.classList.contains("_col")) {
      if (event.key === "F2") {
        const focusableEls = targetEl.findFocusableAll();
        if (focusableEls.length > 0) {
          focusableEls[0].focus();
          event.preventDefault();
        }
      }
      else if (event.key === "ArrowDown") {
        const rowEl = targetEl.findParent("._row") as HTMLElement;
        const bodyEl = rowEl.parentElement as Element;

        const rowIndex = Array.from(bodyEl.children).indexOf(rowEl);
        const cellIndex = Array.from(rowEl.findAll("._col")).indexOf(targetEl);

        const nextRowEl = bodyEl.children.item(rowIndex + 1);
        if (nextRowEl) {
          (nextRowEl.findAll("._col")[cellIndex] as HTMLElement).focus();
          event.preventDefault();
        }
      }
      else if (event.key === "ArrowUp") {
        const rowEl = targetEl.findParent("._row") as HTMLElement;
        const bodyEl = rowEl.parentElement as Element;

        const rowIndex = Array.from(bodyEl.children).indexOf(rowEl);
        const cellIndex = Array.from(rowEl.findAll("._col")).indexOf(targetEl);

        if (rowIndex - 1 >= 0) {
          const nextRowEl = bodyEl.children.item(rowIndex - 1);
          (nextRowEl.findAll("._col")[cellIndex] as HTMLElement).focus();
          event.preventDefault();
        }
      }
      else if (event.key === "ArrowRight") {
        const rowEl = targetEl.findParent("._row") as HTMLElement;
        const cellIndex = Array.from(rowEl.findAll("._col")).indexOf(targetEl);

        const nextCell = rowEl.findAll("._col")[cellIndex + 1] as HTMLElement;
        if (nextCell) {
          nextCell.focus();
          event.preventDefault();
        }
      }
      else if (event.key === "ArrowLeft") {
        const rowEl = targetEl.findParent("._row") as HTMLElement;
        const cellIndex = Array.from(rowEl.findAll("._col")).indexOf(targetEl);

        if (cellIndex - 1 >= 0) {
          const nextCell = rowEl.findAll("._col")[cellIndex - 1] as HTMLElement;
          nextCell.focus();
          event.preventDefault();
        }
      }
    }
    else {
      if (event.key === "Escape") {
        const cellEl = (event.target as HTMLElement).findParent("._col") as HTMLElement;
        cellEl.focus();
        event.preventDefault();
      }
      if (event.key === "Enter") {
        const cellEl = targetEl.findParent("._col") as HTMLElement;
        const rowEl = cellEl.findParent("._row") as HTMLElement;
        const bodyEl = rowEl.parentElement as Element;

        const rowIndex = Array.from(bodyEl.children).indexOf(rowEl);
        const cellIndex = Array.from(rowEl.findAll("._col")).indexOf(cellEl);

        const nextRowEl = bodyEl.children.item(rowIndex + 1);
        if (nextRowEl) {
          const nextRowCellEl = nextRowEl.findAll("._col")[cellIndex] as HTMLElement;
          nextRowCellEl.focus();

          /*const focusableEls = nextRowCellEl.findFocusableAll();
          if (focusableEls.length > 0) {
            focusableEls[0].focus();
          }
          else {
            nextRowCellEl.focus();
          }*/

          event.preventDefault();
        }
      }
    }
  }

  public _loadColumnConfigs(): void {
    this._columnConfigs = this._localStorage.get("sd-sheet." + this.id + ".column-config") || [];
  }

  public _saveColumnConfigs(): void {
    const removedColumns = this._columnConfigs.filter(item => !this.columnControls!
      .some((item1, index) => (item1.header || "") + index === ((item.header || "") + item.index))
    );
    this._columnConfigs.remove(removedColumns);
    this._localStorage.set("sd-sheet." + this.id + ".column-config", this._columnConfigs);
  }
}