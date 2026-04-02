import { computed, type Signal, type WritableSignal } from "@angular/core";
import "@simplysm/core-common";

export interface IExpandItemDef<T> {
  item: T;
  parentDef: IExpandItemDef<T> | undefined;
  hasChildren: boolean;
  depth: number;
}

export function useExpandingManager<T>(binding: {
  items: Signal<T[]>;
  expandedItems: WritableSignal<T[]>;
  getChildrenFn: Signal<((item: T, index: number) => T[] | undefined) | undefined>;
  sort: (items: T[]) => T[];
}): {
  displayItems: Signal<T[]>;
  hasExpandable: Signal<boolean>;
  isAllExpanded: Signal<boolean>;
  toggle(item: T): void;
  toggleAll(): void;
  isVisible(item: T): boolean;
  def(item: T): IExpandItemDef<T>;
} {
  const allDefs = computed(() => {
    const getChildrenFn = binding.getChildrenFn();
    const defs: IExpandItemDef<T>[] = [];

    function walk(items: T[], parentDef: IExpandItemDef<T> | undefined, depth: number): void {
      const sorted = binding.sort(items);
      for (let i = 0; i < sorted.length; i++) {
        const item = sorted[i];
        const children = getChildrenFn?.(item, i);
        const hasChildren = children != null && children.length > 0;
        const itemDef: IExpandItemDef<T> = { item, parentDef, hasChildren, depth };
        defs.push(itemDef);
        if (hasChildren) {
          walk(children, itemDef, depth + 1);
        }
      }
    }

    walk(binding.items(), undefined, 0);
    return defs;
  });

  const displayItems = computed(() => allDefs().map((d) => d.item));

  const expandableDefs = computed(() => allDefs().filter((d) => d.hasChildren));

  const hasExpandable = computed(() => expandableDefs().length > 0);

  const _expandedSet = computed(() => new Set(binding.expandedItems()));

  const isAllExpanded = computed(() => {
    const expandable = expandableDefs();
    if (expandable.length === 0) return false;
    const expandedSet = _expandedSet();
    return expandable.every((d) => expandedSet.has(d.item));
  });

  const defMap = computed(() => {
    const map = new Map<T, IExpandItemDef<T>>();
    for (const d of allDefs()) {
      map.set(d.item, d);
    }
    return map;
  });

  function toggle(item: T): void {
    binding.expandedItems.update((arr) => {
      const next = [...arr];
      next.toggle(item);
      return next;
    });
  }

  function toggleAll(): void {
    if (isAllExpanded()) {
      binding.expandedItems.set([]);
    } else {
      binding.expandedItems.set(expandableDefs().map((d) => d.item));
    }
  }

  function isVisible(item: T): boolean {
    const map = defMap();
    const itemDef = map.get(item);
    if (itemDef == null) return false;

    const expandedSet = _expandedSet();
    let current = itemDef.parentDef;
    while (current != null) {
      if (!expandedSet.has(current.item)) {
        return false;
      }
      current = current.parentDef;
    }
    return true;
  }

  function def(item: T): IExpandItemDef<T> {
    const map = defMap();
    const d = map.get(item);
    if (d == null) {
      throw new Error(`Item not found in expanding manager`);
    }
    return d;
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
