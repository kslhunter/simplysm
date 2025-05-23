import { $effect } from "../bindings/$effect";
import { $signal } from "../bindings/$signal";
import { OutputEmitterRef, Signal } from "@angular/core";
import { ISelectModalOutputResult } from "../../advanced/sd-select-modal-button.control";

export function setupCloserWhenSingleSelectionChange<T>(bindings: {
  selectMode: Signal<"single" | "multi" | undefined>;
  selectedItemKeys: Signal<T[]>;
  close: OutputEmitterRef<ISelectModalOutputResult>;
}) {
  const orgFirstSelectedItemKey = $signal<T>();

  $effect([], () => {
    orgFirstSelectedItemKey.set(bindings.selectedItemKeys().first());
  });

  $effect([bindings.selectedItemKeys], () => {
    if (
      bindings.selectMode() === "single" &&
      orgFirstSelectedItemKey() !== bindings.selectedItemKeys().first()
    ) {
      bindings.close.emit({ selectedItemKeys: bindings.selectedItemKeys() });
    }
  });
}
