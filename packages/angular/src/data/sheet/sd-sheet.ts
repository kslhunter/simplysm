import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  inject,
  input,
  model,
  output,
  ViewEncapsulation,
} from "@angular/core";
import { NgTemplateOutlet } from "@angular/common";
import { SdSheetColumn } from "./sd-sheet-column";
import { SdCheckbox } from "../../controls/checkbox/sd-checkbox";
import { NgIcon } from "@ng-icons/core";
import {
  tablerArrowRight,
  tablerArrowsSort,
  tablerCaretRight,
  tablerSettings,
  tablerSortAscending,
  tablerSortDescending,
} from "@ng-icons/tabler-icons";
import { useSheetLayoutEngine } from "./useSheetLayoutEngine";
import { useSheetColumnFixing } from "./useSheetColumnFixing";
import { useSelectionManager } from "../../core/selection/useSelectionManager";
import { useSortingManager, type SortingDef } from "../../core/selection/useSortingManager";
import { SdPagination } from "../../controls/pagination/sd-pagination";
import { SdAnchor } from "../../controls/button/sd-anchor";
import { SdButton } from "../../controls/button/sd-button";
import type {
  SdSheetCellKeydownEventParam,
  SdSheetConfig,
  SdSheetHeaderDef,
  SdSheetItemKeydownEventParam,
} from "./types";
import type { SdResizeEvent } from "../../core/events/sd-resize-event.plugin";
import { injectSdSystemConfigResource } from "../../core/config/injectSdSystemConfigResource";
import { injectSheetDomAccessor } from "./injectSheetDomAccessor";
import { useSheetCellAgent } from "./useSheetCellAgent";
import { injectSheetColumnResizing } from "./injectSheetColumnResizing";
import { useSheetDisplayPipeline } from "./useSheetDisplayPipeline";
import { useSheetCellStyling } from "./useSheetCellStyling";
import { useSheetFocusIndicator } from "./useSheetFocusIndicator";
import { injectSheetSelectRowIndicator } from "./injectSheetSelectRowIndicator";
import { SdModalProvider } from "../../core/modal/sd-modal.provider";
import { SdSheetConfigModal } from "./sd-sheet-config.modal";

