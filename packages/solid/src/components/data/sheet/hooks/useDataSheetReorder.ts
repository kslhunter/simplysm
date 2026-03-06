import { createSignal, type Accessor } from "solid-js";
import { startPointerDrag } from "../../../../helpers/startPointerDrag";
import type { DataSheetReorderEvent } from "../DataSheet.types";
import type { FlatItem } from "../DataSheet.types";

export interface UseDataSheetReorderProps<TItem> {
  onItemsReorder?: (event: DataSheetReorderEvent<TItem>) => void;
  itemChildren?: (item: TItem, index: number) => TItem[] | undefined;
}

export function useDataSheetReorder<TItem>(
  props: UseDataSheetReorderProps<TItem>,
  displayItems: Accessor<FlatItem<TItem>[]>
) {
  const [dragState, setDragState] = createSignal<{
    draggingItem: TItem;
    targetItem: TItem | null;
    position: "before" | "after" | "inside" | null;
  } | null>(null);

  function isDescendant(parent: TItem, child: TItem, visited = new Set<TItem>()): boolean {
    if (visited.has(parent)) return false;
    visited.add(parent);
    if (!props.itemChildren) return false;
    const childItems = props.itemChildren(parent, 0);
    if (!childItems) return false;
    for (const c of childItems) {
      if (c === child) return true;
      if (isDescendant(c, child, visited)) return true;
    }
    return false;
  }

  function onReorderPointerDown(e: PointerEvent, item: TItem): void {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;

    const tableEl = target.closest("table")!;
    const tbody = tableEl.querySelector("tbody")!;
    const rows = Array.from(tbody.rows);

    setDragState({ draggingItem: item, targetItem: null, position: null });

    startPointerDrag(target, e.pointerId, {
      onMove(ev) {
        let foundTarget: TItem | null = null;
        let foundPosition: "before" | "after" | "inside" | null = null;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rect = row.getBoundingClientRect();
          if (ev.clientY < rect.top || ev.clientY > rect.bottom) continue;

          if (i >= displayItems().length) break;
          const flat = displayItems()[i];
          if (flat.item === item) break;

          // Cannot drop to child items of self
          if (isDescendant(item, flat.item)) break;

          const relY = ev.clientY - rect.top;
          const third = rect.height / 3;

          if (relY < third) {
            foundPosition = "before";
          } else if (relY > third * 2) {
            foundPosition = "after";
          } else {
            foundPosition = props.itemChildren
              ? "inside"
              : relY < rect.height / 2
                ? "before"
                : "after";
          }
          foundTarget = flat.item;
          break;
        }

        setDragState({ draggingItem: item, targetItem: foundTarget, position: foundPosition });

        // Update indicator DOM
        for (let i = 0; i < rows.length; i++) {
          rows[i].removeAttribute("data-dragging");
          rows[i].removeAttribute("data-drag-over");

          if (i < displayItems().length) {
            const flat = displayItems()[i];
            if (flat.item === item) {
              rows[i].setAttribute("data-dragging", "");
            }
            if (flat.item === foundTarget && foundPosition === "inside") {
              rows[i].setAttribute("data-drag-over", "inside");
            }
          }
        }

        // before/after indicator
        const indicatorEl = tableEl
          .closest("[data-sheet-scroll]")
          ?.querySelector("[data-reorder-indicator]") as HTMLElement | null;
        if (indicatorEl) {
          if (foundTarget != null && foundPosition != null && foundPosition !== "inside") {
            const targetIdx = displayItems().findIndex((f) => f.item === foundTarget);
            if (targetIdx >= 0) {
              const targetRow = rows[targetIdx];
              const containerRect = tableEl.closest("[data-sheet-scroll]")!.getBoundingClientRect();
              const rowRect = targetRow.getBoundingClientRect();
              const scrollEl = tableEl.closest("[data-sheet-scroll]") as HTMLElement;

              const top =
                foundPosition === "before"
                  ? rowRect.top - containerRect.top + scrollEl.scrollTop
                  : rowRect.bottom - containerRect.top + scrollEl.scrollTop;

              indicatorEl.style.display = "block";
              indicatorEl.style.top = `${top}px`;
            }
          } else {
            indicatorEl.style.display = "none";
          }
        }
      },
      onEnd() {
        const state = dragState();
        if (state?.targetItem != null && state.position != null) {
          props.onItemsReorder?.({
            item: state.draggingItem,
            targetItem: state.targetItem,
            position: state.position,
          } as DataSheetReorderEvent<TItem>);
        }

        // Clean up
        for (const row of rows) {
          row.removeAttribute("data-dragging");
          row.removeAttribute("data-drag-over");
        }
        const indicatorEl = tableEl
          .closest("[data-sheet-scroll]")
          ?.querySelector("[data-reorder-indicator]") as HTMLElement | null;
        if (indicatorEl) {
          indicatorEl.style.display = "none";
        }

        setDragState(null);
      },
    });
  }

  return {
    dragState,
    setDragState,
    onReorderPointerDown,
  };
}
