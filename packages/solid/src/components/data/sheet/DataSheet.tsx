import {
  createMemo,
  createSignal,
  For,
  type JSX,
  Show,
  splitProps,
  useContext,
} from "solid-js";
import { createResizeObserver } from "@solid-primitives/resize-observer";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import {
  IconChevronDown,
  IconChevronRight,
  IconGripVertical,
  IconSettings,
} from "@tabler/icons-solidjs";
import "@simplysm/core-browser";
import type {
  DataSheetCellContext,
  DataSheetColumnDef,
  DataSheetConfig,
  DataSheetConfigColumnInfo,
  DataSheetProps,
  FlatItem,
} from "./DataSheet.types";
import { DataSheetColumn, createColumnSlotsAccessor } from "./DataSheetColumn";
import { buildHeaderTable, normalizeHeader } from "./DataSheet.utils";
import { startPointerDrag } from "../../../helpers/startPointerDrag";
import { Icon } from "../../display/Icon";
import { Checkbox } from "../../form-control/checkbox/Checkbox";
import { Pagination } from "../Pagination";
import { useSyncConfig } from "../../../hooks/useSyncConfig";
import { DialogContext } from "../../disclosure/Dialog";
import { useI18n } from "../../../providers/i18n/I18nProvider";
import {
  configButtonClass,
  defaultContainerClass,
  expandIndentGuideClass,
  expandIndentGuideLineClass,
  expandToggleClass,
  featureCellBodyClickableClass,
  featureCellBodyWrapperClass,
  featureCellClickableClass,
  featureCellWrapperClass,
  featureTdClass,
  featureThClass,
  fixedClass,
  fixedLastClass,
  insetContainerClass,
  insetTableClass,
  reorderCellWrapperClass,
  reorderHandleClass,
  reorderIndicatorClass,
  resizeIndicatorClass,
  resizerClass,
  selectSingleClass,
  selectSingleSelectedClass,
  selectSingleUnselectedClass,
  dataSheetContainerClass,
  sortableThClass,
  sortIconClass,
  summaryThClass,
  tableClass,
  tdClass,
  thClass,
  thContentClass,
  toolbarClass,
  trRowClass,
} from "./DataSheet.styles";
import { createDataSheetSorting } from "./hooks/createDataSheetSorting";
import { createDataSheetPaging } from "./hooks/createDataSheetPaging";
import { createDataSheetExpansion } from "./hooks/createDataSheetExpansion";
import { createDataSheetSelection } from "./hooks/createDataSheetSelection";
import { createDataSheetReorder } from "./hooks/createDataSheetReorder";
import { createDataSheetFixedColumns } from "./hooks/createDataSheetFixedColumns";
import { createDataSheetHeaderCell } from "./hooks/createDataSheetHeaderCell";


