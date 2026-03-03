import { type Accessor, createEffect, createSignal, type Signal } from "solid-js";

/**
 * Signal hook that supports the controlled/uncontrolled pattern.
 *
 * @remarks
 * - When `onChange` is provided: controlled mode, value managed externally
 * - When `onChange` is absent: uncontrolled mode, uses internal state
 * - Supports functional setter: `setValue(prev => !prev)`
 *
 * @example
 * ```tsx
 * // Controlled mode (onOpenChange provided)
 * const [open, setOpen] = createControllableSignal({
 *   value: () => props.open ?? false,
 *   onChange: () => props.onOpenChange,
 * });
 *
 * // Uncontrolled mode (onOpenChange not provided)
 * const [open, setOpen] = createControllableSignal({
 *   value: () => props.open ?? false,
 *   onChange: () => undefined,
 * });
 *
 * // Functional setter
 * setOpen(prev => !prev);
 * ```
 */
export function createControllableSignal<TValue>(options: {
  value: Accessor<TValue>;
  onChange: Accessor<((value: TValue) => void) | undefined>;
}) {
  const [internalValue, setInternalValue] = createSignal<TValue>(options.value());

  // Sync internal state when props change (props take precedence)
  createEffect(() => {
    const propValue = options.value();
    setInternalValue(() => propValue);
  });

  const isControlled = () => options.onChange() != null;
  const value = () => (isControlled() ? options.value() : internalValue());
  const setValue = (newValue: any) => {
    const resolved = newValue instanceof Function ? newValue(value()) : newValue;

    if (isControlled()) {
      options.onChange()?.(resolved);
    } else {
      setInternalValue(() => resolved);
    }

    return resolved;
  };

  return [value, setValue] as Signal<TValue>;
}
