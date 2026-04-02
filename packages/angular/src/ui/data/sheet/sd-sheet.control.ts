import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  DestroyRef,
  inject,
  input,
  model,
  output,
  signal,
  ViewEncapsulation,
} from "@angular/core";
import { NgTemplateOutlet } from "@angular/common";
import { SdSheetColumnDirective } from "./sd-sheet-column.directive";
import { SdCheckboxControl } from "../../form/checkbox/sd-checkbox.control";
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
import { useSelectionManager } from "../../../core/utils/useSelectionManager";
import { useSortingManager, type ISortingDef } from "../../../core/utils/useSortingManager";
import { useExpandingManager } from "../../../core/utils/useExpandingManager";
import { SdPaginationControl } from "../../navigation/pagination/sd-pagination.control";
import { SdAnchorControl } from "../../form/button/sd-anchor.control";
import { SdButtonControl } from "../../form/button/sd-button.control";
import type {
  ISdSheetColumnDef,
  ISdSheetCellKeydownEventParam,
  ISdSheetConfig,
  ISdSheetHeaderDef,
  ISdSheetItemKeydownEventParam,
} from "./types";
import { useSdSystemConfigResource } from "../../../core/utils/useSdSystemConfigResource";
import { useSheetDomAccessor } from "./useSheetDomAccessor";
import { useSheetCellAgent } from "./useSheetCellAgent";
import { SdModalProvider } from "../../overlay/modal/sd-modal.provider";
import { SdSheetConfigModal } from "./sd-sheet-config.modal";

