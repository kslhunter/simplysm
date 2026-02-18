import type { Signal, WritableSignal } from "@angular/core";
import { ObjectUtils } from "@simplysm/sd-core-common";
import { $effect } from "../bindings/$effect";

export function setupCumulateSelectedKeys<T, K>(options: {
  items: Signal<T[]>;
  selectedItems: WritableSignal<T[]>;
  selectedItemKeys: WritableSignal<K[]>;

  selectMode: () => "single" | "multi" | undefined;
  keySelectorFn: (item: T, index: number) => K;
}): void {
  $effect([options.items, options.selectedItemKeys], () => {
    const newSelectedItems = options.items().filter((item, i) => {
      return options.selectedItemKeys().includes(options.keySelectorFn(item, i));
    });
    if (
      !ObjectUtils.equal(options.selectedItems(), newSelectedItems, {
        onlyOneDepth: true,
        ignoreArrayIndex: true,
      })
    ) {
      options.selectedItems.set(newSelectedItems);
    }
  });

  $effect([options.selectedItems], () => {
    let newSelectedItemKeys: K[];

    newSelectedItemKeys = [...options.selectedItemKeys()];
    for (let i = 0; i < options.items().length; i++) {
      const item = options.items()[i];

      if (options.selectedItems().includes(item)) {
        newSelectedItemKeys = [...newSelectedItemKeys, options.keySelectorFn(item, i)].distinct();
      } else {
        newSelectedItemKeys = newSelectedItemKeys.filter(
          (v1) => v1 !== options.keySelectorFn(item, i),
        );
      }
    }

    if (options.selectMode() === "single" && newSelectedItemKeys.length > 1) {
      newSelectedItemKeys = [newSelectedItemKeys.last()!];
    }

    if (
      !ObjectUtils.equal(newSelectedItemKeys, options.selectedItemKeys(), {
        onlyOneDepth: true,
        ignoreArrayIndex: true,
      })
    ) {
      options.selectedItemKeys.set(newSelectedItemKeys);
    }
  });
}
