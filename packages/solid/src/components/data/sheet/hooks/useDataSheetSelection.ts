import { createSignal, type Accessor } from "solid-js";
import type { FlatItem } from "../types";
import { createControllableSignal } from "../../../../hooks/createControllableSignal";

export interface UseDataSheetSelectionProps<TItem> {
  selectionMode?: "single" | "multiple";
  selection?: TItem[];
  onSelectionChange?: (items: TItem[]) => void;
  isItemSelectable?: (item: TItem) => true | string;
}

export interface UseDataSheetSelectionReturn<TItem> {
  selection: Accessor<TItem[]>;
  setSelection: (newValue: TItem[] | ((prev: TItem[]) => TItem[])) => TItem[];
  getItemSelectable: (item: TItem) => true | string;
  toggleSelect: (item: TItem) => void;
  toggleSelectAll: () => void;
  rangeSelect: (targetRow: number) => void;
  lastClickedRow: Accessor<number | null>;
  setLastClickedRow: (value: number | null) => void;
  lastClickAction: Accessor<"select" | "deselect">;
  setLastClickAction: (value: "select" | "deselect") => void;
}

export function useDataSheetSelection<TItem>(
  props: UseDataSheetSelectionProps<TItem>,
  displayItems: Accessor<FlatItem<TItem>[]>,
): UseDataSheetSelectionReturn<TItem> {
  const [selection, setSelection] = createControllableSignal({
    value: () => props.selection ?? [],
    onChange: () => props.onSelectionChange,
  });

  const [lastClickedRow, setLastClickedRow] = createSignal<number | null>(null);
  const [lastClickAction, setLastClickAction] = createSignal<"select" | "deselect">("select");

  function getItemSelectable(item: TItem): true | string {
    if (!props.isItemSelectable) return true;
    return props.isItemSelectable(item);
  }

  function toggleSelect(item: TItem): void {
    if (getItemSelectable(item) !== true) return;
    const isSelected = selection().includes(item);
    setLastClickAction(isSelected ? "deselect" : "select");

    if (props.selectionMode === "single") {
      setSelection(isSelected ? [] : [item]);
    } else {
      setSelection(
        isSelected ? selection().filter((i) => i !== item) : [...selection(), item],
      );
    }
  }

  function toggleSelectAll(): void {
    const selectableItems = displayItems()
      .map((flat) => flat.item)
      .filter((item) => getItemSelectable(item) === true);
    const isAllSelected = selectableItems.every((item) => selection().includes(item));
    setSelection(isAllSelected ? [] : selectableItems);
  }

  function rangeSelect(targetRow: number): void {
    const lastRow = lastClickedRow();
    if (lastRow == null) return;

    const start = Math.min(lastRow, targetRow);
    const end = Math.max(lastRow, targetRow);

    const rangeItems = displayItems()
      .slice(start, end + 1)
      .map((flat) => flat.item)
      .filter((item) => getItemSelectable(item) === true);

    if (lastClickAction() === "select") {
      const newItems = [...selection()];
      for (const item of rangeItems) {
        if (!newItems.includes(item)) newItems.push(item);
      }
      setSelection(newItems);
    } else {
      setSelection(selection().filter((item) => !rangeItems.includes(item)));
    }
  }

  return {
    selection,
    setSelection,
    getItemSelectable,
    toggleSelect,
    toggleSelectAll,
    rangeSelect,
    lastClickedRow,
    setLastClickedRow,
    lastClickAction,
    setLastClickAction,
  };
}