@Component({
  selector: "sd-sheet",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [NgTemplateOutlet, SdCheckbox, NgIcon, SdPagination, SdAnchor, SdButton],
  template: `
    @if ((key() || effectivePageCount() > 0) && !hideConfigBar()) {
      <div class="_tool flex-row gap-sm p-xs">
        @if (key()) {
          <sd-button [theme]="'link-primary'" [size]="'sm'" (click)="onConfigButtonClick()">
            <ng-icon [svg]="icons.tablerSettings" />
          </sd-button>
        }
        @if (effectivePageCount() > 1) {
          <sd-pagination
            class="flex-fill"
            [(currentPage)]="currentPage"
            [totalPageCount]="effectivePageCount()"
            [visiblePageCount]="visiblePageCount()"
          />
        }
      </div>
    }

    <div class="_sheet-container flex-fill" (scroll.passive)="onContainerScroll()" [style]="contentStyle()">
      <table (sdResize)="onTableResize($event)">
        <thead>
          @for (row of layout.headerDefTable(); track $index; let rowIdx = $index) {
            <tr>
              @if (rowIdx === 0) {
                <th
                  class="_fixed _feature-cell _last-depth"
                  [attr.rowspan]="
                    layout.headerFeatureRowSpan() > 1 ? layout.headerFeatureRowSpan() : null
                  "
                >
                  @if (selectMode() === "multi") {
                    <sd-checkbox
                      [value]="selection.isAllSelected()"
                      (click)="selection.toggleAll()"
                      [inline]="true"
                    />
                  }
                </th>
                @if (expanding.hasExpandable()) {
                  <th
                    class="_fixed _feature-cell _last-depth"
                    [attr.rowspan]="
                      layout.headerFeatureRowSpan() > 1 ? layout.headerFeatureRowSpan() : null
                    "
                  >
                    <ng-icon
                      [svg]="icons.tablerCaretRight"
                      [class.tx-theme-primary-default]="expanding.isAllExpanded()"
                      [style.transform]="expanding.isAllExpanded() ? 'rotate(90deg)' : undefined"
                      (click)="expanding.toggleAll()"
                    />
                  </th>
                }
              }
              @for (cell of row; track $index) {
                @if (!cell.isLastRow) {
                  <th
                    [class._fixed]="cell.colDef?.fixed"
                    [attr.colspan]="cell.colspan > 1 ? cell.colspan : null"
                    [attr.rowspan]="cell.rowspan > 1 ? cell.rowspan : null"
                    [attr.title]="cell.text"
                    [style.left.px]="
                      cell.colDef?.fixed ? fixing.fixedLeftMap().get(cell.colDef!.key) : null
                    "
                  >
                    <div class="_p-sheet">
                      <pre>{{ cell.text }}</pre>
                    </div>
                  </th>
                } @else {
                  <th
                    [class._fixed]="cell.colDef?.fixed"
                    class="_last-depth"
                    [class._sort]="cell.colDef && !cell.colDef.disableSorting"
                    [attr.colspan]="cell.colspan > 1 ? cell.colspan : null"
                    [attr.rowspan]="cell.rowspan > 1 ? cell.rowspan : null"
                    [attr.title]="cell.colDef?.tooltip ?? cell.text"
                    [class.help]="cell.colDef?.tooltip"
                    [style]="getHeaderCellStyle(cell)"
                    (click)="onHeaderClick($event, cell)"
                  >
                    <div class="_headerContent flex-row">
                      @if (cell.colDef && getColumnHeaderTpl(cell.colDef.key); as headerTpl) {
                        <div class="flex-fill" [attr.style]="cell.colDef.headerStyle">
                          <ng-template [ngTemplateOutlet]="headerTpl" />
                        </div>
                      } @else {
                        <div class="flex-fill _p-sheet" [attr.style]="cell.colDef?.headerStyle">
                          <pre>{{ cell.text }}</pre>
                        </div>
                      }
                      @if (cell.colDef && !cell.colDef.disableSorting) {
                        <div class="_sort-icon">
                          @if (getSortDef(cell.colDef.key); as sortDef) {
                            @if (sortDef.desc) {
                              <ng-icon [svg]="icons.tablerSortDescending" />
                            } @else {
                              <ng-icon [svg]="icons.tablerSortAscending" />
                            }
                            @if (sortDef.indexText) {
                              <sub>{{ sortDef.indexText }}</sub>
                            }
                          } @else {
                            <ng-icon [svg]="icons.tablerArrowsSort" class="tx-trans-lightest" />
                          }
                        </div>
                      }
                    </div>
                    @if (cell.colDef && !cell.colDef.disableResizing) {
                      <div
                        class="_resizer"
                        (mousedown)="onResizerMousedown($event, cell.colDef)"
                        (dblclick)="onResizerDblClick($event, cell.colDef)"
                      ></div>
                    }
                  </th>
                }
              }
            </tr>
          }
          @if (layout.hasSummary()) {
            <tr class="_summary-row">
              <th class="_fixed _feature-cell"></th>
              @if (expanding.hasExpandable()) {
                <th class="_fixed _feature-cell"></th>
              }
              @for (colDef of layout.columnDefs(); track colDef.key) {
                <th
                  [class._fixed]="colDef.fixed"
                  [style.left.px]="colDef.fixed ? fixing.fixedLeftMap().get(colDef.key) : null"
                >
                  @if (getColumnSummaryTpl(colDef.key); as tpl) {
                    <ng-template [ngTemplateOutlet]="tpl" />
                  }
                </th>
              }
            </tr>
          }
        </thead>
        <tbody>
          @for (
            item of displayItems();
            track trackByFn() ? trackByFn()!(item, $index) : $index;
            let rowIdx = $index
          ) {
            <tr
              [attr.data-r]="rowIdx"
              (click)="onRowClick(item)"
              (keydown)="onItemKeydown($event, item)"
            >
              <td class="_fixed _feature-cell">
                @if (selectMode() === "multi") {
                  <sd-checkbox
                    [value]="selection.isSelected(item)"
                    [canChangeFn]="selection.getCanChangeFn(item)"
                    (click)="onSelectCheckboxClick($event, item)"
                    (mousedown)="onSelectorMouseDown($event, rowIdx)"
                    [inline]="true"
                    [attr.title]="getSelectableTooltip(item)"
                  />
                } @else if (selectMode() === "single") {
                  @let selectable = selection.getSelectable(item);
                  @if (selectable === true) {
                    <sd-anchor
                      [theme]="selection.isSelected(item) ? 'primary' : 'gray'"
                      (click)="onSelectCheckboxClick($event, item)"
                    >
                      <ng-icon [svg]="icons.tablerArrowRight" />
                    </sd-anchor>
                  }
                }
              </td>
              @if (expanding.hasExpandable()) {
                <td class="_fixed _feature-cell">
                  @let itemDef = getItemDef(item);
                  @if (itemDef.depth > 0) {
                    <div
                      class="_depth-indicator"
                      [style.margin-left.em]="itemDef.depth - 0.5"
                    ></div>
                  }
                  @if (itemDef.hasChildren) {
                    <ng-icon
                      [svg]="icons.tablerCaretRight"
                      [style.transform]="isExpanded(item) ? 'rotate(90deg)' : undefined"
                      [class.tx-theme-primary-default]="isExpanded(item)"
                      (click)="onExpandClick($event, item)"
                    />
                  }
                </td>
              }
              @for (colDef of layout.columnDefs(); track colDef.key; let colIdx = $index) {
                <td
                  [attr.data-r]="rowIdx"
                  [attr.data-c]="colIdx"
                  [class._fixed]="colDef.fixed"
                  [class]="getDataCellClass(item, colDef, rowIdx, colIdx)"
                  [style]="getCellStyleWithIndent(item, colDef, colIdx)"
                  (click)="onCellClick($event, item)"
                  (focus)="onCellFocus(item)"
                  (keydown)="onCellKeydown($event, item, colDef.key)"
                  tabindex="0"
                >
                  @if (getColumnCellTpl(colDef.key); as tpl) {
                    <ng-template
                      [ngTemplateOutlet]="tpl"
                      [ngTemplateOutletContext]="{
                        $implicit: item,
                        item: item,
                        index: rowIdx,
                        depth: getChildrenFn() !== undefined ? getItemDef(item).depth : 0,
                        edit: cellAgent.isCellEditMode({ r: rowIdx, c: colIdx }),
                      }"
                    />
                  }
                </td>
              }
            </tr>
          }
        </tbody>
      </table>

      <div class="_focus-row-indicator">
        <div class="_focus-cell-indicator"></div>
      </div>
      <div
        class="_resize-indicator"
        [style.display]="_isResizing() ? 'block' : 'none'"
        [style.left.px]="_resizeIndicatorLeft()"
      ></div>
      <div class="_select-row-indicator-container"></div>
    </div>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../scss/commons/mixins";

      $z-index-fixed: 2;
      $z-index-head: 3;
      $z-index-head-fixed: 4;
      $z-index-select-row-indicator: 5;
      $z-index-focus-row-indicator: 6;
      $z-index-resize-indicator: 7;

      $border-color: var(--theme-gray-lighter);
      $border-color-dark: var(--theme-gray-lighter);
      $border-color-darker: var(--theme-gray-light);

      $border-radius: var(--border-radius-default);

      sd-sheet {
        border: 1px solid $border-color-dark;
        border-radius: $border-radius;

        > ._tool {
          background: var(--control-color);
          border-top-left-radius: $border-radius;
          border-top-right-radius: $border-radius;
          border-bottom: 1px solid $border-color-dark;
        }

        > ._sheet-container {
          position: relative;
          background: var(--sheet-bg);
          border-bottom-left-radius: $border-radius;
          border-bottom-right-radius: $border-radius;
          overflow: auto;

          > table {
            border-spacing: 0;
            table-layout: fixed;
            margin-right: 2px;
            margin-bottom: 2px;
            border-bottom-right-radius: $border-radius;

            > * > tr > *:last-child {
              border-right: 1px solid $border-color-dark;
            }

            > * > tr:last-child > * {
              border-bottom: 1px solid $border-color-dark;
            }

            > *:last-child > tr:last-child > td:last-child {
              border-bottom-right-radius: $border-radius;
              overflow: hidden;
            }

            > * > tr > * {
              border-right: 1px solid $border-color;
              border-bottom: 1px solid $border-color;
              white-space: nowrap;
              overflow: hidden;
              padding: 0;
              position: relative;

              &._fixed:has(+ :not(._fixed)) + :not(._fixed):not([data-c="0"]) {
                border-left: 1px solid $border-color;
              }

              &._feature-cell {
                background: var(--theme-gray-lightest);
                min-width: calc(var(--font-size-default) + 2px + var(--sheet-ph) * 2);
                padding: var(--sheet-pv) var(--sheet-ph);
                text-align: left;

                > ng-icon {
                  cursor: pointer;
                  color: var(--text-trans-lightest);
                }
              }

              &._fixed {
                position: sticky;
                left: 0;

                &:has(+ :not(._fixed)) {
                  border-right: 1px solid $border-color-dark;
                }
              }
            }

            > thead {
              position: sticky;
              top: 0;
              z-index: $z-index-head;

              > tr > th {
                position: relative;
                background: var(--theme-gray-lightest);
                vertical-align: middle;

                &._fixed {
                  z-index: $z-index-head-fixed;
                }

                &._last-depth {
                  border-bottom: 1px solid $border-color-dark;
                }

                &._feature-cell {
                  border-bottom: 1px solid $border-color-dark;
                }

                &._sort {
                  cursor: pointer;

                  &:hover {
                    text-decoration: underline;
                  }
                }

                > ._headerContent {
                  > ._sort-icon {
                    padding: var(--gap-xs) var(--gap-xs) var(--gap-xs) 0;
                    background-color: var(--theme-gray-lightest);
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

              &:has(> tr._summary-row) {
                > tr > th._last-depth {
                  border-bottom: 1px solid $border-color;
                }

                > tr._summary-row > th {
                  background: var(--theme-warning-lightest);
                  text-align: left;
                  border-bottom: 1px solid $border-color-dark;
                }
              }
            }

            > tbody > tr > td {
              background: var(--control-color);
              vertical-align: top;

              &._fixed {
                z-index: $z-index-fixed;
              }

              > ._depth-indicator {
                display: inline-block;
                margin-top: 0.4em;
                width: 0.5em;
                height: 0.5em;
                border-left: 1px solid var(--text-trans-default);
                border-bottom: 1px solid var(--text-trans-default);
                vertical-align: top;
              }
            }
          }

          > ._focus-row-indicator {
            display: none;
            position: absolute;
            pointer-events: none;
            background: rgba(158, 158, 158, 0.1);
            z-index: $z-index-focus-row-indicator;

            > ._focus-cell-indicator {
              position: absolute;
              border: 2px solid var(--theme-primary-default);
              border-radius: $border-radius;
            }
          }

          > ._resize-indicator {
            display: none;
            position: absolute;
            pointer-events: none;
            top: 0;
            height: 100%;
            border: 1px dotted $border-color-darker;
            z-index: $z-index-resize-indicator;
          }

          > ._select-row-indicator-container {
            display: none;
            position: absolute;
            pointer-events: none;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: $z-index-select-row-indicator;

            > ._select-row-indicator {
              display: block;
              left: 0;
              position: absolute;
              pointer-events: none;
              background: var(--theme-primary-default);
              opacity: 0.1;
            }
          }
        }

        ._p-sheet {
          padding: var(--sheet-pv) var(--sheet-ph);
        }

        &[data-sd-focus-mode="row"] {
          > ._sheet-container > ._focus-row-indicator > ._focus-cell-indicator {
            display: none !important;
          }
        }

        &[data-sd-inset="true"] {
          border: none;
          border-radius: 0;
        }
      }
    `,
  ],
  host: {
    "class": "flex-column fill",
    "[attr.data-sd-inset]": "inset()",
    "[attr.data-sd-focus-mode]": "focusMode()",
    "(keydown.capture)": "onKeydownCapture($event)",
    "(focus.capture)": "onFocusCapture($event)",
    "(dblclick)": "onDblClick($event)",
    "(blur.capture)": "onBlurCapture($event)",
  },
})
export class SdSheet<T> {
  // Inputs
  key = input<string>();
  items = input<T[]>([]);
  trackByFn = input<(item: T, index: number) => unknown>();
  selectMode = input<"single" | "multi">();
  autoSelect = input<"click" | "focus">();
  getItemSelectableFn = input<(item: T) => boolean | string>();
  getChildrenFn = input<(item: T, index: number) => T[] | undefined>();
  useAutoSort = input(false, { transform: booleanAttribute });
  visiblePageCount = input(10);
  totalPageCount = input(0);
  itemsPerPage = input(0);
  focusMode = input<"row" | "cell">("cell");
  inset = input(false, { transform: booleanAttribute });
  contentStyle = input<string>();
  getItemCellClassFn = input<(item: T, colKey: string) => string>();
  getItemCellStyleFn = input<(item: T, colKey: string) => string | undefined>();
  hideConfigBar = input(false, { transform: booleanAttribute });

