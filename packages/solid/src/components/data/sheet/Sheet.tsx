import { children, createMemo, For, type JSX, Show, splitProps } from "solid-js";
import { twMerge } from "tailwind-merge";
import type { FlatItem, SheetColumnDef, SheetProps } from "./types";
import { SheetColumn, isSheetColumnDef } from "./SheetColumn";
import { buildHeaderTable } from "./sheetUtils";
import {
  defaultContainerClass,
  insetContainerClass,
  sheetContainerClass,
  summaryThClass,
  tableClass,
  tdClass,
  thClass,
  thContentClass,
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
    "class",
    "children",
  ]);

  // #region Column Collection
  const resolved = children(() => local.children);
  const columnDefs = createMemo(() =>
    (resolved.toArray().filter(isSheetColumnDef) as SheetColumnDef<T>[])
      .filter((col) => !col.hidden),
  );

  // #region Header
  const headerTable = createMemo(() => buildHeaderTable(columnDefs()));
  const hasSummary = createMemo(() => columnDefs().some((col) => col.summary != null));

  // #region Sorting (스텁 — Plan 2에서 구현)
  const sortedItems = createMemo(() => {
    return local.items ?? [];
  });

  // #region Paging (스텁 — Plan 2에서 구현)
  const pagedItems = createMemo(() => {
    return sortedItems();
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

  // #region Styles
  const getContainerClassName = () =>
    twMerge(
      sheetContainerClass,
      local.inset ? insetContainerClass : defaultContainerClass,
      local.class,
    );

  return (
    <div data-sheet={local.key} class={getContainerClassName()}>
      <table class={tableClass}>
        <colgroup>
          <For each={columnDefs()}>
            {(col) => <col style={col.width ? { width: col.width } : undefined} />}
          </For>
        </colgroup>
        <thead>
          <For each={headerTable()}>
            {(row) => (
              <tr>
                <For each={row}>
                  {(cell) => (
                    <Show when={cell}>
                      {(c) => (
                        <th
                          class={thClass}
                          colspan={c().colspan > 1 ? c().colspan : undefined}
                          rowspan={c().rowspan > 1 ? c().rowspan : undefined}
                        >
                          <div class={thContentClass}>
                            {c().headerContent?.() ?? c().text}
                          </div>
                        </th>
                      )}
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
  );
};

Sheet.Column = SheetColumn;
