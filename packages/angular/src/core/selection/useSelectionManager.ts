import { computed, type Signal, type WritableSignal } from "@angular/core";
import { obj } from "@simplysm/core-common";

export function useSelectionManager<T>(options: {
  displayItems: Signal<T[]>;
  selectedItems: WritableSignal<T[]>;
  selectMode: Signal<"single" | "multi" | undefined>;
  getItemSelectableFn: Signal<((item: T) => boolean | string) | undefined>;
  trackByFn: Signal<(item: T, index: number) => unknown>;
}): {
  hasSelectable: Signal<boolean>;
  isAllSelected: Signal<boolean>;
  getSelectable(item: T): true | string | undefined;
  getCanChangeFn(item: T): () => boolean;
  select(item: T): void;
  deselect(item: T): void;
  toggle(item: T): void;
  toggleAll(): void;
  isSelected(item: T): boolean;
} {
  const selectableItems = computed(() => {
    const fn = options.getItemSelectableFn();
    if (fn == null) return options.displayItems();
    return options.displayItems().filter((item) => fn(item) === true);
  });

  const hasSelectable = computed(() => {
    return options.selectMode() != null;
  });

  const displayItemIndexMap = computed(() => {
    const map = new Map<T, number>();
    options.displayItems().forEach((it, i) => map.set(it, i));
    return map;
  });

  const selectedKeys = computed(() => {
    const fn = options.trackByFn();
    return options.selectedItems().map((it, i) => fn(it, i));
  });

  function isKeyEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    return obj.equal(a, b);
  }

  function keyOf(item: T): unknown {
    const idx = displayItemIndexMap().get(item);
    return options.trackByFn()(item, idx ?? 0);
  }

  const isAllSelected = computed(() => {
    const items = selectableItems();
    if (items.length === 0) return false;
    const keys = selectedKeys();
    const fn = options.trackByFn();
    return items.every((it, i) => {
      const key = fn(it, i);
      return keys.some((k) => isKeyEqual(k, key));
    });
  });

  function getSelectable(item: T): true | string | undefined {
    const mode = options.selectMode();
    if (mode == null) return undefined;
    const fn = options.getItemSelectableFn();
    if (fn == null) return true;
    const result = fn(item);
    if (result === true) return true;
    if (result === false) return undefined;
    return result; // string reason
  }

  function getCanChangeFn(item: T): () => boolean {
    return () => {
      const selectable = getSelectable(item);
      return selectable === true;
    };
  }

  function select(item: T): void {
    const mode = options.selectMode();
    if (mode == null) return;
    if (getSelectable(item) !== true) return;

    if (mode === "single") {
      options.selectedItems.set([item]);
      return;
    }

    const key = keyOf(item);
    const fn = options.trackByFn();
    options.selectedItems.update((arr) => {
      if (arr.some((it, i) => isKeyEqual(fn(it, i), key))) return arr;
      return [...arr, item];
    });
  }

  function deselect(item: T): void {
    const key = keyOf(item);
    const fn = options.trackByFn();
    options.selectedItems.update((arr) =>
      arr.filter((it, i) => !isKeyEqual(fn(it, i), key)),
    );
  }

  function toggle(item: T): void {
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
      options.selectedItems.update((arr) =>
        arr.filter((it, i) => {
          const k = fn(it, i);
          return !keysToRemove.some((rk) => isKeyEqual(rk, k));
        }),
      );
    } else {
      options.selectedItems.update((arr) => {
        const existingKeys = arr.map((it, i) => fn(it, i));
        const toAdd = selectable.filter((it) => {
          const k = fn(it, idxMap.get(it) ?? 0);
          return !existingKeys.some((ek) => isKeyEqual(ek, k));
        });
        return [...arr, ...toAdd];
      });
    }
  }

  function isSelected(item: T): boolean {
    const key = keyOf(item);
    return selectedKeys().some((k) => isKeyEqual(k, key));
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
