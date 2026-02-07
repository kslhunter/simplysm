import { children, createMemo, createSignal, For, type JSX, Show, splitProps } from "solid-js";
import { createResizeObserver } from "@solid-primitives/resize-observer";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { IconArrowsSort, IconSortAscending, IconSortDescending } from "@tabler/icons-solidjs";
import type { FlatItem, SheetColumnDef, SheetConfig, SheetProps, SortingDef } from "./types";
import { SheetColumn, isSheetColumnDef } from "./SheetColumn";
import { applySorting, buildHeaderTable } from "./sheetUtils";
import { createPropSignal } from "../../../utils/createPropSignal";
import { Icon } from "../../display/Icon";
import { Pagination } from "../Pagination";
import { usePersisted } from "../../../contexts/usePersisted";
import {
  defaultContainerClass,
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
    "currentPage",
    "onCurrentPageChange",
    "totalPageCount",
    "itemsPerPage",
    "displayPageCount",
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
    value: () => local.currentPage ?? 0,
    onChange: () => local.onCurrentPageChange,
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

  // #region ColumnFixing
  // 각 컬럼 셀의 ref → 너비 측정용
  const columnRefs = new Map<number, HTMLElement>();

  // 각 컬럼의 측정된 너비
  const [columnWidths, setColumnWidths] = createSignal<Map<number, number>>(new Map());

  // 고정 컬럼의 left 위치 계산
  const fixedLeftMap = createMemo(() => {
    const map = new Map<number, number>();
    const cols = effectiveColumns();
    const widths = columnWidths();
    let left = 0;
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
    createResizeObserver(el, (rect) => {
      setColumnWidths((prev) => {
        const next = new Map(prev);
        next.set(colIndex, rect.width);
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
      const newWidth = Math.max(30, startWidth + delta);
      saveColumnWidth(colKey, `${newWidth}px`);
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

  // #region Expanding (스텁 — Plan 4에서 구현)
  const flatItems = createMemo((): FlatItem<T>[] => {
    return pagedItems().map((item, i) => ({
      item,
      index: i,
      depth: 0,
      hasChildren: false,
    }));
  });

  // #region Display
  const displayItems = createMemo(() => flatItems());

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
      <div data-sheet-scroll class={twMerge(sheetContainerClass, "flex-1 min-h-0")} style={local.contentStyle}>
      <table class={tableClass}>
        <colgroup>
          <For each={effectiveColumns()}>
            {(col) => <col style={col.width != null ? { width: col.width } : undefined} />}
          </For>
        </colgroup>
        <thead>
          <For each={headerTable()}>
            {(row) => (
              <tr>
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

                        // 셀의 고정 여부 (마지막 행이면 colIndex 기반, 그 외 그룹 기반)
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

                        // 고정 셀의 left style
                        const cellFixedStyle = () => {
                          if (c().isLastRow && c().colIndex != null) return getFixedStyle(c().colIndex!);
                          if (isGroupFixed()) return getFixedStyle(cellColIndex());
                          return undefined;
                        };

                        return (
                          <th
                            class={twMerge(
                              thClass,
                              isSortable() ? sortableThClass : undefined,
                              isCellFixed() ? clsx(fixedClass, "z-[4]") : undefined,
                              isCellLastFixed() ? fixedLastClass : undefined,
                            )}
                            colspan={c().colspan > 1 ? c().colspan : undefined}
                            rowspan={c().rowspan > 1 ? c().rowspan : undefined}
                            style={cellFixedStyle()}
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
                                onMouseDown={(e) => onResizerMousedown(e, effectiveColumns()[c().colIndex!].key)}
                                onDblClick={() => onResizerDoubleClick(effectiveColumns()[c().colIndex!].key)}
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
              <For each={effectiveColumns()}>
                {(col, colIndex) => (
                  <th
                    class={twMerge(
                      thClass,
                      summaryThClass,
                      col.fixed ? clsx(fixedClass, "z-[4]") : undefined,
                      isLastFixed(colIndex()) ? fixedLastClass : undefined,
                    )}
                    style={getFixedStyle(colIndex())}
                  >
                    <div class={thContentClass}>
                      {col.summary?.()}
                    </div>
                  </th>
                )}
              </For>
            </tr>
          </Show>
        </thead>
        <tbody>
          <For each={displayItems()}>
            {(flat) => (
              <tr>
                <For each={effectiveColumns()}>
                  {(col, colIndex) => (
                    <td
                      class={twMerge(
                        tdClass,
                        col.fixed ? clsx(fixedClass, "z-[2]") : undefined,
                        isLastFixed(colIndex()) ? fixedLastClass : undefined,
                      )}
                      style={getFixedStyle(colIndex())}
                    >
                      {col.cell({
                        item: flat.item,
                        index: flat.index,
                        depth: flat.depth,
                        edit: false,
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