  // Outputs
  itemKeydown = output<SdSheetItemKeydownEventParam<T>>();
  cellKeydown = output<SdSheetCellKeydownEventParam<T>>();

  // Models
  selectedItems = model<T[]>([]);
  expandedItems = model<T[]>([]);
  sorts = model<SortingDef[]>([]); // Re-exported from useSortingManager
  currentPage = model(0);

  // Content query
  columnControls = contentChildren(SdSheetColumn);

  // Injected providers
  private readonly _sdModal = inject(SdModalProvider);

  // DOM accessor & cell agent
  domAccessor = injectSheetDomAccessor();
  cellAgent = useSheetCellAgent({ domAccessor: this.domAccessor });

  // Config resource
  private readonly _configResource = injectSdSystemConfigResource<SdSheetConfig>({
    key: this.key,
  });

  // Resizing composable
  private readonly _resizing = injectSheetColumnResizing({
    domAccessor: this.domAccessor,
    configResource: this._configResource,
  });
  _isResizing = this._resizing.isResizing;
  _resizeIndicatorLeft = this._resizing.indicatorLeft;
  onResizerMousedown = this._resizing.onMousedown;
  onResizerDblClick = this._resizing.onDblClick;

  // Layout engine
  layout = useSheetLayoutEngine({
    columnControls: this.columnControls,
    config: computed(() => this._configResource.value()),
  });

