import { children, createMemo, For, type JSX, Show, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { IconArrowsSort, IconSortAscending, IconSortDescending } from "@tabler/icons-solidjs";
import type { FlatItem, SheetColumnDef, SheetProps, SortingDef } from "./types";
import { SheetColumn, isSheetColumnDef } from "./SheetColumn";
import { applySorting, buildHeaderTable } from "./sheetUtils";
import { createPropSignal } from "../../../utils/createPropSignal";
import { Icon } from "../../display/Icon";
import { Pagination } from "../Pagination";
import {
  defaultContainerClass,
  insetContainerClass,
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

  // #region Header
  const headerTable = createMemo(() => buildHeaderTable(columnDefs()));
  const hasSummary = createMemo(() => columnDefs().some((col) => col.summary != null));

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
      <div class={twMerge(sheetContainerClass, "flex-1 min-h-0")} style={local.contentStyle}>
      <table class={tableClass}>
        <colgroup>
          <For each={columnDefs()}>
            {(col) => <col style={col.width != null ? { width: col.width } : undefined} />}
          </For>
        </colgroup>
        <thead>
          <For each={headerTable()}>
            {(row) => (
              <tr>
                <For each={row}>
                  {(cell) => (
                    <Show when={cell}>
                      {(c) => {
                        const isSortable = () =>
                          c().isLastRow && c().colIndex != null && !columnDefs()[c().colIndex!].disableSorting;
                        const colKey = () =>
                          c().colIndex != null ? columnDefs()[c().colIndex!].key : undefined;

                        return (
                          <th
                            class={twMerge(thClass, isSortable() ? sortableThClass : undefined)}
                            colspan={c().colspan > 1 ? c().colspan : undefined}
                            rowspan={c().rowspan > 1 ? c().rowspan : undefined}
                            title={c().isLastRow && c().colIndex != null
                              ? (columnDefs()[c().colIndex!].tooltip ?? c().text)
                              : c().text}
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
              <For each={columnDefs()}>
                {(col) => (
                  <th class={twMerge(thClass, summaryThClass)}>
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
                <For each={columnDefs()}>
                  {(col) => (
                    <td class={tdClass}>
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
      </div>
    </div>
  );
};

Sheet.Column = SheetColumn;
