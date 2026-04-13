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
  tablerArrowUp,
  tablerArrowDown,
  tablerChevronRight,
  tablerChevronDown,
  tablerChevronsRight,
  tablerChevronsDown,
  tablerSettings,
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
import { injectSdSystemConfigResource } from "../../core/config/injectSdSystemConfigResource";
import { injectSheetDomAccessor } from "./injectSheetDomAccessor";
import { useSheetCellAgent } from "./useSheetCellAgent";
import { injectSheetColumnResizing } from "./injectSheetColumnResizing";
import { useSheetDisplayPipeline } from "./useSheetDisplayPipeline";
import { useSheetCellStyling } from "./useSheetCellStyling";
import { SdModalProvider } from "../../core/modal/sd-modal.provider";
import { SdSheetConfigModal } from "./sd-sheet-config.modal";

@Component({
  selector: "sd-sheet",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [NgTemplateOutlet, SdCheckbox, NgIcon, SdPagination, SdAnchor, SdButton],
  template: `
    @if ((key() || effectivePageCount() > 1) && !hideConfigBar()) {
      <div class="_tool">
        @if (key()) {
          <sd-button (click)="onConfigButtonClick()">
            <ng-icon [svg]="icons.tablerSettings" />
          </sd-button>
        }
        @if (effectivePageCount() > 1) {
          <sd-pagination [(currentPage)]="currentPage" [totalPageCount]="effectivePageCount()" [visiblePageCount]="visiblePageCount()" />
        }
      </div>
    }
    <div class="_container" [style]="contentStyle()">
      <table>
        <thead>
          @for (row of layout.headerDefTable(); track $index; let rowIdx = $index) {
            <tr>
              @if (expanding.hasExpandable() && rowIdx === 0) {
                <th
                  class="_expand-col"
                  [attr.rowspan]="layout.headerFeatureRowSpan() > 1 ? layout.headerFeatureRowSpan() : null"
                >
                  <sd-anchor (click)="expanding.toggleAll()">
                    <ng-icon [svg]="expanding.isAllExpanded() ? icons.tablerChevronsDown : icons.tablerChevronsRight" />
                  </sd-anchor>
                </th>
              }
              @if (selectMode() && rowIdx === 0) {
                <th
                  class="_select-col"
                  [attr.rowspan]="layout.headerFeatureRowSpan() > 1 ? layout.headerFeatureRowSpan() : null"
                >
                  @if (selectMode() === "multi") {
                    <sd-checkbox
                      [value]="selection.isAllSelected()"
                      (click)="selection.toggleAll()"
                      [inline]="true"
                      [inset]="true"
                    />
                  }
                </th>
              }
              @for (cell of row; track $index) {
                <th
                  [attr.colspan]="cell.colspan > 1 ? cell.colspan : null"
                  [attr.rowspan]="cell.rowspan > 1 ? cell.rowspan : null"
                  [attr.aria-sort]="getAriaSortValue(cell)"
                  [style]="getHeaderCellStyle(cell)"
                  (click)="onHeaderClick($event, cell)"
                >
                  <span>{{ cell.text }}</span>
                  @if (cell.colDef && getSortDef(cell.colDef.key); as sortDef) {
                    <ng-icon
                      class="_sort-icon"
                      [svg]="sortDef.desc ? icons.tablerArrowDown : icons.tablerArrowUp"
                    />
                    @if (sortDef.indexText) {
                      <span class="_sort-index">{{ sortDef.indexText }}</span>
                    }
                  }
                  @if (cell.isLastRow && cell.colDef && !cell.colDef.disableResizing) {
                    <div
                      class="_resizer"
                      (mousedown)="onResizerMousedown($event, cell.colDef)"
                      (dblclick)="onResizerDblClick($event, cell.colDef)"
                    ></div>
                  }
                </th>
              }
            </tr>
          }
        </thead>
        <tbody>
          @for (item of displayItems(); track trackByFn() ? trackByFn()!(item, $index) : $index; let rowIdx = $index) {
            <tr
              [attr.aria-selected]="selection.isSelected(item) ? 'true' : null"
              [attr.aria-expanded]="getAriaExpanded(item)"
              [style.background]="selection.isSelected(item) ? 'var(--trans-lighter)' : null"
              (click)="onRowClick(item)"
              (keydown)="onItemKeydown($event, item)"
            >
              @if (expanding.hasExpandable()) {
                <td class="_expand-col">
                  @if (getItemDef(item).hasChildren) {
                    <sd-anchor (click)="onExpandClick($event, item)">
                      <ng-icon [svg]="isExpanded(item) ? icons.tablerChevronDown : icons.tablerChevronRight" />
                    </sd-anchor>
                  }
                </td>
              }
              @if (selectMode()) {
                <td class="_select-col">
                  <sd-checkbox
                    [value]="selection.isSelected(item)"
                    [canChangeFn]="selection.getCanChangeFn(item)"
                    (click)="onSelectCheckboxClick($event, item)"
                    [inline]="true"
                    [inset]="true"
                    [attr.title]="getSelectableTooltip(item)"
                  />
                </td>
              }
              @for (colDef of layout.columnDefs(); track colDef.key; let colIdx = $index) {
                <td
                  [attr.data-r]="rowIdx"
                  [attr.data-c]="colIdx"
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
                        edit: cellAgent.isCellEditMode({ r: rowIdx, c: colIdx })
                      }"
                    />
                  }
                </td>
              }
            </tr>
          }
        </tbody>
        @if (layout.hasSummary()) {
          <tfoot>
            <tr>
              @if (expanding.hasExpandable()) {
                <td class="_expand-col"></td>
              }
              @if (selectMode()) {
                <td class="_select-col"></td>
              }
              @for (colDef of layout.columnDefs(); track colDef.key) {
                <td [style]="getFixedCellStyle(colDef)">
                  @if (getColumnSummaryTpl(colDef.key); as tpl) {
                    <ng-template [ngTemplateOutlet]="tpl" />
                  }
                </td>
              }
            </tr>
          </tfoot>
        }
      </table>
      <div class="_resize-indicator" [style.display]="_isResizing() ? 'block' : 'none'" [style.left.px]="_resizeIndicatorLeft()"></div>
    </div>
  `,
  styles: [
    /* language=SCSS */ `
      sd-sheet {
        display: block;
        position: relative;
        overflow: hidden;
        border: 1px solid var(--trans-lighter);

        &[data-sd-inset="true"] {
          border: none;
        }

        > ._tool {
          display: flex;
          align-items: center;
          gap: var(--gap-sm);
          padding: var(--gap-sm) var(--gap-default);
          border-bottom: 1px solid var(--trans-lighter);
          background: var(--theme-secondary-lightest);
        }

        > ._container {
          overflow: auto;
          width: 100%;
          height: 100%;

          > table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;

            > thead > tr > th {
              position: sticky;
              top: 0;
              z-index: 2;
              background: var(--theme-secondary-lightest);
              border: 1px solid var(--trans-lighter);
              padding: var(--gap-sm) var(--gap-default);
              text-align: left;
              font-weight: bold;
              white-space: nowrap;
              cursor: pointer;
              user-select: none;

              &:not(._select-col):not(._expand-col) {
                position: relative;
              }

              > ._sort-icon {
                font-size: 0.85em;
                vertical-align: middle;
                margin-left: 0.25em;
              }

              > ._sort-index {
                font-size: 0.75em;
                vertical-align: super;
              }

              > ._resizer {
                position: absolute;
                top: 0;
                right: -2px;
                width: 5px;
                height: 100%;
                cursor: col-resize;
                z-index: 3;
              }
            }

            > tbody > tr > td {
              border: 1px solid var(--trans-lighter);
              padding: var(--gap-sm) var(--gap-default);
              white-space: nowrap;

              &:focus {
                outline: 2px solid var(--theme-primary-default);
                outline-offset: -2px;
              }
            }

            > thead > tr > th._select-col,
            > tbody > tr > td._select-col {
              width: 2em;
              min-width: 2em;
              max-width: 2em;
              text-align: center;
              padding: 0;
            }

            > thead > tr > th._expand-col,
            > tbody > tr > td._expand-col {
              width: 2em;
              min-width: 2em;
              max-width: 2em;
              text-align: center;
              padding: 0;
            }

            > tfoot > tr > td {
              position: sticky;
              bottom: 0;
              z-index: 2;
              background: var(--theme-secondary-lightest);
              border: 1px solid var(--trans-lighter);
              padding: var(--gap-sm) var(--gap-default);
            }
          }

          > ._resize-indicator {
            position: absolute;
            top: 0;
            width: 2px;
            height: 100%;
            background: var(--theme-primary-default);
            z-index: 10;
            pointer-events: none;
          }
        }
      }
    `,
  ],
  host: {
    "[attr.data-sd-inset]": "inset()",
    "(keydown.capture)": "onKeydownCapture($event)",
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

  // Selection manager
  selection = useSelectionManager<T>({
    displayItems: this.displayItems,
    selectedItems: this.selectedItems,
    selectMode: this.selectMode,
    getItemSelectableFn: this.getItemSelectableFn,
  });

  // Icons
  icons = {
    tablerArrowUp,
    tablerArrowDown,
    tablerChevronRight,
    tablerChevronDown,
    tablerChevronsRight,
    tablerChevronsDown,
    tablerSettings,
  };

  private readonly _columnControlMap = computed(() => {
    const map = new Map<string, SdSheetColumn>();
    for (const col of this.columnControls()) {
      map.set(col.key(), col);
    }
    return map;
  });

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

  onBlurCapture(event: Event): void {
    this.cellAgent.handleBlurCapture(event as FocusEvent);
  }

  onItemKeydown(event: KeyboardEvent, item: T): void {
    this.itemKeydown.emit({ item, event });
  }

  onCellKeydown(event: KeyboardEvent, item: T, colKey: string): void {
    this.cellKeydown.emit({ item, key: colKey, event });
  }

  async onConfigButtonClick(): Promise<void> {
    const result = await this._sdModal.showAsync(
      {
        title: "시트 설정",
        type: SdSheetConfigModal,
        inputs: {
          controls: this.columnControls(),
          config: this._configResource.value(),
        },
      },
    );
    if (result != null) {
      this._configResource.set(result);
    }
  }

}

// Re-export SortingDef from useSortingManager for convenience
export type { SortingDef } from "../../core/selection/useSortingManager";