@Component({
  selector: "sd-sheet",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [NgTemplateOutlet, SdCheckboxControl, NgIcon, SdPaginationControl, SdAnchorControl, SdButtonControl],
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
export class SdSheetControl<T> {
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
  itemKeydown = output<ISdSheetItemKeydownEventParam<T>>();
  cellKeydown = output<ISdSheetCellKeydownEventParam<T>>();

  // Models
  selectedItems = model<T[]>([]);
  expandedItems = model<T[]>([]);
  sorts = model<ISortingDef[]>([]); // Re-exported from useSortingManager
  currentPage = model(0);

  // Content query
  columnControls = contentChildren(SdSheetColumnDirective);

  // Injected providers
  private readonly _modalProvider = inject(SdModalProvider);
  private readonly _destroyRef = inject(DestroyRef);

  // DOM accessor & cell agent
  domAccessor = useSheetDomAccessor();
  cellAgent = useSheetCellAgent({ domAccessor: this.domAccessor });

  constructor() {
    this._destroyRef.onDestroy(() => {
      this._resizingCleanup?.();
    });
  }

  // Resizing state
  _isResizing = signal(false);
  _resizeIndicatorLeft = signal(0);
  private _lastResizeEndTimeStamp = 0;
  private _resizingCleanup: (() => void) | null = null;

  // Config resource
  private readonly _configResource = useSdSystemConfigResource<ISdSheetConfig>({
    key: this.key,
  });

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

  // Effective page count (from totalPageCount or computed from items/itemsPerPage)
  effectivePageCount = computed(() => {
    const total = this.totalPageCount();
    if (total > 0) return total;
    const perPage = this.itemsPerPage();
    if (perPage <= 0) return 0;
    return Math.ceil(this.items().length / perPage);
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

  // Sorted items
  private readonly _sortedItems = computed(() => {
    const items = this.items();
    if (this.useAutoSort()) {
      return this.sorting.sort(items);
    }
    return items;
  });

  // Paged items (root-level only)
  private readonly _pagedItems = computed(() => {
    const items = this._sortedItems();
    const perPage = this.itemsPerPage();
    if (perPage <= 0) return items;
    const page = this.currentPage();
    const start = page * perPage;
    return items.slice(start, start + perPage);
  });

  // Expanding manager
  expanding = useExpandingManager<T>({
    items: this._pagedItems,
    expandedItems: this.expandedItems,
    getChildrenFn: this.getChildrenFn,
    sort: (items) => {
      if (this.useAutoSort()) {
        return this.sorting.sort(items);
      }
      return items;
    },
  });

  // Final display items (sorted → paged → expanded)
  displayItems = computed(() => {
    const getChildrenFn = this.getChildrenFn();
    if (getChildrenFn != null) {
      // With tree: only show visible items (parent expanded)
      return this.expanding.displayItems().filter((item) => this.expanding.isVisible(item));
    }
    return this._pagedItems();
  });

  // Selection manager
  selection = useSelectionManager<T>({
    displayItems: this.displayItems,
    selectedItems: this.selectedItems,
    selectMode: this.selectMode,
    getItemSelectableFn: this.getItemSelectableFn,
  });

  private readonly _columnControlMap = computed(() => {
    const map = new Map<string, SdSheetColumnDirective>();
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

  // Pre-computed column styles: header/footer (fixed z-index:3)
  private readonly _headerColumnStyles = computed(() => {
    const map = new Map<string, string | null>();
    for (const colDef of this.layout.columnDefs()) {
      const parts: string[] = [];
      const colStyle = this._getColDefStyle(colDef);
      if (colStyle != null) parts.push(colStyle);
      const fixedStyle = this._getFixedStyle(colDef, 3, "var(--theme-secondary-lightest)");
      if (fixedStyle != null) parts.push(fixedStyle);
      map.set(colDef.key, parts.length > 0 ? parts.join("; ") : null);
    }
    return map;
  });

  // Pre-computed column styles: body (fixed z-index:1)
  private readonly _dataColumnBaseStyles = computed(() => {
    const map = new Map<string, string | null>();
    for (const colDef of this.layout.columnDefs()) {
      const parts: string[] = [];
      const colStyle = this._getColDefStyle(colDef);
      if (colStyle != null) parts.push(colStyle);
      const fixedStyle = this._getFixedStyle(colDef);
      if (fixedStyle != null) parts.push(fixedStyle);
      map.set(colDef.key, parts.length > 0 ? parts.join("; ") : null);
    }
    return map;
  });

  getHeaderCellStyle(cell: ISdSheetHeaderDef) {
    if (cell.colDef == null) return null;
    return this._headerColumnStyles().get(cell.colDef.key) ?? null;
  }

  getCellStyle(item: T, colDef: ISdSheetColumnDef) {
    const baseStyle = this._dataColumnBaseStyles().get(colDef.key) ?? null;
    const styleFn = this.getItemCellStyleFn();
    const customStyle = styleFn != null ? styleFn(item, colDef.key) : undefined;
    if (baseStyle != null && customStyle != null) return `${baseStyle}; ${customStyle}`;
    return customStyle ?? baseStyle ?? null;
  }

  getFixedCellStyle(colDef: ISdSheetColumnDef) {
    return this._getFixedStyle(colDef, 3);
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

  onHeaderClick(event: MouseEvent, cell: ISdSheetHeaderDef): void {
    if (event.timeStamp - this._lastResizeEndTimeStamp < 50) return;
    if (cell.colDef == null) return;
    if (cell.colDef.disableSorting) return;
    this.sorting.toggle(cell.colDef.key, event.shiftKey);
  }

  getSortDef(key: string) {
    return this.sorting.defMap().get(key) ?? null;
  }

  getCellStyleWithIndent(item: T, colDef: ISdSheetColumnDef, colIdx: number) {
    const parts: string[] = [];
    const cellStyle = this.getCellStyle(item, colDef);
    if (cellStyle != null) {
      parts.push(cellStyle);
    }
    // Add indent for tree depth on first data column
    if (colIdx === 0 && this.getChildrenFn() != null) {
      const itemDef = this.getItemDef(item);
      if (itemDef.depth > 0) {
        parts.push(`padding-left: calc(var(--gap-default) + ${itemDef.depth}em)`);
      }
    }
    return parts.length > 0 ? parts.join("; ") : null;
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

  getAriaSortValue(cell: ISdSheetHeaderDef): string | null {
    if (cell.colDef == null) return null;
    const sortDef = this.sorting.defMap().get(cell.colDef.key);
    if (sortDef == null) return null;
    return sortDef.desc ? "descending" : "ascending";
  }

  private _getColDefStyle(colDef: { width: string | undefined; collapse: boolean }): string | null {
    if (colDef.collapse) {
      return "padding: 0; width: 0; min-width: 0; max-width: 0; overflow: hidden; border: none";
    }
    if (colDef.width != null) {
      return `width: ${colDef.width}; min-width: ${colDef.width}; max-width: ${colDef.width}`;
    }
    return null;
  }

  private _getFixedStyle(
    colDef: ISdSheetColumnDef,
    zIndex: number = 1,
    background: string = "var(--control-color)",
  ): string | null {
    const fixedLeftMap = this.fixing.fixedLeftMap();
    const leftValue = fixedLeftMap.get(colDef.key);
    if (leftValue == null) return null;

    return `position: sticky; left: ${leftValue}px; z-index: ${zIndex}; background: ${background}`;
  }

  getDataCellClass(item: T, colDef: ISdSheetColumnDef, r: number, c: number): string | null {
    const parts: string[] = [];
    const classFn = this.getItemCellClassFn();
    const customClass = classFn != null ? classFn(item, colDef.key) : undefined;
    if (customClass != null) {
      parts.push(customClass);
    }
    if (this.cellAgent.isCellEditMode({ r, c })) {
      parts.push("_edit-mode");
    }
    return parts.length > 0 ? parts.join(" ") : null;
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
    const result = await this._modalProvider.showAsync(
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

  // --- Resizing ---

  onResizerMousedown(event: MouseEvent, colDef: ISdSheetColumnDef): void {
    event.preventDefault();
    event.stopPropagation();

    const container = this.domAccessor.getContainer();
    const startX = event.clientX;
    const th = (event.target as HTMLElement).parentElement as HTMLElement;
    const startWidth = th.offsetWidth;

    this._isResizing.set(true);
    this._resizeIndicatorLeft.set(
      th.offsetLeft + th.offsetWidth - container.scrollLeft,
    );

    const onMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(startWidth + deltaX, 5);
      this._resizeIndicatorLeft.set(
        th.offsetLeft + newWidth - container.scrollLeft,
      );
    };

    const onMouseUp = (e: MouseEvent) => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      this._resizingCleanup = null;

      const deltaX = e.clientX - startX;
      const newWidth = Math.max(startWidth + deltaX, 5);

      this._isResizing.set(false);
      this._saveColumnConfig(colDef.key, { width: `${newWidth}px` });

      this._lastResizeEndTimeStamp = e.timeStamp;
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    this._resizingCleanup = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }

  onResizerDblClick(event: MouseEvent, colDef: ISdSheetColumnDef): void {
    event.preventDefault();
    event.stopPropagation();

    // Remove the width from config to reset to column definition default
    const current = this._configResource.value() ?? { columnRecord: {} };
    const columnRecord = { ...current.columnRecord };
    const colConfig = { ...columnRecord[colDef.key] };
    delete colConfig.width;
    columnRecord[colDef.key] = colConfig;
    this._configResource.set({ ...current, columnRecord });
  }

  private _saveColumnConfig(
    colKey: string,
    changes: Partial<ISdSheetConfig["columnRecord"][string]>,
  ): void {
    const current = this._configResource.value() ?? { columnRecord: {} };
    const columnRecord = { ...current.columnRecord };
    columnRecord[colKey] = { ...columnRecord[colKey], ...changes };
    this._configResource.set({ ...current, columnRecord });
  }
}

// Re-export ISortingDef from useSortingManager for convenience
export type { ISortingDef } from "../../../core/utils/useSortingManager";
