import type { JSX } from "solid-js";
import { Show } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { Icon } from "../../../display/Icon";
import { IconArrowsSort, IconSortAscending, IconSortDescending } from "@tabler/icons-solidjs";
import type { HeaderDef, DataSheetColumnDef } from "../DataSheet.types";

export interface UseDataSheetHeaderCellProps<TItem> {
  effectiveColumns: () => DataSheetColumnDef<TItem>[];
  headerRowTops: () => number[];
  getFixedStyle: (colIndex: number) => string | undefined;
  isLastFixed: (colIndex: number) => boolean;
  registerColumnRef: (colIndex: number, el: HTMLElement) => void;
  toggleSort: (key: string, multi: boolean) => void;
  getSortDef: (key: string) => { desc: boolean } | undefined;
  sortIndex: (key: string) => number | undefined;
  onResizerPointerdown: (e: PointerEvent, key: string) => void;
  onResizerDoubleClick: (key: string) => void;
  thClass: string;
  fixedClass: string;
  sortableThClass: string;
  fixedLastClass: string;
  thContentClass: string;
  resizerClass: string;
  sortIconClass: string;
}

export function useDataSheetHeaderCell<TItem>(props: UseDataSheetHeaderCellProps<TItem>) {
  function renderHeaderCell(header: HeaderDef, colIndex: number, rowIndex: number): JSX.Element {
    const isSortable = () =>
      header.isLastRow &&
      header.colIndex != null &&
      props.effectiveColumns()[header.colIndex].sortable;
    const colKey = () =>
      header.colIndex != null
        ? props.effectiveColumns()[header.colIndex].key
        : undefined;

    const isGroupFixed = (): boolean => {
      if (header.isLastRow) return false;
      const start = colIndex;
      const span = header.colspan;
      const cols = props.effectiveColumns();
      for (let i = start; i < start + span && i < cols.length; i++) {
        if (!cols[i].fixed) return false;
      }
      return true;
    };

    const isCellFixed = () =>
      (header.isLastRow &&
        header.colIndex != null &&
        props.effectiveColumns()[header.colIndex].fixed) ||
      isGroupFixed();

    const isCellLastFixed = () => {
      if (header.isLastRow && header.colIndex != null)
        return props.isLastFixed(header.colIndex);
      if (isGroupFixed()) {
        const lastCol = colIndex + header.colspan - 1;
        return props.isLastFixed(lastCol);
      }
      return false;
    };

    const cellStyle = (): string | undefined => {
      const parts: string[] = [];
      const top = props.headerRowTops()[rowIndex];
      parts.push(`top: ${top}px`);
      if (header.isLastRow && header.colIndex != null) {
        const left = props.getFixedStyle(header.colIndex);
        if (left != null) parts.push(left);
        const col = props.effectiveColumns()[header.colIndex];
        if (col.width != null) parts.push(`max-width: ${col.width.replace(/;/g, "")}`);
      } else if (isGroupFixed()) {
        const left = props.getFixedStyle(colIndex);
        if (left != null) parts.push(left);
      }
      return parts.length > 0 ? parts.join("; ") : undefined;
    };

    return (
      <th
        class={twMerge(
          props.thClass,
          props.fixedClass,
          isSortable() ? props.sortableThClass : undefined,
          isCellFixed() ? "z-[5]" : "z-[3]",
          isCellLastFixed() ? props.fixedLastClass : undefined,
        )}
        colspan={header.colspan > 1 ? header.colspan : undefined}
        rowspan={header.rowspan > 1 ? header.rowspan : undefined}
        style={cellStyle()}
        title={
          header.isLastRow && header.colIndex != null
            ? (props.effectiveColumns()[header.colIndex].tooltip ?? header.text)
            : header.text
        }
        ref={(el: HTMLElement) => {
          if (
            header.isLastRow &&
            header.colIndex != null &&
            props.effectiveColumns()[header.colIndex].fixed
          ) {
            props.registerColumnRef(header.colIndex, el);
          }
        }}
        onClick={(e) => {
          if (!isSortable()) return;
          const key = colKey();
          if (key == null) return;
          props.toggleSort(key, e.shiftKey || e.ctrlKey);
        }}
      >
        <div class={clsx("flex items-center gap-2", props.thContentClass)}>
          <div class="flex-1">{header.headerContent?.() ?? header.text}</div>
          <Show when={isSortable() && colKey()}>
            {(key) => {
              const sortDef = () => props.getSortDef(key());
              const sortIdx = () => props.sortIndex(key());
              return (
                <div class={props.sortIconClass}>
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
            header.isLastRow &&
            header.colIndex != null &&
            props.effectiveColumns()[header.colIndex].resizable
          }
        >
          <div
            class={props.resizerClass}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) =>
              props.onResizerPointerdown(e, props.effectiveColumns()[header.colIndex!].key)
            }
            onDblClick={(e) => {
              e.stopPropagation();
              props.onResizerDoubleClick(props.effectiveColumns()[header.colIndex!].key);
            }}
          />
        </Show>
      </th>
    );
  }

  return { renderHeaderCell };
}
