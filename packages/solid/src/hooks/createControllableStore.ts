import { createEffect } from "solid-js";
import { createStore, reconcile, unwrap } from "solid-js/store";
import type { SetStoreFunction } from "solid-js/store";
import { objClone } from "@simplysm/core-common";

/**
 * Store hook that supports the controlled/uncontrolled pattern.
 *
 * @remarks
 * - When `onChange` is provided: controlled mode, notifies changes via onChange on setter calls
 * - When `onChange` is absent: uncontrolled mode, uses internal store only
 * - Supports all SetStoreFunction overloads (path-based, produce, reconcile, etc.)
 *
 * @example
 * ```tsx
 * // Controlled mode (onItemsChange provided)
 * const [items, setItems] = createControllableStore<Item[]>({
 *   value: () => props.items ?? [],
 *   onChange: () => props.onItemsChange,
 * });
 *
 * // Uncontrolled mode (onItemsChange not provided)
 * const [items, setItems] = createControllableStore<Item[]>({
 *   value: () => [],
 *   onChange: () => undefined,
 * });
 * ```
 */
export function createControllableStore<TValue extends object>(options: {
  value: () => TValue;
  onChange: () => ((value: TValue) => void) | undefined;
}): [TValue, SetStoreFunction<TValue>] {
  const [store, rawSet] = createStore<TValue>(objClone(options.value()));

  // Sync internal store when external value changes
  createEffect(() => {
    rawSet(reconcile(options.value()) as any);
  });

  // Wrap setter with a function wrapper to add onChange notification
  const wrappedSet = ((...args: any[]) => {
    const before = JSON.stringify(unwrap(store));
    (rawSet as any)(...args);
    const after = JSON.stringify(unwrap(store));
    if (before !== after) {
      options.onChange()?.(objClone(unwrap(store)));
    }
  }) as SetStoreFunction<TValue>;

  return [store, wrappedSet];
}
