import { type OutputEmitterRef, type Signal, effect } from "@angular/core";
import type { ISelectModalOutputResult } from "../../../ui/form/button/sd-modal-select-button.control";

export function setupCloserWhenSingleSelectionChange<TItem, TKey>(options: {
  selectedItemKeys: Signal<TKey[]>;
  selectedItems: Signal<TItem[]>;
  selectMode: () => "single" | "multi" | undefined;
  close: OutputEmitterRef<ISelectModalOutputResult<TItem>>;
}): void {
  let initialized = false;

  effect(() => {
    const keys = options.selectedItemKeys();
    const items = options.selectedItems();

    if (!initialized) {
      initialized = true;
      return;
    }

    if (options.selectMode() !== "single") return;
    if (keys.length === 0) return;

    options.close.emit({
      selectedItemKeys: keys,
      selectedItems: items,
    });
  });
}