const DataSheetInner = <TItem,>(props: DataSheetProps<TItem>) => {
  const [local] = splitProps(props, [
    "items",
    "storageKey",
    "hideConfigBar",
    "inset",
    "contentStyle",
    "sorts",
    "onSortsChange",
    "autoSort",
    "page",
    "onPageChange",
    "totalPageCount",
    "pageSize",
    "displayPageCount",
    "expandedItems",
    "onExpandedItemsChange",
    "itemChildren",
    "selectionMode",
    "selection",
    "onSelectionChange",
    "autoSelect",
    "isItemSelectable",
    "cellClass",
    "cellStyle",
    "onItemsReorder",
    "class",
    "children",
  ]);

  const dialog = useContext(DialogContext);
  const i18n = useI18n();

  // #region Column Collection
  const [rawColumns, ColumnsProvider] = createColumnSlotsAccessor();
  const columnDefs = createMemo(
    () =>
      rawColumns().map(
        (col): DataSheetColumnDef<TItem> => ({
          key: col.key,
          header: normalizeHeader(col.header),
          headerContent: col.headerContent,
          headerStyle: col.headerStyle,
          summary: col.summary,
          tooltip: col.tooltip,
          cell: col.children as (ctx: DataSheetCellContext<TItem>) => JSX.Element,
          class: col.class,
          fixed: col.fixed ?? false,
          hidden: col.hidden ?? false,
          collapse: col.collapse ?? false,
          width: col.width,
          sortable: col.sortable ?? true,
          resizable: col.resizable ?? true,
        }),
      ),
  );

  // #region Config (useSyncConfig)
  const [config, setConfig] =
    local.storageKey != null && local.storageKey !== ""
      ? useSyncConfig<DataSheetConfig>(`sheet.${local.storageKey}`, { columnRecord: {} })
      : createSignal<DataSheetConfig>({ columnRecord: {} });

  // Final columns with config applied — config's hidden/fixed/width/displayOrder overrides are applied
  const effectiveColumns = createMemo(() => {
    const cols = columnDefs();
    const record = config().columnRecord ?? {};

    return cols
      .filter((col) => {
        // If config override exists, use config priority, otherwise use original col.hidden
        const saved = record[col.key];
        const isHidden = saved?.hidden ?? col.hidden;
        return !isHidden;
      })
      .map((col) => {
        const saved = record[col.key];
        if (saved == null) return col;
        return {
          ...col,
          fixed: saved.fixed ?? col.fixed,
          width: saved.width ?? col.width,
        };
      })
      .sort((a, b) => {
        const orderA = record[a.key]?.displayOrder ?? Infinity;
        const orderB = record[b.key]?.displayOrder ?? Infinity;
        return orderA - orderB;
      });
  });

  function saveColumnWidth(colKey: string, width: string | undefined): void {
    const prev = config();
    const record = { ...prev.columnRecord };
    record[colKey] = { ...record[colKey], width };
    setConfig({ ...prev, columnRecord: record });
  }

  async function openConfigDialog(): Promise<void> {
    if (!dialog) return;

    const { DataSheetConfigDialog: ConfigDialog } = await import("./DataSheetConfigDialog");

    const allCols = columnDefs();

    const columnInfos: DataSheetConfigColumnInfo[] = allCols
      .filter((col) => !col.collapse)
      .map((col) => ({
        key: col.key,
        header: col.header,
        fixed: col.fixed,
        hidden: col.hidden,
        collapse: col.collapse,
        width: col.width,
      }));

    const currentConfig = config();

    const result = await dialog.show(
      ConfigDialog,
      { columnInfos, currentConfig },
      {
        header: "Sheet Settings",
        closeOnInteractOutside: true,
        closeOnEscape: true,
      },
    );

    if (result) {
      setConfig(result);
    }
  }

  // #region Header
  const headerTable = createMemo(() => buildHeaderTable(effectiveColumns()));
  const hasSummary = createMemo(() => effectiveColumns().some((col) => col.summary != null));

  // #region Sorting
  const {
    sorts,
    toggleSort,
    sortIndex: sortIndex,
    sortedItems,
  } = createDataSheetSorting<TItem>({
    sorts: () => local.sorts,
    onSortsChange: () => local.onSortsChange,
    items: () => local.items,
    autoSort: () => local.autoSort,
  });

  function getSortDef(key: string) {
    return sorts().find((s) => s.key === key);
  }

  // #region Paging
  const { currentPage, setCurrentPage, pageCount, pagedItems } = createDataSheetPaging<TItem>({
    page: () => local.page,
    onPageChange: () => local.onPageChange,
    pageSize: () => local.pageSize,
    totalPageCount: () => local.totalPageCount,
    items: () => local.items,
    sortedItems,
  });

  const originalIndexMap = createMemo(() => {
    const map = new Map<TItem, number>();
    (local.items ?? []).forEach((item, i) => map.set(item, i));
    return map;
  });

  // #region Fixed Columns
  const {
    hasExpandFeature,
    hasSelectFeature,
    hasReorderFeature,
    registerExpandColRef,
    registerSelectColRef,
    registerReorderColRef,
    selectColLeft,
    reorderColLeft,
    getFixedStyle,
    isLastFixed,
    registerColumnRef,
  } = createDataSheetFixedColumns<TItem>(
    {
      get itemChildren() { return local.itemChildren; },
      get selectionMode() { return local.selectionMode; },
      get onItemsReorder() { return local.onItemsReorder; },
    },
    effectiveColumns,
  );

  // #region Resizing
  const [resizeIndicatorStyle, setResizeIndicatorStyle] = createSignal<JSX.CSSProperties>({
    display: "none",
  });

  function onResizerPointerdown(event: PointerEvent, colKey: string): void {
    event.preventDefault();
    const target = event.target as HTMLElement;

    const th = target.closest("th")!;
    const container = th
      .closest("[data-sheet]")!
      .querySelector("[data-sheet-scroll]") as HTMLElement;
    const startX = event.clientX;
    const startWidth = th.offsetWidth;

    // Show resize indicator
    const containerRect = container.getBoundingClientRect();
    setResizeIndicatorStyle({
      display: "block",
      left: `${th.getBoundingClientRect().right - containerRect.left + container.scrollLeft}px`,
      top: "0",
      height: `${container.scrollHeight}px`,
    });

    startPointerDrag(target, event.pointerId, {
      onMove(e) {
        const delta = e.clientX - startX;
        const newWidth = Math.max(30, startWidth + delta);
        const currentRect = container.getBoundingClientRect();
        setResizeIndicatorStyle({
          display: "block",
          left: `${th.getBoundingClientRect().left - currentRect.left + container.scrollLeft + newWidth}px`,
          top: "0",
          height: `${container.scrollHeight}px`,
        });
      },
      onEnd(e) {
        const delta = e.clientX - startX;
        // Only save width if actual drag occurred (prevent dblclick DOM recreation from losing dblclick)
        if (delta !== 0) {
          const newWidth = Math.max(30, startWidth + delta);
          saveColumnWidth(colKey, `${newWidth}px`);
        }
        setResizeIndicatorStyle({ display: "none" });
      },
    });
  }

  function onResizerDoubleClick(colKey: string): void {
    saveColumnWidth(colKey, undefined);
  }

  // #region HeaderSticky
  // Track header row heights to calculate cumulative top values
  const [headerRowHeights, setHeaderRowHeights] = createSignal<number[]>([]);

  function registerHeaderRow(rowIndex: number, el: HTMLElement): void {
    createResizeObserver(el, (rect) => {
      setHeaderRowHeights((prev) => {
        const next = [...prev];
        next[rowIndex] = rect.height;
        return next;
      });
    });
  }

  // Cumulative top value for each header row
  const headerRowTops = createMemo(() => {
    const heights = headerRowHeights();
    const tops: number[] = [];
    let acc = 0;
    for (let i = 0; i < heights.length; i++) {
      tops.push(acc);
      acc += heights[i] ?? 0;
    }
    return tops;
  });

  // Top value of summary row (sum of all header row heights)
  const summaryRowTop = createMemo(() => {
    const heights = headerRowHeights();
    return heights.reduce((sum, h) => sum + h, 0);
  });

  // #region Expanding
  const { expandedItems, flatItems, toggleExpand, isAllExpanded, toggleExpandAll } =
    createDataSheetExpansion<TItem>(
      {
        get expandedItems() { return local.expandedItems; },
        get onExpandedItemsChange() { return local.onExpandedItemsChange; },
        get itemChildren() { return local.itemChildren; },
      },
      pagedItems,
      originalIndexMap,
    );

  // #region Display
  const displayItems = flatItems;

  // #region Selection
  const {
    selection,
    setSelection,
    getItemSelectable,
    toggleSelect,
    toggleSelectAll,
    rangeSelect,
    lastClickedRow,
    setLastClickedRow,
  } = createDataSheetSelection<TItem>(
    {
      get selectionMode() { return local.selectionMode; },
      get selection() { return local.selection; },
      get onSelectionChange() { return local.onSelectionChange; },
      get isItemSelectable() { return local.isItemSelectable; },
    },
    displayItems,
  );

  // #region AutoSelect
  function selectItem(item: TItem): void {
    if (getItemSelectable(item) !== true) return;
    if (local.selectionMode === "single") {
      setSelection([item]);
    } else {
      if (!selection().includes(item)) {
        setSelection([...selection(), item]);
      }
    }
  }

  // #region Reorder
  const { dragState, onReorderPointerDown } = createDataSheetReorder<TItem>(
    {
      get onItemsReorder() { return local.onItemsReorder; },
      get itemChildren() { return local.itemChildren; },
    },
    displayItems,
  );

  // #region Keyboard Navigation (move rows with Enter/Shift+Enter)
  function onTableKeyDown(e: KeyboardEvent): void {
    if (e.key !== "Enter" || e.altKey || e.ctrlKey || e.metaKey) return;

    const focused = document.activeElement;
    if (!(focused instanceof HTMLElement)) return;

    const td = focused.closest("td");
    if (!td) return;

    const tr = td.closest("tr");
    if (!tr) return;

    const tbody = tr.closest("tbody");
    if (!tbody) return;

    const rows = tbody.rows;
    const rowIndex = Array.from(rows).indexOf(tr);
    if (rowIndex < 0) return;

    const cellIndex = Array.from(tr.cells).indexOf(td);
    if (cellIndex < 0) return;

    const targetRowIndex = e.shiftKey ? rowIndex - 1 : rowIndex + 1;
    if (targetRowIndex < 0 || targetRowIndex >= rows.length) return;

    const targetFocusable = rows[targetRowIndex].cells[cellIndex].findFirstFocusableChild();
    if (!targetFocusable) return;

    e.preventDefault();
    targetFocusable.focus();
  }

  // Is expand feature column "last fixed" (no regular fixed columns and no select feature)
  const isExpandColLastFixed = () =>
    hasExpandFeature() && !hasSelectFeature() && !hasReorderFeature() && isLastFixed(-1);

  // Is select feature column "last fixed" (no regular fixed columns and select is rightmost feature)
  const isSelectColLastFixed = () =>
    hasSelectFeature() && !hasReorderFeature() && isLastFixed(-1);

  const isReorderColLastFixed = () => hasReorderFeature() && isLastFixed(-1);

  // Total header row count + summary row count (used for feature column rowspan)
  const featureHeaderRowspan = createMemo(() => {
    const headerRows = headerTable().length;
    const summaryRow = hasSummary() ? 1 : 0;
    return headerRows + summaryRow;
  });

  // suppress unused variable warning — dragState is used for side effects (DOM mutation in hook)
  void dragState;

  // #region Sub-render functions

  const { renderHeaderCell } = createDataSheetHeaderCell({
    effectiveColumns,
    headerRowTops,
    getFixedStyle,
    isLastFixed,
    registerColumnRef,
    toggleSort,
    getSortDef,
    sortIndex,
    onResizerPointerdown,
    onResizerDoubleClick,
    thClass,
    fixedClass,
    sortableThClass,
    fixedLastClass,
    thContentClass,
    resizerClass,
    sortIconClass,
  });

  function renderExpandCell(flatItem: FlatItem<TItem>): JSX.Element {
    return (
      <td
        class={twMerge(
          featureTdClass,
          fixedClass,
          "z-[2]",
          isExpandColLastFixed() ? fixedLastClass : undefined,
        )}
        style={{ left: "0" }}
      >
        <div class={featureCellBodyWrapperClass}>
          <For each={Array.from({ length: flatItem.depth })}>
            {() => (
              <div class={expandIndentGuideClass}>
                <div class={expandIndentGuideLineClass} />
              </div>
            )}
          </For>
          <Show when={flatItem.hasChildren}>
            <button
              type="button"
              class={expandToggleClass}
              onClick={() => toggleExpand(flatItem.item)}
            >
              <Icon
                icon={IconChevronDown}
                size="1em"
                class={clsx(
                  "transition-transform",
                  expandedItems().includes(flatItem.item) ? "rotate-0" : "-rotate-90",
                )}
              />
            </button>
          </Show>
        </div>
      </td>
    );
  }

  function renderSelectCell(flatItem: FlatItem<TItem>): JSX.Element {
    const selectable = () => getItemSelectable(flatItem.item);
    const isSelected = () => selection().includes(flatItem.item);
    const rowIndex = () => flatItem.row;

    return (
      <td
        class={twMerge(
          featureTdClass,
          fixedClass,
          "z-[2]",
          isSelectColLastFixed() ? fixedLastClass : undefined,
        )}
        style={{
          left: selectColLeft(),
        }}
      >
        <Show
          when={local.selectionMode === "multiple"}
          fallback={
            /* single mode */
            <Show when={selectable() === true}>
              <div
                class={featureCellBodyClickableClass}
                onClick={() => toggleSelect(flatItem.item)}
              >
                <div
                  class={twMerge(
                    selectSingleClass,
                    isSelected()
                      ? selectSingleSelectedClass
                      : selectSingleUnselectedClass,
                  )}
                >
                  <Icon icon={IconChevronRight} size="1em" />
                </div>
              </div>
            </Show>
          }
        >
          {/* multi mode */}
          <div
            class={featureCellBodyClickableClass}
            onClick={(e) => {
              if (e.shiftKey) {
                rangeSelect(rowIndex());
              } else {
                toggleSelect(flatItem.item);
              }
              setLastClickedRow(rowIndex());
            }}
            title={
              typeof selectable() === "string"
                ? (selectable() as string)
                : undefined
            }
          >
            <Checkbox
              value={isSelected()}
              disabled={selectable() !== true}
              inset
              class={twMerge(
                "pointer-events-none",
                lastClickedRow() === rowIndex()
                  ? "[&>div]:ring-2 [&>div]:ring-primary-200 dark:[&>div]:ring-primary-700"
                  : undefined,
              )}
            />
          </div>
        </Show>
      </td>
    );
  }

  function renderReorderCell(flatItem: FlatItem<TItem>): JSX.Element {
    return (
      <td
        class={twMerge(
          featureTdClass,
          fixedClass,
          "z-[2]",
          isReorderColLastFixed() ? fixedLastClass : undefined,
        )}
        style={{
          left: reorderColLeft(),
        }}
      >
        <div
          class={reorderCellWrapperClass}
          onPointerDown={(e) => onReorderPointerDown(e, flatItem.item)}
        >
          <div class={reorderHandleClass}>
            <Icon icon={IconGripVertical} size="1em" />
          </div>
        </div>
      </td>
    );
  }

  function renderSummaryRow(): JSX.Element {
    return (
      <Show when={hasSummary()}>
        <tr>
          {/* Expand feature column summary cell already covered by rowspan, skip */}
          <For each={effectiveColumns()}>
            {(col, colIndex) => {
              const summaryStyle = (): string | undefined => {
                const parts: string[] = [];
                parts.push(`top: ${summaryRowTop()}px`);
                const left = getFixedStyle(colIndex());
                if (left != null) parts.push(left);
                return parts.join("; ");
              };

              return (
                <th
                  class={twMerge(
                    thClass,
                    summaryThClass,
                    fixedClass,
                    col.fixed ? "z-[5]" : "z-[3]",
                    isLastFixed(colIndex()) ? fixedLastClass : undefined,
                  )}
                  style={summaryStyle()}
                >
                  <div class={thContentClass}>{col.summary?.()}</div>
                </th>
              );
            }}
          </For>
        </tr>
      </Show>
    );
  }

  // #endregion

  return (
    <ColumnsProvider>
      {local.children}
    <div
      data-sheet={local.storageKey ?? ""}
      class={twMerge(
        "flex flex-col",
        local.inset ? insetContainerClass : defaultContainerClass,
        local.class,
      )}
    >
      <Show when={!local.hideConfigBar && (dialog != null || pageCount() > 1)}>
        <div class={toolbarClass}>
          <Show when={pageCount() > 1}>
            <Pagination
              page={currentPage()}
              onPageChange={setCurrentPage}
              totalPageCount={pageCount()}
              displayPageCount={local.displayPageCount}
              size="sm"
            />
          </Show>
          <div class="flex-1" />
          <Show when={dialog != null}>
            <button
              class={configButtonClass}
              onClick={openConfigDialog}
              title="Sheet Settings"
              type="button"
            >
              <Icon icon={IconSettings} size="1em" />
            </button>
          </Show>
        </div>
      </Show>
      <div
        data-sheet-scroll
        class={twMerge(dataSheetContainerClass, "flex-1 min-h-0")}
        style={local.contentStyle}
      >
        <table
          class={twMerge(tableClass, local.inset ? insetTableClass : undefined)}
          onKeyDown={onTableKeyDown}
          onPointerDown={(e) => {
            if (e.shiftKey && hasSelectFeature()) {
              e.preventDefault();
            }
          }}
        >
          <colgroup>
            <Show when={hasExpandFeature()}>
              <col />
            </Show>
            <Show when={hasSelectFeature()}>
              <col />
            </Show>
            <Show when={hasReorderFeature()}>
              <col />
            </Show>
            <For each={effectiveColumns()}>
              {(col) => <col style={col.width != null ? { width: col.width.replace(/;/g, "") } : undefined} />}
            </For>
          </colgroup>
          <thead>
            <For each={headerTable()}>
              {(row, rowIndex) => (
                <tr ref={(el: HTMLElement) => registerHeaderRow(rowIndex(), el)}>
                  {/* Expand feature column header — show only in first row (cover all with rowspan) */}
                  <Show when={hasExpandFeature() && rowIndex() === 0}>
                    <th
                      class={twMerge(
                        featureThClass,
                        fixedClass,
                        "z-[5]",
                        isExpandColLastFixed() ? fixedLastClass : undefined,
                      )}
                      rowspan={featureHeaderRowspan()}
                      style={{ top: "0", left: "0" }}
                      ref={registerExpandColRef}
                    >
                      <div class={featureCellWrapperClass}>
                        <button
                          type="button"
                          class={expandToggleClass}
                          onClick={toggleExpandAll}
                          title={isAllExpanded()
                            ? i18n.t("dataSheet.collapseAll")
                            : i18n.t("dataSheet.expandAll")}
                        >
                          <Icon
                            icon={IconChevronDown}
                            size="1em"
                            class={clsx(
                              "transition-transform",
                              isAllExpanded() ? "rotate-0" : "-rotate-90",
                            )}
                          />
                        </button>
                      </div>
                    </th>
                  </Show>
                  {/* Select feature column header — show only in first row (cover all with rowspan) */}
                  <Show when={hasSelectFeature() && rowIndex() === 0}>
                    <th
                      class={twMerge(
                        featureThClass,
                        fixedClass,
                        "z-[5]",
                        isSelectColLastFixed() ? fixedLastClass : undefined,
                      )}
                      rowspan={featureHeaderRowspan()}
                      style={{
                        top: "0",
                        left: selectColLeft(),
                      }}
                      ref={registerSelectColRef}
                    >
                      <Show when={local.selectionMode === "multiple"}>
                        <div class={featureCellClickableClass} onClick={() => toggleSelectAll()}>
                          <Checkbox
                            value={(() => {
                              const selectableItems = displayItems()
                                .map((flat) => flat.item)
                                .filter((item) => getItemSelectable(item) === true);
                              return (
                                selectableItems.length > 0 &&
                                selectableItems.every((item) => selection().includes(item))
                              );
                            })()}
                            inset
                            class="pointer-events-none"
                          />
                        </div>
                      </Show>
                    </th>
                  </Show>
                  {/* Drag reorder feature column header — show only in first row */}
                  <Show when={hasReorderFeature() && rowIndex() === 0}>
                    <th
                      class={twMerge(
                        featureThClass,
                        fixedClass,
                        "z-[5]",
                        isReorderColLastFixed() ? fixedLastClass : undefined,
                      )}
                      rowspan={featureHeaderRowspan()}
                      style={{
                        top: "0",
                        left: reorderColLeft(),
                      }}
                      ref={registerReorderColRef}
                    />
                  </Show>
                  <For each={row}>
                    {(cell, cellColIndex) => (
                      <Show when={cell}>
                        {(c) => renderHeaderCell(c(), cellColIndex(), rowIndex())}
                      </Show>
                    )}
                  </For>
                </tr>
              )}
            </For>
            {renderSummaryRow()}
          </thead>
          <tbody>
            <For each={displayItems()}>
              {(flat) => (
                <tr
                  data-selected={selection().includes(flat.item) ? "" : undefined}
                  onClick={() => {
                    if (local.autoSelect) {
                      selectItem(flat.item);
                    }
                  }}
                  class={clsx(trRowClass, local.autoSelect && "cursor-pointer")}
                >
                  <Show when={hasExpandFeature()}>
                    {renderExpandCell(flat)}
                  </Show>
                  <Show when={hasSelectFeature()}>
                    {renderSelectCell(flat)}
                  </Show>
                  <Show when={hasReorderFeature()}>
                    {renderReorderCell(flat)}
                  </Show>
                  <For each={effectiveColumns()}>
                    {(col, colIndex) => (
                      <td
                        class={twMerge(
                          tdClass,
                          col.fixed ? clsx(fixedClass, "z-[2]") : undefined,
                          isLastFixed(colIndex()) ? fixedLastClass : undefined,
                          col.class,
                          local.cellClass?.(flat.item, col.key),
                        )}
                        style={
                          [
                            getFixedStyle(colIndex()),
                            col.width != null ? `max-width: ${col.width.replace(/;/g, "")}` : undefined,
                            local.cellStyle?.(flat.item, col.key),
                          ]
                            .filter(Boolean)
                            .join("; ") || undefined
                        }
                      >
                        {col.cell({
                          item: flat.item,
                          index: flat.index,
                          row: flat.row,
                          depth: flat.depth,
                        })}
                      </td>
                    )}
                  </For>
                </tr>
              )}
            </For>
          </tbody>
        </table>
        <div class={resizeIndicatorClass} style={resizeIndicatorStyle()} />
        <div data-reorder-indicator class={reorderIndicatorClass} style={{ display: "none" }} />
      </div>
    </div>
    </ColumnsProvider>
  );
};

//#region Export
export const DataSheet = Object.assign(DataSheetInner, {
  Column: DataSheetColumn,
});
//#endregion
