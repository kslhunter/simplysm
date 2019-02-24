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
import {SdSheetColumnControl} from "./SdSheetColumnControl";
import {SdTypeValidate} from "../commons/SdTypeValidate";
import {SdLocalStorageProvider} from "../providers/SdLocalStorageProvider";

@Component({
  selector: "sd-sheet",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="_sheet" [style.padding-top]="paddingTop">
      <div #headerElRef class="_content _head" [style.top.px]="headTop">
        <div class="_row _pagination" *ngIf="pageLength > 1">
          <sd-pagination [(page)]="page" [length]="pageLength"
                         (pageChange)="pageChange.emit($event)"></sd-pagination>
        </div>
        <div class="_row" *ngIf="hasHeaderGroup">
          <div class="_col-group _fixed-col-group" [style.left.px]="fixedLeft">
            <div class="_col _first-col" [class._double]="selectable && children">
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
            <div class="_col _first-col" [class._double]="selectable && children">
              <div class="_border"></div>
            </div>
            <div class="_col" *ngFor="let columnControl of fixedColumnControls; trackBy: trackByColumnControlFn"
                 [style.width.px]="getWidth(columnControl)"
                 [attr.col-index]="getIndex(columnControl)"
                 [attr.title]="columnControl.help"
                 [attr.sd-header]="columnControl.header">
              {{ columnControl.header && columnControl.header.split(".").last() }}
              <div class="_border" [style.cursor]="id ? 'ew-resize' : undefined"
                   (mousedown)="onHeadBorderMousedown($event)"></div>
            </div>
          </div>
          <div class="_col-group" [style.padding-left.px]="fixedColumnWidth">
            <div class="_col" *ngFor="let columnControl of nonFixedColumnControls; trackBy: trackByColumnControlFn"
                 [style.width.px]="getWidth(columnControl)"
                 [attr.col-index]="getIndex(columnControl)"
                 [attr.title]="columnControl.help"
                 [attr.sd-header]="columnControl.header">
              {{ columnControl.header && columnControl.header.split(".").last() }}
              <div class="_border" [style.cursor]="id ? 'ew-resize' : undefined"
                   (mousedown)="onHeadBorderMousedown($event)"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="_content _body" [style.width.px]="headerElRef.offsetWidth">
        <ng-template #rowOfList let-items="items">
          <ng-container *ngFor="let item of items; let i = index; trackBy: trackByItemFn">
            <div class="_row"> <!-- [@rowState]="'in'" -->
              <div class="_col-group _fixed-col-group" [style.left.px]="fixedLeft">
                <div class="_col _first-col"
                     [class._double]="selectable && children"
                     [class._selectable]="selectable"
                     [class._selected]="((selectable === true || selectable === 'manual') && selectedItem === item) || (selectable === 'multi' && selectedItems.includes(item))"
                     [class._expandable]="getHasChildren(i, item)"
                     [class._expanded]="getIsExpended(i, item)">
                  <a class="_expand-icon" *ngIf="!!children" (click)="onExpandIconClick($event, i, item)"
                     [style.visibility]="getHasChildren(i, item) ? undefined : 'hidden'">
                    <sd-icon [icon]="getHasChildren(i, item) ? 'caret-right' : undefined"
                             [fw]="true"></sd-icon>
                  </a>
                  <a class="_select-icon" (click)="onSelectIconClick($event, i, item)" *ngIf="selectable">
                    <sd-icon icon="arrow-right"
                             *ngIf="(!itemSelectableFn || itemSelectableFn(i, item)) && (selectable === true || selectable === 'manual')"
                             [fw]="true"></sd-icon>
                    <sd-icon icon="arrow-right"
                             *ngIf="(!itemSelectableFn || itemSelectableFn(i, item)) && (selectable === 'multi')"
                             [fw]="true"></sd-icon>
                  </a>
                </div>
                <div
                  [class]="'_col' + (itemThemeFn && itemThemeFn(item) ? ' sd-background-' + itemThemeFn(item) + '-lightest' : '')"
                  *ngFor="let columnControl of fixedColumnControls; trackBy: trackByColumnControlFn"
                  [style.width.px]="getWidth(columnControl)" tabindex="0"
                  (keydown)="onCellKeydown($event)">
                  <ng-template [ngTemplateOutlet]="columnControl.cellTemplateRef"
                               [ngTemplateOutletContext]="{item: item}"></ng-template>
                  <div class="_focus-indicator"></div>
                </div>
              </div>
              <div class="_col-group" [style.padding-left.px]="fixedColumnWidth">
                <div
                  [class]="'_col' + (itemThemeFn && itemThemeFn(item) ? ' sd-background-' + itemThemeFn(item) + '-lightest' : '')"
                  *ngFor="let columnControl of nonFixedColumnControls; trackBy: trackByColumnControlFn"
                  [style.width.px]="getWidth(columnControl)" tabindex="0"
                  (keydown)="onCellKeydown($event)">
                  <ng-template [ngTemplateOutlet]="columnControl.cellTemplateRef"
                               [ngTemplateOutletContext]="{item: item, index: i}"></ng-template>
                  <div class="_focus-indicator"></div>
                </div>
              </div>
            </div>
            <ng-container *ngIf="getHasChildren(i, item) && getIsExpended(i, item)">
              <ng-template [ngTemplateOutlet]="rowOfList"
                           [ngTemplateOutletContext]="{items: children(i, item)}"></ng-template>
            </ng-container>
          </ng-container>
        </ng-template>
        <ng-template [ngTemplateOutlet]="rowOfList" [ngTemplateOutletContext]="{items: getPagedItems()}"></ng-template>
      </div>
    </div>`/*,
  animations: [
    trigger("rowState", [
      state("void", style({height: "0"})),
      state("*", style({height: "*"})),
      transition("void <=> *", animate(".1s ease-in-out"))
    ])
  ]*/
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

  @Input()
  @SdTypeValidate(Function)
  public itemSelectableFn?: (index: number, item: any) => any;

  @Input()
  @SdTypeValidate({
    type: [Boolean, String],
    includes: [true, false, "manual", "multi"]
  })
  @HostBinding("attr.sd-selectable")
  public selectable?: boolean | "manual" | "multi";

  @Input()
  public selectedItem: any;

  @Output()
  public readonly selectedItemChange = new EventEmitter<any>();

  @Input()
  public selectedItems: any[] = [];

  @Output()
  public readonly selectedItemsChange = new EventEmitter<any[]>();

  @Input()
  @SdTypeValidate(String)
  public id?: string;

  @Input()
  @SdTypeValidate(Function)
  public itemThemeFn?: (item: any) => undefined | "primary" | "info" | "success" | "warning" | "danger";

  @Input()
  @SdTypeValidate({type: Number, notnull: true})
  public get page(): number {
    return Math.min(this._page, this.pageLength - 1);
  }

  public set page(value: number) {
    this._page = value;
  }

  private _page = 0;

  @Input()
  @SdTypeValidate({type: Number, notnull: true})
  public get pageLength(): number {
    if (this.pageItemCount && this.items) {
      return Math.ceil(this.items.length / this.pageItemCount);
    }
    else {
      return this._pageLength;
    }
  }

  public set pageLength(value: number) {
    if (this.pageItemCount) {
      throw new Error("'sd-sheet'에 'pageItemCount''와 'pageLength'를 함께 설정할 수 없습니다.");
    }

    this._pageLength = value;
  }

  public _pageLength = 0;

  @Input()
  @SdTypeValidate({type: Number})
  public pageItemCount?: number;

  @Output()
  public readonly pageChange = new EventEmitter<number>();

  @Input()
  @SdTypeValidate(Function)
  public children?: (index: number, item: any) => any;

  @Input()
  @SdTypeValidate({
    type: Array,
    notnull: true
  })
  public expandedItemTracks: any[] = [];

  @Output()
  public readonly expandedItemTracksChange = new EventEmitter<any[]>();

  public headTop = 0;
  public fixedLeft = 0;

  public get paddingTop(): string {
    const headEl = this._elRef.nativeElement.findAll("._head")[0];
    return headEl.clientHeight + "px";

    /*const size = Math.floor(this._style.presets.fns.stripUnit(this._style.presets.vars.sheetPaddingV) * 2
      + this._style.presets.fns.stripUnit(this._style.presets.vars.lineHeight) * this._style.presets.fns.stripUnit(this._style.presets.vars.fontSize.default));

    return ((this.hasHeaderGroup ? (Math.floor(size * 2) + 2) : (Math.floor(size) + 1)) + 1) + "px";*/
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
    const fixedColGroupEl = this._elRef.nativeElement.findAll("._head > ._row > ._fixed-col-group")[0];
    return fixedColGroupEl.clientWidth;

    /*const size = Math.floor(this._style.presets.fns.stripUnit(this._style.presets.vars.sheetPaddingV) * 2
      + this._style.presets.fns.stripUnit(this._style.presets.vars.lineHeight) * this._style.presets.fns.stripUnit(this._style.presets.vars.fontSize.default)) + 1;

    if (this.fixedColumnControls.length > 0) {
      return this.fixedHeaderGroups.map(item => item.width).reduce((a, b) => a + b) + size;
    }
    else {
      return size;
    }*/
  }

  public trackByColumnControlFn(index: number, item: SdSheetColumnControl): any {
    return item.guid;
  }

  public trackByItemFn(index: number, item: any): any {
    if (this.trackBy) {
      return this.trackBy(index, item) || item;
    }
    else {
      return item;
    }
  }

  public trackByIndexFn(index: number): any {
    return index;
  }

  public getPagedItems(): any[] | undefined {
    if (this.pageItemCount && this.items) {
      return this.items.slice(this.page * this.pageItemCount, (this.page + 1) * this.pageItemCount);
    }
    else {
      return this.items;
    }
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
    this._iterableDiffer = this._iterableDiffers.find([]).create((i: number, item: any) => this.trackByItemFn(i, item));

    this._elRef.nativeElement.addEventListener("focus", (event: Event) => {
      if (this.selectable === "manual" && this.selectedItem) {
        const cellEl = (event.target as HTMLElement).findParent("._col") as HTMLElement;
        if (!cellEl) return;
        if (cellEl.classList.contains("_first-col")) return;

        const rowEl = (event.target as HTMLElement).findParent("._row") as HTMLElement;
        if (!rowEl) return;

        const bodyEl = rowEl.parentElement as Element;
        const rowIndex = Array.from(bodyEl.children).indexOf(rowEl);
        const cursorItem = this._getItemByRowIndex(rowIndex);
        if (this.selectedItem !== cursorItem) {
          this.selectedItem = undefined;
          this.selectedItemChange.emit(undefined);
        }
      }
      else if (this.selectable === true) {
        this.selectRow(event.target as HTMLElement);
      }
    }, true);
  }

  private _getItemByRowIndex(index: number): any {
    if (!this.items) return undefined;

    let i = 0;
    const loop = (items: any[]): any => {
      for (const item of items) {
        if (i === index) {
          return item;
        }
        i++;

        const children = this.children && this.getIsExpended(items.indexOf(item), item) && this.children(items.indexOf(item), item);
        if (children) {
          const selected = loop(children);
          if (selected) {
            return selected;
          }
        }
      }

      return undefined;
    };
    return loop(this.getPagedItems()!);
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

  public getIsExpended(i: number, item: any): boolean {
    return this.expandedItemTracks.includes(this.trackByItemFn(i, item));
  }

  public getHasChildren(i: number, item: any): boolean {
    return this.children && this.children(i, item) && this.children(i, item).length > 0;
  }

  public selectRow(targetEl: Element): void {
    if (!this.selectable) return;

    const rowEl = targetEl.findParent("._row");
    if (rowEl) {
      const bodyEl = rowEl.parentElement as Element;
      const rowIndex = Array.from(bodyEl.children).indexOf(rowEl);
      const selectedItem = this._getItemByRowIndex(rowIndex);

      if (this.selectable === "multi") {
        if (!this.selectedItems.includes(selectedItem)) {
          this.selectedItems.push(selectedItem);
          this.selectedItemsChange.emit(this.selectedItems);
        }
      }
      else {
        if (this.selectedItem !== selectedItem) {
          this.selectedItem = selectedItem;
          this.selectedItemChange.emit(this.selectedItem);
        }
      }
    }
  }

  public onSelectIconClick(event: Event, i: number, item: any): void {
    if (this.selectable) {
      const targetEl = event.target as Element;
      const rowEl = targetEl.findParent("._row");
      if (!rowEl) return;

      const bodyEl = rowEl.parentElement as Element;
      const rowIndex = Array.from(bodyEl.children).indexOf(rowEl);
      const selectedItem = this._getItemByRowIndex(rowIndex);

      if (this.selectable === "multi") {
        if (this.selectedItems.includes(selectedItem)) {
          this.selectedItems.remove(selectedItem);
          this.selectedItemsChange.emit(this.selectedItems);
        }
        else {
          this.selectRow(event.target as Element);
        }
      }
      else {
        if (this.selectedItem === selectedItem) {
          this.selectedItem = undefined;
          this.selectedItemChange.emit(undefined);
        }
        else {
          this.selectRow(event.target as Element);
        }
      }
    }
  }

  public onExpandIconClick(event: Event, i: number, item: any): void {
    if (this.getHasChildren(i, item)) {
      if (this.getIsExpended(i, item)) {
        this.expandedItemTracks.remove(this.trackByItemFn(i, item));
      }
      else {
        this.expandedItemTracks.push(this.trackByItemFn(i, item));
      }
      this.expandedItemTracksChange.emit(this.expandedItemTracks);
    }
  }

  @HostListener("scroll", ["$event"])
  public onScroll(event: Event): void {
    const el = event.target as Element;
    this.headTop = el.scrollTop;
    this.fixedLeft = el.scrollLeft;
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
      document.documentElement!.removeEventListener("mousemove", doDrag, false);
      document.documentElement!.removeEventListener("mouseup", stopDrag, false);

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
    document.documentElement!.addEventListener("mousemove", doDrag, false);
    document.documentElement!.addEventListener("mouseup", stopDrag, false);
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
          (nextRowEl!.findAll("._col")[cellIndex] as HTMLElement).focus();
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
      else if (event.key === "Enter" || (event.ctrlKey && event.key === "ArrowDown")) {
        const cellEl = targetEl.findParent("._col") as HTMLElement;
        const rowEl = cellEl.findParent("._row") as HTMLElement;
        const bodyEl = rowEl.parentElement as Element;

        const rowIndex = Array.from(bodyEl.children).indexOf(rowEl);
        const cellIndex = Array.from(rowEl.findAll("._col")).indexOf(cellEl);

        const nextRowEl = bodyEl.children.item(rowIndex + 1);
        if (nextRowEl) {
          const nextRowCellEl = nextRowEl.findAll("._col")[cellIndex] as HTMLElement;

          const focusableEls = nextRowCellEl.findFocusableAll();
          if (focusableEls.length > 0) {
            focusableEls[0].focus();
          }
          else {
            nextRowCellEl.focus();
          }

          event.preventDefault();
        }
      }
      else if (event.ctrlKey && event.key === "ArrowUp") {
        const cellEl = targetEl.findParent("._col") as HTMLElement;
        const rowEl = cellEl.findParent("._row") as HTMLElement;
        const bodyEl = rowEl.parentElement as Element;

        const rowIndex = Array.from(bodyEl.children).indexOf(rowEl);
        const cellIndex = Array.from(rowEl.findAll("._col")).indexOf(cellEl);

        if (rowIndex - 1 >= 0) {
          const nextRowEl = bodyEl.children.item(rowIndex - 1);
          const nextCell = (nextRowEl!.findAll("._col")[cellIndex] as HTMLElement);
          const focusableEls = nextCell.findFocusableAll();
          if (focusableEls.length > 0) {
            focusableEls[0].focus();
          }
          else {
            nextCell.focus();
          }

          event.preventDefault();
        }
      }
      else if (event.key === "Tab" && !event.shiftKey) {
        const cellEl = targetEl.findParent("._col") as HTMLElement;
        const targetIndexOnCell = cellEl.findFocusableAll().indexOf(targetEl);
        if (targetIndexOnCell + 1 < cellEl.findFocusableAll().length) {
          return;
        }

        const rowEl = cellEl.findParent("._row") as HTMLElement;
        const cellIndex = Array.from(rowEl.findAll("._col")).indexOf(cellEl);

        const nextCell = rowEl.findAll("._col")[cellIndex + 1] as HTMLElement;
        if (nextCell) {
          const focusableEls = nextCell.findFocusableAll();
          if (focusableEls.length > 0) {
            focusableEls[0].focus();
          }
          else {
            nextCell.focus();
          }

          event.preventDefault();
        }
      }
      else if (event.key === "Tab" && event.shiftKey) {
        const cellEl = targetEl.findParent("._col") as HTMLElement;
        const targetIndexOnCell = cellEl.findFocusableAll().indexOf(targetEl);
        if (targetIndexOnCell >= 1) {
          return;
        }

        const rowEl = cellEl.findParent("._row") as HTMLElement;
        const cellIndex = Array.from(rowEl.findAll("._col")).indexOf(cellEl);

        if (cellIndex - 1 >= 0) {
          const nextCell = rowEl.findAll("._col")[cellIndex - 1] as HTMLElement;

          const focusableEls = nextCell.findFocusableAll();
          if (focusableEls.length > 0) {
            focusableEls[0].focus();
          }
          else {
            nextCell.focus();
          }

          event.preventDefault();
        }
      }
      else if (event.ctrlKey && event.key === "ArrowRight") {
        const cellEl = targetEl.findParent("._col") as HTMLElement;
        const rowEl = cellEl.findParent("._row") as HTMLElement;
        const cellIndex = Array.from(rowEl.findAll("._col")).indexOf(cellEl);

        const nextCell = rowEl.findAll("._col")[cellIndex + 1] as HTMLElement;
        if (nextCell) {
          const focusableEls = nextCell.findFocusableAll();
          if (focusableEls.length > 0) {
            focusableEls[0].focus();
          }
          else {
            nextCell.focus();
          }

          event.preventDefault();
        }
      }
      else if (event.ctrlKey && event.key === "ArrowLeft") {
        const cellEl = targetEl.findParent("._col") as HTMLElement;
        const rowEl = cellEl.findParent("._row") as HTMLElement;
        const cellIndex = Array.from(rowEl.findAll("._col")).indexOf(cellEl);

        if (cellIndex - 1 >= 0) {
          const nextCell = rowEl.findAll("._col")[cellIndex - 1] as HTMLElement;

          const focusableEls = nextCell.findFocusableAll();
          if (focusableEls.length > 0) {
            focusableEls[0].focus();
          }
          else {
            nextCell.focus();
          }

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
