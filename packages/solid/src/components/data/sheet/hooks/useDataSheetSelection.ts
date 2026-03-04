import { createSignal, type Accessor } from "solid-js";
import type { FlatItem } from "../types";
import { createControllableSignal } from "../../../../hooks/createControllableSignal";

export interface UseDataSheetSelectionProps<TItem> {
  selectMode?: "single" | "multiple";
  selectedItems?: TItem[];
  onSelectedItemsChange?: (items: TItem[]) => void;
  isItemSelectable?: (item: TItem) => boolean | string;
}

export interface UseDataSheetSelectionReturn<TItem> {
  selectedItems: Accessor<TItem[]>;
  setSelectedItems: (newValue: TItem[] | ((prev: TItem[]) => TItem[])) => TItem[];
  getItemSelectable: (item: TItem) => boolean | string;
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
  const [selectedItems, setSelectedItems] = createControllableSignal({
    value: () => props.selectedItems ?? [],
    onChange: () => props.onSelectedItemsChange,
  });

  const [lastClickedRow, setLastClickedRow] = createSignal<number | null>(null);
  const [lastClickAction, setLastClickAction] = createSignal<"select" | "deselect">("select");

  function getItemSelectable(item: TItem): boolean | string {
    if (!props.isItemSelectable) return true;
    return props.isItemSelectable(item);
  }

  function toggleSelect(item: TItem): void {
    if (getItemSelectable(item) !== true) return;
    const isSelected = selectedItems().includes(item);
    setLastClickAction(isSelected ? "deselect" : "select");

    if (props.selectMode === "single") {
      setSelectedItems(isSelected ? [] : [item]);
    } else {
      setSelectedItems(
        isSelected ? selectedItems().filter((i) => i !== item) : [...selectedItems(), item],
      );
    }
  }

  function toggleSelectAll(): void {
    const selectableItems = displayItems()
      .map((flat) => flat.item)
      .filter((item) => getItemSelectable(item) === true);
    const isAllSelected = selectableItems.every((item) => selectedItems().includes(item));
    setSelectedItems(isAllSelected ? [] : selectableItems);
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
      const newItems = [...selectedItems()];
      for (const item of rangeItems) {
        if (!newItems.includes(item)) newItems.push(item);
      }
      setSelectedItems(newItems);
    } else {
      setSelectedItems(selectedItems().filter((item) => !rangeItems.includes(item)));
    }
  }

  return {
    selectedItems,
    setSelectedItems,
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