  // Column fixing
  fixing = useSheetColumnFixing({
    columnDefs: this.layout.columnDefs,
  });

  // Sorting manager
  sorting = useSortingManager({
    sorts: this.sorts,
  });

  // Display pipeline (sort → page → expand → display)
  private readonly _pipeline = useSheetDisplayPipeline<T>({
    items: this.items,
    useAutoSort: this.useAutoSort,
    sortItems: (items) => this.sorting.sort(items),
    itemsPerPage: this.itemsPerPage,
    currentPage: this.currentPage,
    totalPageCount: this.totalPageCount,
    expandedItems: this.expandedItems,
    getChildrenFn: this.getChildrenFn,
  });
  effectivePageCount = this._pipeline.effectivePageCount;
  expanding = this._pipeline.expanding;
  displayItems = this._pipeline.displayItems;

  // Cell styling composable
  private readonly _styling = useSheetCellStyling<T>({
    columnDefs: this.layout.columnDefs,
    fixedLeftMap: this.fixing.fixedLeftMap,
    getItemCellStyleFn: this.getItemCellStyleFn,
    getItemCellClassFn: this.getItemCellClassFn,
    getChildrenFn: this.getChildrenFn,
    expandingDef: (item) => this.expanding.def(item),
    isCellEditMode: (addr) => this.cellAgent.isCellEditMode(addr),
  });
  getHeaderCellStyle = this._styling.getHeaderCellStyle;
  getCellStyle = this._styling.getCellStyle;
  getFixedCellStyle = this._styling.getFixedCellStyle;
  getCellStyleWithIndent = this._styling.getCellStyleWithIndent;
  getDataCellClass = this._styling.getDataCellClass;

