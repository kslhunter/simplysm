import { Signal, WritableSignal } from "@angular/core";
import { ObjectUtils } from "@simplysm/sd-core-common";
import { $effect } from "../bindings/$effect";

export function setupCumulateSelectedKeys<T extends object, K>(options: {
  items: Signal<T[]>,
  selectMode: Signal<"single" | "multi" | undefined>,
  selectedItems: WritableSignal<T[]>,
  selectedItemKeys: WritableSignal<K[]>,
  keySelectorFn: (item: T) => K,
}): void {
  $effect([options.items, options.selectedItemKeys], () => {
    const newSelectedItems = options.items().filter((item) => {
      return options.selectedItemKeys().includes(options.keySelectorFn(item));
    });
    if (!ObjectUtils.equal(options.selectedItems(), newSelectedItems, { onlyOneDepth: true })) {
      options.selectedItems.set(newSelectedItems);
    }
  });

  $effect([options.selectedItems], () => {
    let newSelectedItemKeys: K[];

    newSelectedItemKeys = [...options.selectedItemKeys()];
    for (const item of options.items()) {
      if (options.selectedItems().includes(item)) {
        newSelectedItemKeys = [...newSelectedItemKeys, options.keySelectorFn(item)].distinct();
      }
      else {
        newSelectedItemKeys = newSelectedItemKeys.filter(v1 => v1 !== options.keySelectorFn(item));
      }
    }

    if (options.selectMode() === "single" && newSelectedItemKeys.length > 1) {
      newSelectedItemKeys = [newSelectedItemKeys.last()!];
    }

    if (!ObjectUtils.equal(
      newSelectedItemKeys,
      options.selectedItemKeys(),
      { onlyOneDepth: true },
    )) {
      options.selectedItemKeys.set(newSelectedItemKeys);
    }
  });
}