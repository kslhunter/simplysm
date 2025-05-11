import { computed, Signal, WritableSignal } from "@angular/core";

export function useExpandingManager<T>(binding: {
  items: Signal<T[]>;
  expandedItems: WritableSignal<T[]>;
  getChildrenFn: Signal<((item: T, index: number) => T[] | undefined) | undefined>;
  sort: (items: T[]) => T[];
}) {
  const itemDefs = computed(() => {
    let rootItems: IExpandItemDef<T>[] = binding.items().map((item) => ({
      item,
      parentDef: undefined,
      hasChildren: false,
      depth: 0,
    }));

    const getChildrenFn = binding.getChildrenFn();
    if (!getChildrenFn) return rootItems;

    const queue: IExpandItemDef<T>[] = [...rootItems];
    const result: IExpandItemDef<T>[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const children = getChildrenFn(current.item, result.length - 1) ?? [];
      if (children.length > 0) {
        current.hasChildren = true;

        let displayChildren = children;
        displayChildren = binding.sort(displayChildren);

        const childDefs: IExpandItemDef<T>[] = displayChildren.map((child) => ({
          item: child,
          parentDef: current,
          hasChildren: false,
          depth: current.depth + 1,
        }));

        queue.push(...childDefs);
      }
    }

    return result;
  });

  const displayItems = computed(() => itemDefs().map(item => item.item));

  const expandableItems = computed(() =>
    itemDefs().filter((itemDef) => itemDef.hasChildren).map((itemDef) => itemDef.item),
  );

  const hasExpandable = computed(() => expandableItems().length > 0);

  const isAllExpanded = computed(
    () =>
      expandableItems().length <= binding.expandedItems().length &&
      expandableItems().every((item) => binding.expandedItems().includes(item)),
  );

  function toggle(item: T) {
    binding.expandedItems.update((v) => {
      const r = [...v];
      if (r.includes(item)) {
        r.remove(item);
      }
      else {
        r.push(item);
      }
      return r;
    });
  }

  function isVisible(item: T) {
    let itemDef = itemDefs().single(item1 => item1.item === item);
    while (itemDef?.parentDef) {
      if (!binding.expandedItems().some((item1) => item1 === itemDef!.parentDef!.item)) {
        return false;
      }

      itemDef = itemDef.parentDef;
    }
    return true;
  }

  function def(item: T) {
    const itemDef = itemDefs().single(item1 => item1.item === item);
    return itemDef!;
  }

  function toggleAll() {
    if (isAllExpanded()) {
      binding.expandedItems.set([]);
    }
    else {
      const expandedItems = itemDefs()
        .filter((item) => item.hasChildren)
        .map((item) => item.item);
      binding.expandedItems.set(expandedItems);
    }
  }

  return {
    displayItems,
    hasExpandable,
    isAllExpanded,
    toggle,
    toggleAll,
    isVisible,
    def,
  };
}

export interface IExpandItemDef<T> {
  item: T;
  parentDef: IExpandItemDef<T> | undefined;
  hasChildren: boolean;
  depth: number;
}