  // Focus indicator
  private readonly _focusIndicator = useSheetFocusIndicator({
    domAccessor: this.domAccessor,
  });

  // Select row indicator
  private readonly _selectRowIndicator = injectSheetSelectRowIndicator<T>({
    domAccessor: this.domAccessor,
    selectedItems: this.selectedItems,
    displayItems: this.displayItems,
  });

  // Selection manager
  selection = useSelectionManager<T>({
    displayItems: this.displayItems,
    selectedItems: this.selectedItems,
    selectMode: this.selectMode,
    getItemSelectableFn: this.getItemSelectableFn,
  });

  // Icons
  icons = {
    tablerSettings,
    tablerCaretRight,
    tablerArrowsSort,
    tablerSortAscending,
    tablerSortDescending,
    tablerArrowRight,
  };

  private readonly _columnControlMap = computed(() => {
    const map = new Map<string, SdSheetColumn>();
    for (const col of this.columnControls()) {
      map.set(col.key(), col);
    }
    return map;
  });

  getColumnHeaderTpl(key: string) {
    const col = this._columnControlMap().get(key);
    return col?.headerTplRef() ?? null;
  }

  getColumnCellTpl(key: string) {
    const col = this._columnControlMap().get(key);
    return col?.cellTplRef() ?? null;
  }

