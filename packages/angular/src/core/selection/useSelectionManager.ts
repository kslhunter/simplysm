import { computed, type Signal, type WritableSignal } from "@angular/core";
import { obj } from "@simplysm/core-common";

export function useSelectionManager<TItem, TKey>(options: {
  displayItems: Signal<TItem[]>;
  selectedKeys: WritableSignal<NonNullable<TKey>[]>;
  selectMode: Signal<"single" | "multi" | undefined>;
  getItemSelectableFn: Signal<((item: TItem) => boolean | string) | undefined>;
  trackByFn: Signal<(item: TItem, index: number) => TKey>;
}): {
  hasSelectable: Signal<boolean>;
  isAllSelected: Signal<boolean>;
  getSelectable(item: TItem): true | string | undefined;
  getCanChangeFn(item: TItem): () => boolean;
  select(item: TItem): void;
  deselect(item: TItem): void;
  toggle(item: TItem): void;
  toggleAll(): void;
  isSelected(item: TItem): boolean;
} {
  const selectableItems = computed(() => {
    const trackFn = options.trackByFn();
    const idxMap = new Map<TItem, number>();
    options.displayItems().forEach((it, i) => idxMap.set(it, i));
    const fn = options.getItemSelectableFn();
    return options.displayItems().filter((item) => {
      if (trackFn(item, idxMap.get(item) ?? 0) == null) return false;
      if (fn == null) return true;
      return fn(item) === true;
    });
  });

  const hasSelectable = computed(() => {
    return options.selectMode() != null;
  });

  const displayItemIndexMap = computed(() => {
    const map = new Map<TItem, number>();
    options.displayItems().forEach((it, i) => map.set(it, i));
    return map;
  });

  function isKeyEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    return obj.equal(a, b);
  }

  function keyOf(item: TItem): TKey {
    const idx = displayItemIndexMap().get(item);
    return options.trackByFn()(item, idx ?? 0);
  }

  const isAllSelected = computed(() => {
    const items = selectableItems();
    if (items.length === 0) return false;
    const keys = options.selectedKeys();
    const fn = options.trackByFn();
    return items.every((it, i) => {
      const key = fn(it, i);
      return keys.some((k) => isKeyEqual(k, key));
    });
  });

  function getSelectable(item: TItem): true | string | undefined {
    const mode = options.selectMode();
    if (mode == null) return undefined;
    if (keyOf(item) == null) return undefined;
    const fn = options.getItemSelectableFn();
    if (fn == null) return true;
    const result = fn(item);
    if (result === true) return true;
    if (result === false) return undefined;
    return result; // string reason
  }

  function getCanChangeFn(item: TItem): () => boolean {
    return () => {
      const selectable = getSelectable(item);
      return selectable === true;
    };
  }

  function select(item: TItem): void {
    const mode = options.selectMode();
    if (mode == null) return;
    if (getSelectable(item) !== true) return;

    const key = keyOf(item);
    if (key == null) return;

    if (mode === "single") {
      options.selectedKeys.set([key]);
      return;
    }

    options.selectedKeys.update((arr) => {
      if (arr.some((k) => isKeyEqual(k, key))) return arr;
      return [...arr, key];
    });
  }

  function deselect(item: TItem): void {
    const key = keyOf(item);
    options.selectedKeys.update((arr) =>
      arr.filter((k) => !isKeyEqual(k, key)),
    );
  }

  function toggle(item: TItem): void {
    if (isSelected(item)) {
      deselect(item);
    } else {
      select(item);
    }
  }

  function toggleAll(): void {
    const selectable = selectableItems();
    const fn = options.trackByFn();
    const idxMap = displayItemIndexMap();

    if (isAllSelected()) {
      const keysToRemove = selectable.map((it) => fn(it, idxMap.get(it) ?? 0));
      options.selectedKeys.update((arr) =>
        arr.filter((k) => !keysToRemove.some((rk) => isKeyEqual(rk, k))),
      );
    } else {
      options.selectedKeys.update((arr) => {
        const newKeys = selectable
          .map((it) => fn(it, idxMap.get(it) ?? 0))
          .filter((k): k is NonNullable<TKey> => k != null)
          .filter((k) => !arr.some((ek) => isKeyEqual(ek, k)));
        return [...arr, ...newKeys];
      });
    }
  }

  function isSelected(item: TItem): boolean {
    const key = keyOf(item);
    return options.selectedKeys().some((k) => isKeyEqual(k, key));
  }

  return {
    hasSelectable,
    isAllSelected,
    getSelectable,
    getCanChangeFn,
    select,
    deselect,
    toggle,
    toggleAll,
    isSelected,
  };
}
