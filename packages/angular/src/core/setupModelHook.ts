import { ErrorHandler, inject, type Signal, type WritableSignal } from "@angular/core";

export function setupModelHook<T>(
  model: WritableSignal<T>,
  canFn: Signal<(item: T) => boolean | Promise<boolean>>,
): void {
  const errorHandler = inject(ErrorHandler);
  const orgSet = model.set.bind(model);

  model.set = (value) => {
    const canSet = canFn()(value);

    if (canSet === false) {
      return;
    }

    if (canSet === true) {
      orgSet(value);
      return;
    }

    void canSet.then((allowed) => {
      if (allowed !== false) {
        orgSet(value);
      }
    }).catch((err) => {
      errorHandler.handleError(err);
    });
  };

  model.update = (fn) => {
    const value = fn(model());
    const canSet = canFn()(value);

    if (canSet === false) {
      return;
    }

    if (canSet === true) {
      orgSet(value);
      return;
    }

    void canSet
      .then((allowed) => {
        if (allowed !== false) {
          orgSet(value);
        }
      })
      .catch((err) => {
        errorHandler.handleError(err);
      });
  };
}
