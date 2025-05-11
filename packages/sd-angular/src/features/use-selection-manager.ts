import { computed, Signal, WritableSignal } from "@angular/core";

export function useSelectionManager<T>(binding: IBinding<T>) {
  const selectableItems = computed(() =>
    binding.displayItems().filter(item => isSelectable(item)),
  );

  const isAllSelected = computed(() =>
    selectableItems().length > 0 &&
    selectableItems().every(item => binding.selectedItems().includes(item)),
  );

  const hasSelectable = computed(() => selectableItems().length > 0);

  function isSelectable(item: T): boolean {
    const fn = binding.getIsItemSelectableFn();
    if (!fn) return true;
    return fn(item) === true;
  }

  function getDisabledMessage(item: T): string | undefined {
    const fn = binding.getIsItemSelectableFn();
    const res = fn?.(item);
    return typeof res === "string" ? res : undefined;
  }

  function toggle(item: T): void {
    if (!isSelectable(item)) return;

    if (binding.selectedItems().includes(item)) {
      binding.selectedItems.update(list => list.filter(i => i !== item));
    }
    else if (binding.selectMode() === "single") {
      binding.selectedItems.set([item]);
    }
    else {
      binding.selectedItems.update(list => [...list, item].distinct());
    }
  }

  function select(item: T): void {
    if (!isSelectable(item)) return;

    if (binding.selectMode() === "single") {
      binding.selectedItems.set([item]);
    }
    else {
      binding.selectedItems.update(list => [...list, item].distinct());
    }
  }

  function toggleAll() {
    if (isAllSelected()) {
      binding.selectedItems.update(v => v.filter(item => !binding.displayItems().includes(item)));
    }
    else {
      binding.selectedItems.update(v => [...v, ...selectableItems()].distinct());
    }
  }

  return {
    selectableItems,
    hasSelectable,
    isAllSelected,
    isSelectable,
    getDisabledMessage,
    toggle,
    select,
    toggleAll,
  };
}

interface IBinding<T> {
  displayItems: Signal<T[]>,
  selectedItems: WritableSignal<T[]>,
  selectMode: Signal<"single" | "multi" | undefined>,
  getIsItemSelectableFn: Signal<((item: T) => boolean | string) | undefined>
}