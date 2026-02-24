import { createSignal, createEffect } from "solid-js";

/**
 * Utility type that restricts function types.
 * If a function type is passed, it is converted to never, causing a compile-time error.
 *
 * @remarks
 * To store a function, wrap it in an object: `createControllableSignal<{ fn: () => void }>(...)`
 */
type NotFunction<TValue> = TValue extends (...args: unknown[]) => unknown ? never : TValue;

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
  value: () => TValue & NotFunction<TValue>;
  onChange: () => ((value: TValue) => void) | undefined;
}) {
  const [internalValue, setInternalValue] = createSignal<TValue>(options.value());

  // Sync internal state when props change (props take precedence)
  createEffect(() => {
    const propValue = options.value();
    setInternalValue(() => propValue);
  });

  const isControlled = () => options.onChange() !== undefined;
  const value = () => (isControlled() ? options.value() : internalValue());
  const setValue = (newValue: TValue | ((prev: TValue) => TValue)) => {
    const resolved =
      typeof newValue === "function" ? (newValue as (prev: TValue) => TValue)(value()) : newValue;

    if (isControlled()) {
      options.onChange()?.(resolved);
    } else {
      setInternalValue(() => resolved);
    }
  };

  return [value, setValue] as const;
}