  getColumnSummaryTpl(key: string) {
    const col = this._columnControlMap().get(key);
    return col?.summaryTplRef() ?? null;
  }

  getSelectableTooltip(item: T): string | null {
    const result = this.selection.getSelectable(item);
    if (typeof result === "string") return result;
    return null;
  }

  onRowClick(item: T): void {
    if (this.autoSelect() === "click") {
      this.selection.select(item);
    }
  }

  onSelectCheckboxClick(event: Event, item: T): void {
    event.stopPropagation();
    this.selection.toggle(item);
  }

  onCellClick(event: Event, item: T): void {
    if (this.autoSelect() === "click") {
      this.selection.select(item);
    }
  }

  onCellFocus(item: T): void {
    if (this.autoSelect() === "focus") {
      this.selection.select(item);
    }
  }

  onHeaderClick(event: MouseEvent, cell: SdSheetHeaderDef): void {
    if (event.timeStamp - this._resizing.lastResizeEndTimeStamp() < 50) return;
    if (cell.colDef == null) return;
    if (cell.colDef.disableSorting) return;
    this.sorting.toggle(cell.colDef.key, event.shiftKey);
  }

  getSortDef(key: string) {
    return this.sorting.defMap().get(key) ?? null;
  }

  getItemDef(item: T) {
    return this.expanding.def(item);
  }

  // PERF-005: Set-based lookup for O(1) isExpanded check
  private readonly _expandedSet = computed(() => new Set(this.expandedItems()));

  isExpanded(item: T): boolean {
    return this._expandedSet().has(item);
  }

  getAriaExpanded(item: T): string | null {
    if (this.getChildrenFn() == null) return null;
    const def = this.getItemDef(item);
    if (!def.hasChildren) return null;
    return this.isExpanded(item) ? "true" : "false";
  }

