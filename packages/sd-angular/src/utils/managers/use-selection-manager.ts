import { Signal, WritableSignal } from "@angular/core";
import { $computed } from "../bindings/$computed";

export function useSelectionManager<T>(options: {
  displayItems: Signal<T[]>,
  selectedItems: WritableSignal<T[]>,
  selectMode: Signal<"single" | "multi" | undefined>,
  getIsItemSelectableFn: Signal<((item: T) => boolean | string) | undefined>
}) {
  const selectableItems = $computed(() =>
    options.displayItems().filter(item => isSelectable(item)),
  );

  const isAllSelected = $computed(() =>
    selectableItems().length > 0 &&
    selectableItems().every(item => options.selectedItems().includes(item)),
  );

  const hasSelectable = $computed(() => selectableItems().length > 0);

  function isSelectable(item: T): boolean {
    const fn = options.getIsItemSelectableFn();
    if (!fn) return true;
    return fn(item) === true;
  }

  function getDisabledMessage(item: T): string | undefined {
    const fn = options.getIsItemSelectableFn();
    const res = fn?.(item);
    return typeof res === "string" ? res : undefined;
  }

  function toggle(item: T): void {
    if (!isSelectable(item)) return;

    if (options.selectedItems().includes(item)) {
      options.selectedItems.update(list => list.filter(i => i !== item));
    }
    else if (options.selectMode() === "single") {
      options.selectedItems.set([item]);
    }
    else {
      options.selectedItems.update(list => [...list, item].distinct());
    }
  }

  function select(item: T): void {
    if (!isSelectable(item)) return;

    if (options.selectMode() === "single") {
      options.selectedItems.set([item]);
    }
    else {
      options.selectedItems.update(list => [...list, item].distinct());
    }
  }

  function toggleAll() {
    if (isAllSelected()) {
      options.selectedItems.update(v => v.filter(item => !options.displayItems().includes(item)));
    }
    else {
      options.selectedItems.update(v => [...v, ...selectableItems()].distinct());
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