import { children, createMemo, createSignal, For, type JSX, Show, splitProps } from "solid-js";
import { createResizeObserver } from "@solid-primitives/resize-observer";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { IconArrowsSort, IconChevronDown, IconSortAscending, IconSortDescending } from "@tabler/icons-solidjs";
import "@simplysm/core-browser";
import type { FlatItem, SheetColumnDef, SheetConfig, SheetProps, SortingDef } from "./types";
import { SheetColumn, isSheetColumnDef } from "./SheetColumn";
import { applySorting, buildHeaderTable, collectAllExpandable, flattenTree } from "./sheetUtils";
import { createPropSignal } from "../../../utils/createPropSignal";
import { Icon } from "../../display/Icon";
import { Pagination } from "../Pagination";
import { usePersisted } from "../../../contexts/usePersisted";
import "./Sheet.css";
import {
  defaultContainerClass,
  expandIndentGuideClass,
  expandIndentGuideLineClass,
  expandToggleClass,
  featureTdClass,
  featureThClass,
  fixedClass,
  fixedLastClass,
  insetContainerClass,
  resizerClass,
  resizeIndicatorClass,
  sheetContainerClass,
  sortableThClass,
  sortIconClass,
  summaryThClass,
  tableClass,
  tdClass,
  thClass,
  thContentClass,
  toolbarClass,
} from "./Sheet.styles";

interface SheetComponent {
  <T>(props: SheetProps<T>): JSX.Element;
  Column: typeof SheetColumn;
}

