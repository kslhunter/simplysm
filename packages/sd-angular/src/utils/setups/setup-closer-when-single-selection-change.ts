import { $effect } from "../bindings/$effect";
import { $signal } from "../bindings/$signal";
import { OutputEmitterRef, Signal } from "@angular/core";
import { ISelectModalOutputResult } from "../../advanced/sd-data-view/sd-data-select-button.control";

export function setupCloserWhenSingleSelectionChange<TKey, TItem>(bindings: {
  selectedItemKeys: Signal<TKey[]>;
  selectedItems: Signal<TItem[]>;

  selectMode: () => "single" | "multi" | undefined;
  close: OutputEmitterRef<ISelectModalOutputResult<TItem>>;
}) {
  const orgFirstSelectedItemKey = $signal<TKey>();

  $effect([], () => {
    orgFirstSelectedItemKey.set(bindings.selectedItemKeys().first());
  });

  $effect([bindings.selectedItemKeys], () => {
    if (
      bindings.selectMode() === "single" &&
      orgFirstSelectedItemKey() !== bindings.selectedItemKeys().first()
    ) {
      bindings.close.emit({
        selectedItemKeys: bindings.selectedItemKeys(),
        selectedItems: bindings.selectedItems(),
      });
    }
  });
}
