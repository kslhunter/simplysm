import { createMemo, type Accessor } from "solid-js";
import type { FlatItem } from "../DataSheet.types";
import { collectAllExpandable, flattenTree } from "../DataSheet.utils";
import { createControllableSignal } from "../../../../hooks/createControllableSignal";

export interface UseDataSheetExpansionProps<TItem> {
  expandedItems?: TItem[];
  onExpandedItemsChange?: (items: TItem[]) => void;
  itemChildren?: (item: TItem, index: number) => TItem[] | undefined;
}

export interface UseDataSheetExpansionReturn<TItem> {
  expandedItems: Accessor<TItem[]>;
  setExpandedItems: (newValue: TItem[] | ((prev: TItem[]) => TItem[])) => TItem[];
  flatItems: Accessor<FlatItem<TItem>[]>;
  toggleExpand: (item: TItem) => void;
  isAllExpanded: Accessor<boolean>;
  toggleExpandAll: () => void;
}

export function useDataSheetExpansion<TItem>(
  props: UseDataSheetExpansionProps<TItem>,
  pagedItems: Accessor<TItem[]>,
  originalIndexMap: Accessor<Map<TItem, number>>,
): UseDataSheetExpansionReturn<TItem> {
  const [expandedItems, setExpandedItems] = createControllableSignal({
    value: () => props.expandedItems ?? [],
    onChange: () => props.onExpandedItemsChange,
  });

  function toggleExpand(item: TItem): void {
    const current = expandedItems();
    if (current.includes(item)) {
      setExpandedItems(current.filter((i) => i !== item));
    } else {
      setExpandedItems([...current, item]);
    }
  }

  function toggleExpandAll(): void {
    if (!props.itemChildren) return;
    const indexMap = originalIndexMap();
    const allExpandable = collectAllExpandable(
      pagedItems(),
      props.itemChildren,
      (item) => indexMap.get(item) ?? -1,
    );
    const isAllCurrentlyExpanded = allExpandable.every((item) =>
      expandedItems().includes(item),
    );
    setExpandedItems(isAllCurrentlyExpanded ? [] : allExpandable);
  }

  const flatItems = createMemo((): FlatItem<TItem>[] => {
    const indexMap = originalIndexMap();
    return flattenTree(
      pagedItems(),
      expandedItems(),
      props.itemChildren,
      (item) => indexMap.get(item) ?? -1,
    );
  });

  const isAllExpanded = createMemo(() => {
    if (!props.itemChildren) return false;
    const indexMap = originalIndexMap();
    const allExpandable = collectAllExpandable(
      pagedItems(),
      props.itemChildren,
      (item) => indexMap.get(item) ?? -1,
    );
    return (
      allExpandable.length > 0 && allExpandable.every((item) => expandedItems().includes(item))
    );
  });

  return {
    expandedItems,
    setExpandedItems,
    flatItems,
    toggleExpand,
    isAllExpanded,
    toggleExpandAll,
  };
}
