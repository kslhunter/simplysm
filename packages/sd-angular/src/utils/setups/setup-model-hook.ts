import { Signal, WritableSignal } from "@angular/core";

export function setupModelHook<T, S extends WritableSignal<T>>(
  model: S,
  canFn: Signal<(item: T) => boolean | Promise<boolean>>,
): void {
  const orgSet = model.set;
  model.set = (value) => {
    const canSet = canFn()(value);

    if (canSet === false) {
      return;
    }

    if (canSet === true) {
      orgSet(value);
      return;
    }

    void canSet.then(() => {
      orgSet(value);
    });
  };
}
