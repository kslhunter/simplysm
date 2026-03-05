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
  IconArrowsSort,
  IconChevronDown,
  IconChevronRight,
  IconGripVertical,
  IconSettings,
  IconSortAscending,
  IconSortDescending,
} from "@tabler/icons-solidjs";
import "@simplysm/core-browser";
import type {
  DataSheetCellContext,
  DataSheetColumnDef,
  DataSheetConfig,
  DataSheetConfigColumnInfo,
  DataSheetProps,
} from "./types";
import { DataSheetColumn, createColumnSlotsAccessor } from "./DataSheetColumn";
import { DataSheetConfigDialog } from "./DataSheetConfigDialog";
import { buildHeaderTable, normalizeHeader } from "./sheetUtils";
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
import { useDataSheetSorting } from "./hooks/useDataSheetSorting";
import { useDataSheetPaging } from "./hooks/useDataSheetPaging";
import { useDataSheetExpansion } from "./hooks/useDataSheetExpansion";
import { useDataSheetSelection } from "./hooks/useDataSheetSelection";
import { useDataSheetReorder } from "./hooks/useDataSheetReorder";
import { useDataSheetFixedColumns } from "./hooks/useDataSheetFixedColumns";

interface DataSheetComponent {
  <T>(props: DataSheetProps<T>): JSX.Element;
  Column: typeof DataSheetColumn;
  ConfigDialog: typeof DataSheetConfigDialog;
}

