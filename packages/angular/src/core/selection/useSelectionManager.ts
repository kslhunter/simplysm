import { computed, type Signal, type WritableSignal } from "@angular/core";

export function useSelectionManager<T>(options: {
  displayItems: Signal<T[]>;
  selectedItems: WritableSignal<T[]>;
  selectMode: Signal<"single" | "multi" | undefined>;
  getItemSelectableFn: Signal<((item: T) => boolean | string) | undefined>;
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

  const selectedItemsSet = computed(() => new Set(options.selectedItems()));

  const isAllSelected = computed(() => {
    const items = selectableItems();
    if (items.length === 0) return false;
    const set = selectedItemsSet();
    return items.every((item) => set.has(item));
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
    } else {
      options.selectedItems.update((arr) => {
        if (arr.includes(item)) return arr;
        return [...arr, item];
      });
    }
  }

  function deselect(item: T): void {
    options.selectedItems.update((arr) => arr.filter((i) => i !== item));
  }

  function toggle(item: T): void {
    if (isSelected(item)) {
      deselect(item);
    } else {
      select(item);
    }
  }

  function toggleAll(): void {
    if (isAllSelected()) {
      options.selectedItems.set([]);
    } else {
      options.selectedItems.set([...selectableItems()]);
    }
  }

  function isSelected(item: T): boolean {
    return selectedItemsSet().has(item);
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
