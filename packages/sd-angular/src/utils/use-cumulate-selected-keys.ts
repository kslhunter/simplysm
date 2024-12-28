import { Signal, WritableSignal } from "@angular/core";
import { ObjectUtils } from "@simplysm/sd-core-common";
import { $effect } from "./hooks";

export function useCumulateSelectedKeys<T extends object, K>(
  items: Signal<T[]>,
  selectMode: Signal<"single" | "multi" | undefined>,
  selectedItems: WritableSignal<T[]>,
  selectedItemKeys: WritableSignal<K[]>,
  keySelectorFn: (item: T) => K,
) {
  $effect([items, selectedItemKeys], () => {
    const newSelectedItems = items().filter((item) => {
      return selectedItemKeys().includes(keySelectorFn(item));
    });
    if (!ObjectUtils.equal(selectedItems(), newSelectedItems, { onlyOneDepth: true })) {
      selectedItems.set(newSelectedItems);
    }
  });

  $effect([selectedItems], () => {
    let newSelectedItemKeys: K[];

    if (selectMode() === "single") {
      newSelectedItemKeys = selectedItems().map((item) => keySelectorFn(item));
      selectedItemKeys.set(selectedItems().map((item) => keySelectorFn(item)));
    }
    else {
      newSelectedItemKeys = [...selectedItemKeys()];
      for (const item of items()) {
        if (selectedItems().includes(item)) {
          newSelectedItemKeys = [...newSelectedItemKeys, keySelectorFn(item)].distinct();
        }
        else {
          newSelectedItemKeys = newSelectedItemKeys.filter(v1 => v1 !== keySelectorFn(item));
        }
      }
    }

    if (!ObjectUtils.equal(newSelectedItemKeys, selectedItemKeys(), { onlyOneDepth: true })) {
      selectedItemKeys.set(newSelectedItemKeys);
    }
  });
}