const DataSheetInner = <T,>(props: DataSheetProps<T>) => {
  const [local] = splitProps(props, [
    "items",
    "persistKey",
    "hideConfigBar",
    "inset",
    "contentStyle",
    "sorts",
    "onSortsChange",
    "autoSort",
    "page",
    "onPageChange",
    "totalPageCount",
    "itemsPerPage",
    "displayPageCount",
    "expandedItems",
    "onExpandedItemsChange",
    "itemChildren",
    "selectMode",
    "selectedItems",
    "onSelectedItemsChange",
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
        (col): DataSheetColumnDef<T> => ({
          key: col.key,
          header: normalizeHeader(col.header),
          headerContent: col.headerContent,
          headerStyle: col.headerStyle,
          summary: col.summary,
          tooltip: col.tooltip,
          cell: col.children as (ctx: DataSheetCellContext<T>) => JSX.Element,
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
    local.persistKey != null && local.persistKey !== ""
      ? useSyncConfig<DataSheetConfig>(`sheet.${local.persistKey}`, { columnRecord: {} })
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
  } = useDataSheetSorting<T>({
    sorts: () => local.sorts,
    onSortsChange: () => local.onSortsChange,
    items: () => local.items,
    autoSort: () => local.autoSort,
  });

  function getSortDef(key: string) {
    return sorts().find((s) => s.key === key);
  }

  // #region Paging
  const { currentPage, setCurrentPage, pageCount, pagedItems } = useDataSheetPaging<T>({
    page: () => local.page,
    onPageChange: () => local.onPageChange,
    itemsPerPage: () => local.itemsPerPage,
    totalPageCount: () => local.totalPageCount,
    items: () => local.items,
    sortedItems,
  });

  const originalIndexMap = createMemo(() => {
    const map = new Map<T, number>();
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
  } = useDataSheetFixedColumns<T>(
    {
      get itemChildren() { return local.itemChildren; },
      get selectMode() { return local.selectMode; },
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
    useDataSheetExpansion<T>(
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
    selectedItems,
    setSelectedItems,
    getItemSelectable,
    toggleSelect,
    toggleSelectAll,
    rangeSelect,
    lastClickedRow,
    setLastClickedRow,
  } = useDataSheetSelection<T>(
    {
      get selectMode() { return local.selectMode; },
      get selectedItems() { return local.selectedItems; },
      get onSelectedItemsChange() { return local.onSelectedItemsChange; },
      get isItemSelectable() { return local.isItemSelectable; },
    },
    displayItems,
  );

  // #region AutoSelect
  function selectItem(item: T): void {
    if (getItemSelectable(item) !== true) return;
    if (local.selectMode === "single") {
      setSelectedItems([item]);
    } else {
      if (!selectedItems().includes(item)) {
        setSelectedItems([...selectedItems(), item]);
      }
    }
  }

  // #region Reorder
  const { dragState, onReorderPointerDown } = useDataSheetReorder<T>(
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

  return (
    <ColumnsProvider>
      {local.children}
    <div
      data-sheet={local.persistKey ?? ""}
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
                      <Show when={local.selectMode === "multiple"}>
                        <div class={featureCellClickableClass} onClick={() => toggleSelectAll()}>
                          <Checkbox
                            value={(() => {
                              const selectableItems = displayItems()
                                .map((flat) => flat.item)
                                .filter((item) => getItemSelectable(item) === true);
                              return (
                                selectableItems.length > 0 &&
                                selectableItems.every((item) => selectedItems().includes(item))
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
                        {(c) => {
                          const isSortable = () =>
                            c().isLastRow &&
                            c().colIndex != null &&
                            effectiveColumns()[c().colIndex!].sortable;
                          const colKey = () =>
                            c().colIndex != null
                              ? effectiveColumns()[c().colIndex!].key
                              : undefined;

                          // Group header fixed status: all columns in colspan range are fixed
                          const isGroupFixed = (): boolean => {
                            if (c().isLastRow) return false;
                            const start = cellColIndex();
                            const span = c().colspan;
                            const cols = effectiveColumns();
                            for (let i = start; i < start + span && i < cols.length; i++) {
                              if (!cols[i].fixed) return false;
                            }
                            return true;
                          };

                          // Cell fixed column status (based on colIndex if last row, group-based otherwise)
                          const isCellFixed = () =>
                            (c().isLastRow &&
                              c().colIndex != null &&
                              effectiveColumns()[c().colIndex!].fixed) ||
                            isGroupFixed();

                          // Cell's last fixed status
                          const isCellLastFixed = () => {
                            if (c().isLastRow && c().colIndex != null)
                              return isLastFixed(c().colIndex!);
                            if (isGroupFixed()) {
                              const lastCol = cellColIndex() + c().colspan - 1;
                              return isLastFixed(lastCol);
                            }
                            return false;
                          };

                          // Fixed cell left + top inline style
                          const cellStyle = (): string | undefined => {
                            const parts: string[] = [];
                            // top: apply to all th (fix header to top)
                            const top = headerRowTops()[rowIndex()];
                            parts.push(`top: ${top}px`);
                            // left: apply only to fixed columns
                            if (c().isLastRow && c().colIndex != null) {
                              const left = getFixedStyle(c().colIndex!);
                              if (left != null) parts.push(left);
                              // max-width: apply if explicit width exists (allow column to shrink below content)
                              const col = effectiveColumns()[c().colIndex!];
                              if (col.width != null) parts.push(`max-width: ${col.width.replace(/;/g, "")}`);
                            } else if (isGroupFixed()) {
                              const left = getFixedStyle(cellColIndex());
                              if (left != null) parts.push(left);
                            }
                            return parts.length > 0 ? parts.join("; ") : undefined;
                          };

                          return (
                            <th
                              class={twMerge(
                                thClass,
                                fixedClass,
                                isSortable() ? sortableThClass : undefined,
                                isCellFixed() ? "z-[5]" : "z-[3]",
                                isCellLastFixed() ? fixedLastClass : undefined,
                              )}
                              colspan={c().colspan > 1 ? c().colspan : undefined}
                              rowspan={c().rowspan > 1 ? c().rowspan : undefined}
                              style={cellStyle()}
                              title={
                                c().isLastRow && c().colIndex != null
                                  ? (effectiveColumns()[c().colIndex!].tooltip ?? c().text)
                                  : c().text
                              }
                              ref={(el: HTMLElement) => {
                                if (
                                  c().isLastRow &&
                                  c().colIndex != null &&
                                  effectiveColumns()[c().colIndex!].fixed
                                ) {
                                  registerColumnRef(c().colIndex!, el);
                                }
                              }}
                              onClick={(e) => {
                                if (!isSortable()) return;
                                const key = colKey();
                                if (key == null) return;
                                toggleSort(key, e.shiftKey || e.ctrlKey);
                              }}
                            >
                              <div class={clsx("flex items-center gap-2", thContentClass)}>
                                <div class="flex-1">{c().headerContent?.() ?? c().text}</div>
                                <Show when={isSortable() && colKey()}>
                                  {(key) => {
                                    const sortDef = () => getSortDef(key());
                                    const sortIdx = () => sortIndex(key());
                                    return (
                                      <div class={sortIconClass}>
                                        <Show when={sortDef()?.desc === false}>
                                          <Icon icon={IconSortAscending} />
                                        </Show>
                                        <Show when={sortDef()?.desc === true}>
                                          <Icon icon={IconSortDescending} />
                                        </Show>
                                        <Show when={sortDef() == null}>
                                          <Icon
                                            icon={IconArrowsSort}
                                            class="opacity-30"
                                          />
                                        </Show>
                                        <Show when={sortIdx()}>
                                          {(idx) => <sub>{idx()}</sub>}
                                        </Show>
                                      </div>
                                    );
                                  }}
                                </Show>
                              </div>
                              <Show
                                when={
                                  c().isLastRow &&
                                  c().colIndex != null &&
                                  effectiveColumns()[c().colIndex!].resizable
                                }
                              >
                                <div
                                  class={resizerClass}
                                  onClick={(e) => e.stopPropagation()}
                                  onPointerDown={(e) =>
                                    onResizerPointerdown(e, effectiveColumns()[c().colIndex!].key)
                                  }
                                  onDblClick={(e) => {
                                    e.stopPropagation();
                                    onResizerDoubleClick(effectiveColumns()[c().colIndex!].key);
                                  }}
                                />
                              </Show>
                            </th>
                          );
                        }}
                      </Show>
                    )}
                  </For>
                </tr>
              )}
            </For>
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
          </thead>
          <tbody>
            <For each={displayItems()}>
              {(flat) => (
                <tr
                  data-selected={selectedItems().includes(flat.item) ? "" : undefined}
                  onClick={() => {
                    if (local.autoSelect === "click") {
                      selectItem(flat.item);
                    }
                  }}
                  class={clsx(trRowClass, local.autoSelect === "click" && "cursor-pointer")}
                >
                  {/* Expand feature column body cell */}
                  <Show when={hasExpandFeature()}>
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
                        <For each={Array.from({ length: flat.depth })}>
                          {() => (
                            <div class={expandIndentGuideClass}>
                              <div class={expandIndentGuideLineClass} />
                            </div>
                          )}
                        </For>
                        <Show when={flat.hasChildren}>
                          <button
                            type="button"
                            class={expandToggleClass}
                            onClick={() => toggleExpand(flat.item)}
                          >
                            <Icon
                              icon={IconChevronDown}
                              size="1em"
                              class={clsx(
                                "transition-transform",
                                expandedItems().includes(flat.item) ? "rotate-0" : "-rotate-90",
                              )}
                            />
                          </button>
                        </Show>
                      </div>
                    </td>
                  </Show>
                  {/* Select feature column body cell */}
                  <Show when={hasSelectFeature()}>
                    {(() => {
                      const selectable = () => getItemSelectable(flat.item);
                      const isSelected = () => selectedItems().includes(flat.item);
                      const rowIndex = () => flat.row;

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
                            when={local.selectMode === "multiple"}
                            fallback={
                              /* single mode */
                              <Show when={selectable() === true}>
                                <div
                                  class={featureCellBodyClickableClass}
                                  onClick={() => toggleSelect(flat.item)}
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
                                  toggleSelect(flat.item);
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
                    })()}
                  </Show>
                  {/* Drag reorder feature column body cell */}
                  <Show when={hasReorderFeature()}>
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
                        onPointerDown={(e) => onReorderPointerDown(e, flat.item)}
                      >
                        <div class={reorderHandleClass}>
                          <Icon icon={IconGripVertical} size="1em" />
                        </div>
                      </div>
                    </td>
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
  ConfigDialog: DataSheetConfigDialog,
}) as unknown as DataSheetComponent;
export { DataSheetConfigDialog };
//#endregion
