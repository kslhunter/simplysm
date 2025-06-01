import { Signal, WritableSignal } from "@angular/core";
import { $computed } from "../bindings/$computed";

export class SdSelectionManager<T> {
  constructor(
    private readonly _options: {
      displayItems: Signal<T[]>;
      selectedItems: WritableSignal<T[]>;
      selectMode: Signal<"single" | "multi" | undefined>;
      getItemSelectableFn: Signal<((item: T) => boolean | string) | undefined>;
    },
  ) {}

  #selectableItems = $computed(() =>
    this._options.displayItems().filter((item) => this.getSelectable(item) === true),
  );

  hasSelectable = $computed(() => this.#selectableItems().length > 0);

  isAllSelected = $computed(
    () =>
      this.hasSelectable() &&
      this.#selectableItems().every((item) => this._options.selectedItems().includes(item)),
  );

  getCanChangeFn(item: T) {
    return (): boolean => this.getSelectable(item) === true;
  }

  getSelectable(item: T): true | string | undefined {
    const fn = this._options.getItemSelectableFn();
    if (!fn) return true;
    const result = fn(item);
    if (result === true) return true;
    return result === false ? undefined : result;
  }

  toggleAll() {
    if (this.isAllSelected()) {
      this._options.selectedItems.update((v) =>
        v.filter((item) => !this.#selectableItems().includes(item)),
      );
    } else {
      this._options.selectedItems.update((v) => [...v, ...this.#selectableItems()].distinct());
    }
  }

  select(item: T) {
    if (this._options.selectMode() === "single") {
      this._options.selectedItems.set([item]);
    } else {
      this._options.selectedItems.update((list) => [...list, item].distinct());
    }
  }

  toggle(item: T) {
    if (this._options.selectedItems().includes(item)) {
      this._options.selectedItems.update((list) => list.filter((i) => i !== item));
    } else if (this._options.selectMode() === "single") {
      this._options.selectedItems.set([item]);
    } else {
      this._options.selectedItems.update((list) => [...list, item].distinct());
    }
  }
}
