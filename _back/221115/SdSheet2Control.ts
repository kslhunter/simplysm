import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostListener,
  Input,
  NgZone,
  Output,
  QueryList,
  ViewChild
} from "@angular/core";
import { SdSheet2ColumnControl } from "./SdSheet2ColumnControl";
import { SdInputValidate } from "../decorators/SdInputValidate";
import { ObjectUtil } from "@simplysm/sd-core-common";

@Component({
  selector: "sd-sheet2",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-dock-container>
      <sd-dock>
        <sd-flex direction="row" gap="sm">
          <sd-anchor class="_cog-btn">
            <fa-icon [icon]="icons.fasCog | async" [fixedWidth]="true"></fa-icon>
          </sd-anchor>
          <sd-pagination [page]="1" [pageLength]="30"></sd-pagination>
        </sd-flex>
      </sd-dock>

      <sd-pane #sheetContainer class="_sheet-container">
        <table class="_sheet"
               (keydown)="onSheetKeydown($event)">
          <thead>
          <ng-container *ngFor="let depth of createArrayByLength(maxHeaderDepth)">
            <tr>
              <th class="_fixed _feature-cell" *ngIf="depth === 0"
                  [attr.rowspan]="maxHeaderDepth">
              </th>
              <ng-container *ngFor="let columnControl of displayColumnControls;">
                <ng-container *ngIf="getColumnControlHeader(columnControl, depth) as header">
                  <th #th
                      [attr.rowspan]="getColumnControlHeaderRowSpan(columnControl, depth)"
                      [attr.colspan]="getColumnControlHeaderColSpan(columnControl, depth)"
                      [class._fixed]="columnControl.fixed"
                      [class._last-depth]="getIsLastHeaderDepth(columnControl, depth)"
                      [style]="!getColumnControlHeaderColSpan(columnControl, depth) ? {width: columnControl.width, minWidth: columnControl.width, maxWidth: columnControl.width} : undefined">
                    <div class="_contents"
                         [class._clickable]="columnControl.useOrdering && columnControl.key"
                         (click)="onHeaderClick($event, columnControl)">
                      {{ header }}
                      <div
                        *ngIf="columnControl.useOrdering && columnControl.key && getIsLastHeaderDepth(columnControl, depth)"
                        class="_sort-icon">
                        <fa-layers>
                          <fa-icon [icon]="icons.fasSort | async" class="sd-text-brightness-lightest"></fa-icon>
                          <fa-icon [icon]="icons.fasSortDown | async"
                                   *ngIf="getIsColumnControlOrderingDesc(columnControl) === false"></fa-icon>
                          <fa-icon [icon]="icons.fasSortUp | async"
                                   *ngIf="getIsColumnControlOrderingDesc(columnControl) === true"></fa-icon>
                        </fa-layers>
                        <sub *ngIf="getColumnControlOrderingIndexText(columnControl) as text">{{ text }}</sub>
                      </div>
                    </div>

                    <div class="_resizer" *ngIf="columnControl.resizable && getIsLastHeaderDepth(columnControl, depth)"
                         (mousedown)="onResizerMousedown($event, columnControl)"></div>
                  </th>
                </ng-container>
              </ng-container>
            </tr>
          </ng-container>
          </thead>
          <tbody>
          <ng-container *ngFor="let item of displayItems; let r = index;">
            <tr (click)="onItemRowClick(item)">
              <td class="_fixed _feature-cell">
                <div class="_contents sd-padding-xs-sm">
                  <ng-container *ngIf="selectMode">
                    <fa-icon [icon]="icons.fasArrowRight | async" [fixedWidth]="true"
                             [class.sd-text-brightness-lightest]="!selectedItems.includes(item)"
                             [class.sd-text-brightness-primary-default]="selectedItems.includes(item)"
                             style="cursor:pointer;"
                             (click)="onItemSelectIconClick(item)"></fa-icon>
                  </ng-container>
                </div>
              </td>
              <ng-container *ngFor="let columnControl of displayColumnControls; let c = index;">
                <td #td
                    [class._fixed]="columnControl.fixed"
                    [style]="{width: columnControl.width, minWidth: columnControl.width, maxWidth: columnControl.width}"
                    [attr.sd-addr]="r + '_' + c"
                    (focus)="onCellFocus(r, c)"
                    (dblclick)="onCellMouseDoubleClick(r, c)"
                    tabindex="0">
                  <div class="_contents">
                    <ng-template [ngTemplateOutlet]="columnControl.contentsTemplateRef"
                                 [ngTemplateOutletContext]="{item: item, edit: getIsCellEditMode(r, c) }"></ng-template>
                  </div>
                </td>
              </ng-container>
            </tr>
          </ng-container>
          </tbody>
        </table>

        <div class="_cell-select-cell-indicator"></div>
        <div class="_cell-select-row-indicator"></div>
      </sd-pane>
    </sd-dock-container>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";

    $z-index-fixed: 1;
    $z-index-head: 2;
    $z-index-head-fixed: 3;
    $z-index-row-select-indicator: 4;
    $z-index-cell-select-cell-indicator: 5;

    $border-color: var(--theme-color-blue-grey-lightest);
    $border-color-dark: var(--theme-color-grey-light);

    :host {
      ::ng-deep > sd-dock-container > ._content {
        border: 1px solid $border-color-dark;
        border-radius: var(--border-radius-default);

        > sd-dock > ._content {
          background: white;
          border-top-left-radius: var(--border-radius-default);
          border-top-right-radius: var(--border-radius-default);
          border-bottom: 1px solid $border-color-dark;

          ._cog-btn {
            padding: var(--gap-xs) var(--gap-sm);
            margin: var(--gap-xs);
            border-radius: var(--border-radius-default);

            &:hover {
              background: var(--theme-color-grey-lightest);
            }
          }
        }
      }

      ._sheet-container {
        background: var(--background-color);
        border-bottom-right-radius: var(--border-radius-default);
        border-bottom-left-radius: var(--border-radius-default);

        > ._sheet {
          border-spacing: 0;
          table-layout: fixed;
          border-right: 1px solid $border-color-dark;
          border-bottom: 1px solid $border-color-dark;
          margin-right: 2px;
          margin-bottom: 2px;

          > * > tr > * {
            border-right: 1px solid $border-color;
            border-bottom: 1px solid $border-color;
            white-space: nowrap;
            overflow: hidden;
            padding: 0;

            &._feature-cell {
              background: var(--theme-color-grey-lightest);
              min-width: 2em;
            }

            &._fixed:has(+:not(._fixed)) {
              border-right: 1px solid $border-color-dark;
            }
          }

          > thead {
            z-index: $z-index-head;

            > tr > th {
              position: relative;
              background: var(--theme-color-grey-lightest);

              &._fixed {
                z-index: $z-index-head-fixed;
              }

              &._last-depth {
                border-bottom: 1px solid $border-color-dark;
              }

              > ._contents {
                padding: var(--sd-sheet-padding-v) var(--sd-sheet-padding-h);

                &._clickable {
                  cursor: pointer;

                  &:hover {
                    text-decoration: underline;
                  }
                }

                > ._sort-icon {
                  position: absolute;
                  right: 0;
                  display: inline-block;
                  padding: 0 var(--gap-xs);
                  background-color: var(--theme-color-grey-lightest);
                }
              }

              > ._resizer {
                position: absolute;
                top: 0;
                right: 0;
                bottom: 0;
                width: 2px;
                cursor: ew-resize;
              }
            }
          }

          > tbody > tr > td {
            background: white;

            &._fixed {
              z-index: $z-index-fixed;
            }
          }
        }

        > ._cell-select-cell-indicator {
          display: none;
          position: absolute;
          border: 2px solid var(--theme-color-primary-default);
          pointer-events: none;

          z-index: $z-index-cell-select-cell-indicator;
        }

        > ._cell-select-row-indicator {
          display: none;
          position: absolute;
          pointer-events: none;
          background: var(--theme-color-grey-default);
          opacity: .1;

          z-index: $z-index-cell-select-cell-indicator;
        }

        ::ng-deep > ._row-select-indicator {
          position: absolute;
          pointer-events: none;
          background: var(--theme-color-primary-default);
          opacity: .1;

          z-index: $z-index-row-select-indicator;
        }
      }
    }
  `]
})
export class SdSheet2Control implements AfterViewChecked {
  public icons = {
    fasCog: import("@fortawesome/pro-solid-svg-icons/faCog").then(m => m.faCog),
    fasTable: import("@fortawesome/pro-solid-svg-icons/faTable").then(m => m.faTable),
    fasSort: import("@fortawesome/pro-solid-svg-icons/faSort").then(m => m.faSort),
    fasSortDown: import("@fortawesome/pro-solid-svg-icons/faSortDown").then(m => m.faSortDown),
    fasSortUp: import("@fortawesome/pro-solid-svg-icons/faSortUp").then(m => m.faSortUp),
    fasArrowRight: import("@fortawesome/pro-solid-svg-icons/faArrowRight").then(m => m.faArrowRight)
  };

  @Input()
  @SdInputValidate({ type: Array, notnull: true })
  public items: any[] = [];

  public get displayItems(): any[] {
    return this.items;
  }

  @ContentChildren(forwardRef(() => SdSheet2ColumnControl))
  public columnControls?: QueryList<SdSheet2ColumnControl>;

  @ViewChild("sheetContainer", { static: true, read: ElementRef })
  public sheetContainerElRef?: ElementRef<HTMLElement>;

  public selectedCellAddr?: { r: number; c: number };
  public editMode = false;

  @Input()
  public ordering: ISdSheet2ColumnOrderingVM[] = [];

  @Output()
  public readonly orderingChange = new EventEmitter<ISdSheet2ColumnOrderingVM[]>();

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["single", "multi"]
  })
  public selectMode?: "single" | "multi";

  @Input()
  @SdInputValidate({ type: Array, notnull: true })
  public selectedItems: any[] = [];

  @Output()
  public readonly selectedItemsChange = new EventEmitter<any[]>();

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["click"]
  })
  public autoSelect?: "click";

  public get displayColumnControls(): SdSheet2ColumnControl[] | undefined {
    return this.columnControls?.toArray().orderBy((item) => item.fixed ? 0 : 1);
  }

  public get maxHeaderDepth(): number {
    return this.columnControls
      ?.map((item) => item.header instanceof Array ? item.header.length : 1)
      .max() ?? 1;
  }

  public get endCellAddr(): { r: number; c: number } {
    return {
      r: this.displayItems.length - 1,
      c: (this.displayColumnControls?.length ?? 0) - 1
    };
  }

  public constructor(private readonly _zone: NgZone,
                     private readonly _cdr: ChangeDetectorRef) {
  }

  public ngAfterViewChecked(): void {
    if (!this.sheetContainerElRef) return;

    // Fixed 컬럼 설정

    const fixedEls = this.sheetContainerElRef.nativeElement.findAll("> ._sheet > * > tr > *._fixed");
    for (const fixedEl of fixedEls) {
      fixedEl.style.left = "";
    }

    for (const fixedEl of fixedEls) {
      fixedEl.style.position = "sticky";
      fixedEl.style.left = fixedEl.offsetLeft + "px";
    }

    // Fixed 헤더 설정

    const theadEl = this.sheetContainerElRef.nativeElement.findFirst("> ._sheet > thead")!;
    theadEl.style.position = "sticky";
    theadEl.style.top = theadEl.offsetTop + "px";

    // Cell Select Cell Indicator 설정
    const cellSelectCellIndicatorEl = this.sheetContainerElRef.nativeElement.findFirst("> ._cell-select-cell-indicator")!;

    if (
      document.activeElement === this.sheetContainerElRef.nativeElement.findFirst("> ._sheet") &&
      this.selectedCellAddr
    ) {
      cellSelectCellIndicatorEl.style.display = "block";

      const selectedTdEl = this.sheetContainerElRef.nativeElement.findFirst(`> ._sheet > tbody > tr:nth-child(${this.selectedCellAddr.r + 1}) > td:nth-child(${this.selectedCellAddr.c + 2})`)!;
      cellSelectCellIndicatorEl.style.top = selectedTdEl.offsetTop - 2 + "px";
      cellSelectCellIndicatorEl.style.left = selectedTdEl.offsetLeft - 2 + "px";
      cellSelectCellIndicatorEl.style.height = selectedTdEl.offsetHeight + 3 + "px";
      cellSelectCellIndicatorEl.style.width = selectedTdEl.offsetWidth + 3 + "px";
    }
    else {
      cellSelectCellIndicatorEl.style.display = "none";
    }

    // Cell Select Row Indicator 설정
    const cellSelectRowIndicatorEl = this.sheetContainerElRef.nativeElement.findFirst("> ._cell-select-row-indicator")!;

    if (this.selectedCellAddr) {
      cellSelectRowIndicatorEl.style.display = "block";

      const selectedTrEl = this.sheetContainerElRef.nativeElement.findFirst(`> ._sheet > tbody > tr:nth-child(${this.selectedCellAddr.r + 1})`)!;
      cellSelectRowIndicatorEl.style.top = selectedTrEl.offsetTop - 2 + "px";
      cellSelectRowIndicatorEl.style.left = selectedTrEl.offsetLeft - 2 + "px";
      cellSelectRowIndicatorEl.style.height = selectedTrEl.offsetHeight + 3 + "px";
      cellSelectRowIndicatorEl.style.width = selectedTrEl.offsetWidth + 3 + "px";
    }
    else {
      cellSelectRowIndicatorEl.style.display = "none";
    }


    // Row Select Indicator 설정
    const prevRowSelectIndicatorEls = this.sheetContainerElRef.nativeElement.findAll("> ._row-select-indicator");
    for (const prevRowSelectIndicatorEl of prevRowSelectIndicatorEls) {
      prevRowSelectIndicatorEl.remove();
    }

    for (const selectedItem of this.selectedItems) {
      const rowIndex = this.displayItems.indexOf(selectedItem);
      const selectedTrEl = this.sheetContainerElRef.nativeElement.findFirst(`> ._sheet > tbody > tr:nth-child(${rowIndex + 1})`);
      if (selectedTrEl) {
        const rowSelectIndicatorEl = document.createElement("div");
        rowSelectIndicatorEl.classList.add("_row-select-indicator");
        rowSelectIndicatorEl.style.top = selectedTrEl.offsetTop + "px";
        rowSelectIndicatorEl.style.left = selectedTrEl.offsetLeft + "px";
        rowSelectIndicatorEl.style.height = selectedTrEl.offsetHeight + "px";
        rowSelectIndicatorEl.style.width = selectedTrEl.offsetWidth + "px";
        this.sheetContainerElRef.nativeElement.appendChild(rowSelectIndicatorEl);
      }
    }
  }

  public getIsLastHeaderDepth(columnControl: SdSheet2ColumnControl, depth: number): boolean {
    if (columnControl.header instanceof Array) {
      return depth === columnControl.header.length - 1;
    }
    else {
      return true;
    }
  }

  public getIsColumnControlOrderingDesc(columnControl: SdSheet2ColumnControl): boolean | undefined {
    return this.ordering.single((item) => item.key === columnControl.key)?.desc;
  }

  public getColumnControlOrderingIndexText(columnControl: SdSheet2ColumnControl): string | undefined {
    if (this.ordering.length < 2) {
      return undefined;
    }
    const index = this.ordering.findIndex((item) => item.key === columnControl.key);
    return index >= 0 ? (index + 1).toString() : undefined;
  }

  public getIsCellEditMode(r: number, c: number): boolean {
    return this.editMode && this.selectedCellAddr !== undefined && this.selectedCellAddr.r === r && this.selectedCellAddr.c === c;
  }

  public createArrayByLength(count: number): number[] {
    return Array(count).fill(0).map((a, b) => b);
  }

  public getColumnControlHeader(columnControl: SdSheet2ColumnControl, depth: number): string | null | undefined {
    const displayColumnControls = this.displayColumnControls;
    if (!displayColumnControls) return;

    const rawFn = (header: string[] | string | undefined, d: number): string | undefined => {
      if (header instanceof Array) {
        return header[d];
      }
      else if (d === 0) {
        return header;
      }
      else {
        return undefined;
      }
    };

    if (columnControl.header instanceof Array) {
      const currColumnControlIndex = displayColumnControls.indexOf(columnControl);

      if (currColumnControlIndex > 0) {
        const currColumnControlPrevHeaders = columnControl.header.slice(0, depth + 1);
        const prevColumnControl = displayColumnControls[currColumnControlIndex - 1];

        if (columnControl.fixed === prevColumnControl.fixed && currColumnControlPrevHeaders.every((item, d) => item === rawFn(prevColumnControl.header, d))) {
          return null;
        }
        else {
          return rawFn(columnControl.header, depth);
        }
      }
      else {
        return rawFn(columnControl.header, depth);
      }
    }
    else {
      return rawFn(columnControl.header, depth);
    }
  }

  public getColumnControlHeaderRowSpan(columnControl: SdSheet2ColumnControl, depth: number): number | undefined {
    if (columnControl.header === undefined) return;

    if (columnControl.header instanceof Array) {
      if (depth === columnControl.header.length - 1) {
        return this.maxHeaderDepth - depth;
      }
      else {
        return undefined;
      }
    }
    else {
      return this.maxHeaderDepth;
    }
  }

  public getColumnControlHeaderColSpan(columnControl: SdSheet2ColumnControl, depth: number): number | undefined {
    const displayColumnControls = this.displayColumnControls;
    if (!displayColumnControls) return;
    if (columnControl.header === undefined) return;
    if (typeof columnControl.header === "string") return;

    // const currentHeader = this.getColumnControlHeader(columnControl, depth);

    const index = displayColumnControls.indexOf(columnControl);
    const nextColumnControls = displayColumnControls.slice(index + 1);

    let count = 1;
    for (const nextColumnControl of nextColumnControls) {
      if (this.getColumnControlHeader(nextColumnControl, depth) !== null) {
        break;
      }
      count++;
    }

    return count > 1 ? count : undefined;
  }

  public onCellFocus(r: number, c: number): void {
    if (this.selectedCellAddr && this.selectedCellAddr.r === r && this.selectedCellAddr.c === c) return;
    this.selectedCellAddr = { r, c };
    this._setIsSelectedCellEditMode(false);
  }

  public onCellMouseDoubleClick(r: number, c: number): void {
    this.selectedCellAddr = { r, c };
    this._setIsSelectedCellEditMode(true);
  }

  public onSheetKeydown(event: KeyboardEvent): void {
    if (!this.selectedCellAddr) return;
    if (!this.sheetContainerElRef) return;

    if (document.activeElement === this.sheetContainerElRef.nativeElement.findFirst("> ._sheet")) {
      if (event.key === "F2") {
        event.preventDefault();

        this._setIsSelectedCellEditMode(true);
      }
      else if (event.key === "ArrowDown") {
        if (this.selectedCellAddr.r >= this.endCellAddr.r) return;
        event.preventDefault();

        this.selectedCellAddr.r++;
      }
      else if (event.key === "ArrowUp") {
        if (this.selectedCellAddr.r <= 0) return;
        event.preventDefault();

        this.selectedCellAddr.r--;
      }
      else if (event.key === "ArrowRight") {
        if (this.selectedCellAddr.c >= this.endCellAddr.c) return;
        event.preventDefault();

        this.selectedCellAddr.c++;
      }
      else if (event.key === "ArrowLeft") {
        if (this.selectedCellAddr.c <= 0) return;
        event.preventDefault();

        this.selectedCellAddr.c--;
      }
    }
    else {
      if (event.key === "Escape") {
        event.preventDefault();

        this._setIsSelectedCellEditMode(false);
      }
      else if (event.ctrlKey && event.key === "ArrowDown") {
        if (this.selectedCellAddr.r >= this.endCellAddr.r) return;
        event.preventDefault();

        this.selectedCellAddr.r++;
        this._setIsSelectedCellEditMode(true);
      }
      else if (event.ctrlKey && event.key === "ArrowUp") {
        if (this.selectedCellAddr.r <= 0) return;
        event.preventDefault();

        this.selectedCellAddr.r--;
        this._setIsSelectedCellEditMode(true);
      }
      else if (event.ctrlKey && event.key === "ArrowRight") {
        if (this.selectedCellAddr.c >= this.endCellAddr.c) return;
        event.preventDefault();

        this.selectedCellAddr.c++;
        this._setIsSelectedCellEditMode(true);
      }
      else if (event.ctrlKey && event.key === "ArrowLeft") {
        if (this.selectedCellAddr.c <= 0) return;
        event.preventDefault();

        this.selectedCellAddr.c--;
        this._setIsSelectedCellEditMode(true);
      }
      else if (event.ctrlKey && event.key === "ArrowLeft") {
        if (this.selectedCellAddr.c <= 0) return;
        event.preventDefault();

        this.selectedCellAddr.c--;
        this._setIsSelectedCellEditMode(true);
      }
    }
  }

  @HostListener("document:mousedown", ["$event"])
  public onDocumentMousedown(event: Event): void {
    if (!(event.target instanceof HTMLElement)) return;
    if (!this.sheetContainerElRef) return;

    const sheetEl = this.sheetContainerElRef.nativeElement.findFirst("> ._sheet");
    if (!sheetEl) return;

    if (!event.target.findParent(sheetEl)) {
      this.selectedCellAddr = undefined;
    }
  }

  public onHeaderClick(event: MouseEvent, columnControl: SdSheet2ColumnControl): void {
    if (!columnControl.useOrdering) return;
    if (columnControl.key === undefined) return;

    let ordering = ObjectUtil.clone(this.ordering);

    if (event.shiftKey || event.ctrlKey) {
      const orderingItem = ordering.single((item) => item.key === columnControl.key);
      if (orderingItem) {
        if (orderingItem.desc) {
          ordering.remove(orderingItem);
        }
        else {
          orderingItem.desc = !orderingItem.desc;
        }
      }
      else {
        ordering.push({ key: columnControl.key, desc: false });
      }
    }
    else {
      if (ordering.length === 1 && ordering[0].key === columnControl.key) {
        if (ordering[0].desc) {
          ordering = [];
        }
        else {
          ordering[0].desc = !ordering[0].desc;
        }
      }
      else {
        ordering = [{ key: columnControl.key, desc: false }];
      }
    }

    if (this.orderingChange.observed) {
      this.orderingChange.emit(ordering);
    }
    else {
      this.ordering = ordering;
    }
  }

  public onItemSelectIconClick(item: any): void {
    let selectedItems = ObjectUtil.clone(this.selectedItems);

    if (this.selectedItems.includes(item)) {
      selectedItems.remove(this.selectedItems.indexOf(item));
    }
    else {
      if (this.selectMode === "single") {
        selectedItems = [item];
      }
      else {
        selectedItems.push(item);
      }
    }

    if (this.selectedItemsChange.observed) {
      this.selectedItemsChange.emit(selectedItems);
    }
    else {
      this.selectedItems = selectedItems;
    }
  }

  public onItemRowClick(item: any): void {
    if (this.autoSelect === "click") {
      if (this.selectedItems.includes(item)) return;

      let selectedItems = ObjectUtil.clone(this.selectedItems);

      if (this.selectMode === "single") {
        selectedItems = [item];
      }
      else {
        selectedItems.push(item);
      }

      if (this.selectedItemsChange.observed) {
        this.selectedItemsChange.emit(selectedItems);
      }
      else {
        this.selectedItems = selectedItems;
      }
    }
  }

  public onResizerMousedown(event: MouseEvent, columnControl: SdSheet2ColumnControl): void {
    if (!columnControl.resizable) return;
    if (!(event.target instanceof HTMLElement)) return;

    const thEl = event.target.findParent("th");
    if (!thEl) return;

    const displayColumnControls = this.displayColumnControls;
    if (!displayColumnControls) return;
    const currColumnControlIndex = displayColumnControls.indexOf(columnControl);
    const tdEls = this.sheetContainerElRef!.nativeElement.findAll(`> ._sheet > tbody > tr > td:nth-child(${currColumnControlIndex + 2})`);

    const startX = event.clientX;
    const startWidth = thEl.clientWidth;

    const doDrag = (e: MouseEvent): void => {
      e.stopPropagation();
      e.preventDefault();

      const width = startWidth + e.clientX - startX;

      thEl.style.width = `${width}px`;
      thEl.style.minWidth = `${width}px`;
      thEl.style.maxWidth = `${width}px`;

      for (const tdEl of tdEls) {
        tdEl.style.width = `${width}px`;
        tdEl.style.minWidth = `${width}px`;
        tdEl.style.maxWidth = `${width}px`;
      }
    };

    const stopDrag = (e: MouseEvent): void => {
      e.stopPropagation();
      e.preventDefault();

      document.documentElement.removeEventListener("mousemove", doDrag, false);
      document.documentElement.removeEventListener("mouseup", stopDrag, false);

      columnControl.width = thEl.style.width;
      this._cdr.markForCheck();
    };

    document.documentElement.addEventListener("mousemove", doDrag, false);
    document.documentElement.addEventListener("mouseup", stopDrag, false);
  }

  private _setIsSelectedCellEditMode(editMode: boolean): void {
    if (!this.selectedCellAddr) return;
    if (!this.sheetContainerElRef) return;

    if (editMode) {
      this.editMode = true;
      const selectedTdEl = this.sheetContainerElRef.nativeElement.findFirst(`> ._sheet > tbody > tr:nth-child(${this.selectedCellAddr.r + 1}) > td:nth-child(${this.selectedCellAddr.c + 2})`)!;

      this._zone.run(() => {
        setTimeout(() => {
          const focusableFirstEl = selectedTdEl.findFocusableFirst();
          if (focusableFirstEl) {
            focusableFirstEl.focus();
          }
          else {
            this._setIsSelectedCellEditMode(false);
          }

          this.ngAfterViewChecked();
        });
      });
    }
    else {
      const sheetEl = this.sheetContainerElRef.nativeElement.findFirst("> ._sheet");
      if (!sheetEl) return;
      sheetEl.focus();

      this.editMode = false;
    }
  }
}

export interface ISdSheet2ColumnOrderingVM {
  key: string;
  desc: boolean;
}
