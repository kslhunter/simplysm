import { createMemo, type Accessor } from "solid-js";
import type { FlatItem } from "../DataSheet.types";
import { collectAllExpandable, flattenTree } from "../DataSheet.utils";
import { createControllableSignal } from "../../../../hooks/createControllableSignal";

export interface CreateDataSheetExpansionProps<TItem> {
  expandedItems?: TItem[];
  onExpandedItemsChange?: (items: TItem[]) => void;
  itemChildren?: (item: TItem, index: number) => TItem[] | undefined;
}

export interface CreateDataSheetExpansionReturn<TItem> {
  expandedItems: Accessor<TItem[]>;
  setExpandedItems: (newValue: TItem[] | ((prev: TItem[]) => TItem[])) => TItem[];
  flatItems: Accessor<FlatItem<TItem>[]>;
  toggleExpand: (item: TItem) => void;
  isAllExpanded: Accessor<boolean>;
  toggleExpandAll: () => void;
}

export function createDataSheetExpansion<TItem>(
  props: CreateDataSheetExpansionProps<TItem>,
  pagedItems: Accessor<TItem[]>,
  originalIndexMap: Accessor<Map<TItem, number>>,
): CreateDataSheetExpansionReturn<TItem> {
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

  const flatItems = createMemo((): FlatItem<TItem>[] => {
    const indexMap = originalIndexMap();
    return flattenTree(
      pagedItems(),
      expandedItems(),
      props.itemChildren,
      (item) => indexMap.get(item) ?? -1,
    );
  });

  const allExpandable = createMemo(() => {
    if (!props.itemChildren) return [];
    const indexMap = originalIndexMap();
    return collectAllExpandable(
      pagedItems(),
      props.itemChildren,
      (item) => indexMap.get(item) ?? -1,
    );
  });

  function toggleExpandAll(): void {
    const items = allExpandable();
    if (items.length === 0) return;
    const isAllCurrentlyExpanded = items.every((item) =>
      expandedItems().includes(item),
    );
    setExpandedItems(isAllCurrentlyExpanded ? [] : items);
  }

  const isAllExpanded = createMemo(() => {
    const items = allExpandable();
    return (
      items.length > 0 && items.every((item) => expandedItems().includes(item))
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