export const Sheet: SheetComponent = <T,>(props: SheetProps<T>) => {
  const [local] = splitProps(props, [
    "items",
    "trackByFn",
    "key",
    "hideConfigBar",
    "inset",
    "contentStyle",
    "sorts",
    "onSortsChange",
    "useAutoSort",
    "page",
    "onPageChange",
    "totalPageCount",
    "itemsPerPage",
    "displayPageCount",
    "expandedItems",
    "onExpandedItemsChange",
    "getChildrenFn",
    "getItemCellClassFn",
    "getItemCellStyleFn",
    "class",
    "children",
  ]);

  // #region Column Collection
  const resolved = children(() => local.children);
  const columnDefs = createMemo(() =>
    (resolved.toArray().filter(isSheetColumnDef) as unknown as SheetColumnDef<T>[])
      .filter((col) => !col.hidden),
  );

  // #region Config (usePersisted)
  const persistedKey = `sheet.${local.key}`; // eslint-disable-line solid/reactivity -- key는 정적 값으로 컴포넌트 마운트 시 한 번만 사용됨
  const [config, setConfig] = usePersisted<SheetConfig>(
    persistedKey,
    { columnRecord: {} },
  );

  // 설정이 적용된 최종 컬럼 — config의 width 오버라이드 적용
  const effectiveColumns = createMemo(() => {
    const cols = columnDefs();
    const record = config().columnRecord ?? {};
    return cols.map((col) => {
      const saved = record[col.key];
      if (saved == null) return col;
      return {
        ...col,
        width: saved.width ?? col.width,
      };
    });
  });

  function saveColumnWidth(colKey: string, width: string | undefined): void {
    const prev = config();
    const record = { ...prev.columnRecord };
    record[colKey] = { ...record[colKey], width };
    setConfig({ ...prev, columnRecord: record });
  }

  // #region Header
  const headerTable = createMemo(() => buildHeaderTable(effectiveColumns()));
  const hasSummary = createMemo(() => effectiveColumns().some((col) => col.summary != null));

  // #region Sorting
  const [sorts, setSorts] = createPropSignal({
    value: () => local.sorts ?? [],
    onChange: () => local.onSortsChange,
  });

  function toggleSort(key: string, multiple: boolean): void {
    const current = sorts();
    const existing = current.find((s) => s.key === key);

    if (existing) {
      if (!existing.desc) {
        // asc → desc
        const updated = current.map((s) =>
          s.key === key ? { ...s, desc: true } : s,
        );
        setSorts(multiple ? updated : [{ key, desc: true }]);
      } else {
        // desc → 제거
        const updated = current.filter((s) => s.key !== key);
        setSorts(multiple ? updated : []);
      }
    } else {
      // 없음 → asc 추가
      const newSort: SortingDef = { key, desc: false };
      setSorts(multiple ? [...current, newSort] : [newSort]);
    }
  }

  function getSortDef(key: string): SortingDef | undefined {
    return sorts().find((s) => s.key === key);
  }

  function getSortIndex(key: string): number | undefined {
    if (sorts().length <= 1) return undefined;
    const idx = sorts().findIndex((s) => s.key === key);
    return idx >= 0 ? idx + 1 : undefined;
  }

  const sortedItems = createMemo(() => {
    if (!local.useAutoSort) return local.items ?? [];
    return applySorting(local.items ?? [], sorts());
  });

  // #region Paging
  const [currentPage, setCurrentPage] = createPropSignal({
    value: () => local.page ?? 0,
    onChange: () => local.onPageChange,
  });

  const effectivePageCount = createMemo(() => {
    const ipp = local.itemsPerPage;
    if (ipp != null && ipp !== 0 && (local.items ?? []).length > 0) {
      return Math.ceil((local.items ?? []).length / ipp);
    }
    return local.totalPageCount ?? 0;
  });

  const pagedItems = createMemo(() => {
    const ipp = local.itemsPerPage;
    if (ipp == null || ipp === 0) return sortedItems();
    if ((local.items ?? []).length <= 0) return sortedItems();

    const page = currentPage();
    return sortedItems().slice(page * ipp, (page + 1) * ipp);
  });

  // #region Feature Column Setup (확장/선택 기능 컬럼 공통)
  const hasExpandFeature = () => local.getChildrenFn != null;

  // 확장 컬럼의 고정 너비 추적
  const [expandColWidth, setExpandColWidth] = createSignal(0);

  function registerExpandColRef(el: HTMLElement): void {
    createResizeObserver(el, () => {
      setExpandColWidth(el.offsetWidth);
    });
  }

  // #region ColumnFixing
  // 각 컬럼 셀의 ref → 너비 측정용
  const columnRefs = new Map<number, HTMLElement>();

  // 각 컬럼의 측정된 너비
  const [columnWidths, setColumnWidths] = createSignal<Map<number, number>>(new Map());

  // 기능 컬럼(확장 등)의 총 너비 — 고정 컬럼 left 오프셋에 사용
  const featureColTotalWidth = createMemo(() => {
    let w = 0;
    if (hasExpandFeature()) w += expandColWidth();
    return w;
  });

  // 고정 컬럼의 left 위치 계산
  const fixedLeftMap = createMemo(() => {
    const map = new Map<number, number>();
    const cols = effectiveColumns();
    const widths = columnWidths();
    let left = featureColTotalWidth();
    for (let c = 0; c < cols.length; c++) {
      if (!cols[c].fixed) break; // 고정 컬럼은 앞쪽에 연속 배치
      map.set(c, left);
      left += widths.get(c) ?? 0;
    }
    return map;
  });

  // 마지막 고정 컬럼 인덱스
  const lastFixedIndex = createMemo(() => {
    const cols = effectiveColumns();
    let last = -1;
    for (let c = 0; c < cols.length; c++) {
      if (cols[c].fixed) last = c;
      else break;
    }
    return last;
  });

  function getFixedStyle(colIndex: number): string | undefined {
    const leftVal = fixedLeftMap().get(colIndex);
    if (leftVal == null) return undefined;
    return `left: ${leftVal}px`;
  }

  function isLastFixed(colIndex: number): boolean {
    return colIndex === lastFixedIndex();
  }

  // 고정 컬럼 셀에 ResizeObserver 등록
  function registerColumnRef(colIndex: number, el: HTMLElement): void {
    columnRefs.set(colIndex, el);
    createResizeObserver(el, () => {
      setColumnWidths((prev) => {
        const next = new Map(prev);
        next.set(colIndex, el.offsetWidth);
        return next;
      });
    });
  }

  // #region Resizing
  const [resizeIndicatorStyle, setResizeIndicatorStyle] = createSignal<JSX.CSSProperties>({
    display: "none",
  });

  function onResizerMousedown(event: MouseEvent, colKey: string): void {
    event.preventDefault();
    const th = (event.target as HTMLElement).closest("th")!;
    const container = th.closest("[data-sheet]")!.querySelector("[data-sheet-scroll]") as HTMLElement;
    const startX = event.clientX;
    const startWidth = th.offsetWidth;

    // 리사이즈 인디케이터 표시
    const containerRect = container.getBoundingClientRect();
    setResizeIndicatorStyle({
      display: "block",
      left: `${th.getBoundingClientRect().right - containerRect.left + container.scrollLeft}px`,
      top: "0",
      height: `${container.scrollHeight}px`,
    });

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const newWidth = Math.max(30, startWidth + delta);
      setResizeIndicatorStyle({
        display: "block",
        left: `${th.getBoundingClientRect().left - containerRect.left + container.scrollLeft + newWidth}px`,
        top: "0",
        height: `${container.scrollHeight}px`,
      });
    };

    const onMouseUp = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      // 실제 드래그가 발생한 경우에만 너비 저장 (더블클릭 시 DOM 재생성으로 dblclick 유실 방지)
      if (delta !== 0) {
        const newWidth = Math.max(30, startWidth + delta);
        saveColumnWidth(colKey, `${newWidth}px`);
      }
      setResizeIndicatorStyle({ display: "none" });
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  function onResizerDoubleClick(colKey: string): void {
    saveColumnWidth(colKey, undefined);
  }

  // #region HeaderSticky
  // 각 헤더 행의 높이를 추적하여 누적 top 값 계산
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

  // 각 헤더 행의 누적 top 값
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

  // 합계 행의 top 값 (모든 헤더 행 높이 합)
  const summaryRowTop = createMemo(() => {
    const heights = headerRowHeights();
    return heights.reduce((sum, h) => sum + h, 0);
  });

  // #region Expanding
  const [expandedItems, setExpandedItems] = createPropSignal({
    value: () => local.expandedItems ?? [],
    onChange: () => local.onExpandedItemsChange,
  });

  function toggleExpand(item: T): void {
    const current = expandedItems();
    if (current.includes(item)) {
      setExpandedItems(current.filter((i) => i !== item));
    } else {
      setExpandedItems([...current, item]);
    }
  }

  function toggleExpandAll(): void {
    if (!local.getChildrenFn) return;
    const allExpandable = collectAllExpandable(pagedItems(), local.getChildrenFn);
    const isAllExpanded = allExpandable.every((item) => expandedItems().includes(item));
    setExpandedItems(isAllExpanded ? [] : allExpandable);
  }

  const flatItems = createMemo((): FlatItem<T>[] => {
    return flattenTree(pagedItems(), expandedItems(), local.getChildrenFn);
  });

  // #region Keyboard Navigation (Enter/Shift+Enter로 행 이동)
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

  // #region Display
  const displayItems = createMemo(() => flatItems());

  // 확장 기능 컬럼이 "마지막 고정"인지 (일반 고정 컬럼이 없을 때)
  const isExpandColLastFixed = () =>
    hasExpandFeature() && lastFixedIndex() < 0;

  // 전체 헤더 행 수 + 합계 행 수 (기능 컬럼의 rowspan에 사용)
  const featureHeaderRowspan = createMemo(() => {
    const headerRows = headerTable().length;
    const summaryRow = hasSummary() ? 1 : 0;
    return headerRows + summaryRow;
  });

  // 전체 확장 상태인지
  const isAllExpanded = createMemo(() => {
    if (!local.getChildrenFn) return false;
    const allExpandable = collectAllExpandable(pagedItems(), local.getChildrenFn);
    return allExpandable.length > 0 && allExpandable.every((item) => expandedItems().includes(item));
  });

  return (
    <div data-sheet={local.key} class={twMerge("flex flex-col", local.inset ? insetContainerClass : defaultContainerClass, local.class)}>
      <Show when={!local.hideConfigBar && effectivePageCount() > 1}>
        <div class={toolbarClass}>
          <Pagination
            class="flex-1"
            page={currentPage()}
            onPageChange={setCurrentPage}
            totalPages={effectivePageCount()}
            displayPages={local.displayPageCount}
            size="sm"
          />
        </div>
      </Show>
      <div
        data-sheet-scroll
        class={twMerge(sheetContainerClass, "flex-1 min-h-0")}
        style={local.contentStyle}
      >
      <table class={tableClass} onKeyDown={onTableKeyDown}>
        <colgroup>
          <Show when={hasExpandFeature()}>
            <col />
          </Show>
          <For each={effectiveColumns()}>
            {(col) => <col style={col.width != null ? { width: col.width } : undefined} />}
          </For>
        </colgroup>
        <thead>
          <For each={headerTable()}>
            {(row, rowIndex) => (
              <tr ref={(el: HTMLElement) => registerHeaderRow(rowIndex(), el)}>
                {/* 확장 기능 컬럼 헤더 — 첫 번째 행에만 표시 (rowspan으로 전체 덮기) */}
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
                    <div class="flex items-center px-1">
                      <button
                        type="button"
                        class={expandToggleClass}
                        onClick={toggleExpandAll}
                        title={isAllExpanded() ? "전체 접기" : "전체 펼치기"}
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
                <For each={row}>
                  {(cell, cellColIndex) => (
                    <Show when={cell}>
                      {(c) => {
                        const isSortable = () =>
                          c().isLastRow && c().colIndex != null && !effectiveColumns()[c().colIndex!].disableSorting;
                        const colKey = () =>
                          c().colIndex != null ? effectiveColumns()[c().colIndex!].key : undefined;

                        // 그룹 헤더의 고정 여부: colspan 범위 내 모든 컬럼이 fixed인지
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

                        // 셀의 고정 컬럼 여부 (마지막 행이면 colIndex 기반, 그 외 그룹 기반)
                        const isCellFixed = () =>
                          (c().isLastRow && c().colIndex != null && effectiveColumns()[c().colIndex!].fixed)
                          || isGroupFixed();

                        // 셀의 마지막 고정 여부
                        const isCellLastFixed = () => {
                          if (c().isLastRow && c().colIndex != null) return isLastFixed(c().colIndex!);
                          if (isGroupFixed()) {
                            const lastCol = cellColIndex() + c().colspan - 1;
                            return isLastFixed(lastCol);
                          }
                          return false;
                        };

                        // 고정 셀의 left + top 인라인 style
                        const cellStyle = (): string | undefined => {
                          const parts: string[] = [];
                          // top: 모든 th에 적용 (헤더 상단 고정)
                          const top = headerRowTops()[rowIndex()];
                          parts.push(`top: ${top}px`);
                          // left: 고정 컬럼에만 적용
                          if (c().isLastRow && c().colIndex != null) {
                            const left = getFixedStyle(c().colIndex!);
                            if (left != null) parts.push(left);
                            // max-width: 명시적 너비가 있으면 적용 (컬럼이 내용물보다 작아질 수 있도록)
                            const col = effectiveColumns()[c().colIndex!];
                            if (col.width != null) parts.push(`max-width: ${col.width}`);
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
                            title={c().isLastRow && c().colIndex != null
                              ? (effectiveColumns()[c().colIndex!].tooltip ?? c().text)
                              : c().text}
                            ref={(el: HTMLElement) => {
                              if (c().isLastRow && c().colIndex != null && effectiveColumns()[c().colIndex!].fixed) {
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
                            <div class={clsx("flex items-center", thContentClass)}>
                              <div class="flex-1">
                                {c().headerContent?.() ?? c().text}
                              </div>
                              <Show when={isSortable() && colKey()}>
                                {(key) => {
                                  const sortDef = () => getSortDef(key());
                                  const sortIndex = () => getSortIndex(key());
                                  return (
                                    <div class={sortIconClass}>
                                      <Show when={sortDef()?.desc === false}>
                                        <Icon icon={IconSortAscending} size="1em" />
                                      </Show>
                                      <Show when={sortDef()?.desc === true}>
                                        <Icon icon={IconSortDescending} size="1em" />
                                      </Show>
                                      <Show when={sortDef() == null}>
                                        <Icon icon={IconArrowsSort} size="1em" class="opacity-30" />
                                      </Show>
                                      <Show when={sortIndex()}>
                                        {(idx) => <sub>{idx()}</sub>}
                                      </Show>
                                    </div>
                                  );
                                }}
                              </Show>
                            </div>
                            <Show when={c().isLastRow && c().colIndex != null && !effectiveColumns()[c().colIndex!].disableResizing}>
                              <div
                                class={resizerClass}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => onResizerMousedown(e, effectiveColumns()[c().colIndex!].key)}
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
              {/* 확장 기능 컬럼의 합계 셀은 rowspan으로 이미 덮여있으므로 제외 */}
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
                      <div class={thContentClass}>
                        {col.summary?.()}
                      </div>
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
              <tr>
                {/* 확장 기능 컬럼 바디 셀 */}
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
                    <div class="flex h-full items-center px-1">
                      <For each={Array.from({ length: flat.depth })}>
                        {() => (
                          <div class={expandIndentGuideClass}>
                            <div class={expandIndentGuideLineClass} />
                          </div>
                        )}
                      </For>
                      <Show
                        when={flat.hasChildren}
                        fallback={<div class="size-6" />}
                      >
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
                <For each={effectiveColumns()}>
                  {(col, colIndex) => (
                    <td
                      class={twMerge(
                        tdClass,
                        col.fixed ? clsx(fixedClass, "z-[2]") : undefined,
                        isLastFixed(colIndex()) ? fixedLastClass : undefined,
                        col.class,
                        local.getItemCellClassFn?.(flat.item, col.key),
                      )}
                      style={[getFixedStyle(colIndex()), col.width != null ? `max-width: ${col.width}` : undefined, local.getItemCellStyleFn?.(flat.item, col.key)].filter(Boolean).join("; ") || undefined}
                    >
                      {col.cell({
                        item: flat.item,
                        index: flat.index,
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
      </div>
    </div>
  );
};

Sheet.Column = SheetColumn;