  onExpandClick(event: Event, item: T): void {
    event.stopPropagation();
    this.expanding.toggle(item);
  }

  getAriaSortValue(cell: SdSheetHeaderDef): string | null {
    if (cell.colDef == null) return null;
    const sortDef = this.sorting.defMap().get(cell.colDef.key);
    if (sortDef == null) return null;
    return sortDef.desc ? "descending" : "ascending";
  }

  async onKeydownCapture(event: Event): Promise<void> {
    await this.cellAgent.handleKeydownCapture(event as KeyboardEvent);
  }

  onDblClick(event: MouseEvent): void {
    this.cellAgent.handleCellDoubleClick(event);
  }

  onFocusCapture(event: Event): void {
    this._autoScrollOnFocus(event as FocusEvent);
    this._focusIndicator.redraw();
  }

  onBlurCapture(event: Event): void {
    this.cellAgent.handleBlurCapture(event as FocusEvent);
    this._focusIndicator.redraw();
  }

  onContainerScroll(): void {
    this._focusIndicator.redraw();
  }

  onTableResize(event: Event): void {
    if (!(event as unknown as SdResizeEvent).widthChanged) return;
    this._focusIndicator.redraw();
    this._selectRowIndicator.redraw();
  }

  onSelectorMouseDown(event: MouseEvent, r: number): void {
    if (!event.shiftKey) return;
    event.preventDefault();
    event.stopPropagation();

    const focusedEl = document.activeElement;
    if (!(focusedEl instanceof HTMLElement)) return;

    const focusedTrEl =
      focusedEl.tagName.toLowerCase() === "tr" ? focusedEl : focusedEl.closest("tr");
    if (!(focusedTrEl instanceof HTMLTableRowElement)) return;

    const frAttr = focusedTrEl.getAttribute("data-r");
    if (frAttr == null) return;
    const fr = parseInt(frAttr, 10);
    if (Number.isNaN(fr)) return;

    setTimeout(() => {
      const items = this.displayItems();
      const isSelect = this.selection.isSelected(items[fr]);
      for (let i = Math.min(fr, r); i <= Math.max(fr, r); i++) {
        if (isSelect) {
          this.selection.select(items[i]);
        } else {
          this.selection.deselect(items[i]);
        }
      }
    }, 100);

    const row = this.domAccessor.getRow(r);
    row?.querySelector<HTMLElement>("[tabindex]")?.focus();
  }

  private _autoScrollOnFocus(event: FocusEvent): void {
    if (!(event.target instanceof HTMLElement)) return;

    const tdEl =
      event.target.tagName.toLowerCase() === "td"
        ? event.target
        : event.target.closest("td");
    if (!(tdEl instanceof HTMLTableCellElement)) return;
    if (tdEl.classList.contains("_fixed")) return;

    const containerEl = this.domAccessor.getContainer();
    const theadEl = this.domAccessor.getTHead();
    const fixedHeaders = this.domAccessor.getLastDepthFixedHeaders();

    containerEl.scrollIntoViewIfNeeded(
      { top: tdEl.offsetTop, left: tdEl.offsetLeft },
      {
        top: theadEl.offsetHeight,
        left: fixedHeaders.reduce((sum, el) => sum + el.offsetWidth, 0),
      },
    );
  }

  onItemKeydown(event: KeyboardEvent, item: T): void {
    this.itemKeydown.emit({ item, event });
  }

  onCellKeydown(event: KeyboardEvent, item: T, colKey: string): void {
    this.cellKeydown.emit({ item, key: colKey, event });
  }

  async onConfigButtonClick(): Promise<void> {
    const result = await this._sdModal.showAsync({
      title: "시트 설정",
      type: SdSheetConfigModal,
      inputs: {
        sheetKey: this.key()!,
        controls: this.columnControls(),
        config: this._configResource.value(),
      },
    });
    if (result != null) {
      this._configResource.set(result);
    }
  }
}

// Re-export SortingDef from useSortingManager for convenience
export type { SortingDef } from "../../core/selection/useSortingManager";
