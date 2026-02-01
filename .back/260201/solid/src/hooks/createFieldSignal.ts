import { createSignal } from "solid-js";
import type { PrimitiveType } from "@simplysm/core-common";

export function createFieldSignal<T extends PrimitiveType | object>(options: {
  value: () => T;
  onChange: () => ((value: T) => void) | undefined;
}): [() => T, (value: T | ((prev: T) => T)) => T, () => boolean] {
  const [internalValue, setInternalValue] = createSignal<T>(options.value());

  const isControlled = () => options.onChange() != null;

  const value = () => (isControlled() ? options.value() : internalValue());
  const setValue = (val: T | ((prev: T) => T)): T => {
    const newValue = typeof val === "function" ? val(value()) : val;
    if (isControlled()) {
      options.onChange()!(newValue);
    } else {
      return setInternalValue(newValue);
    }
    return newValue;
  };

  return [value, setValue, isControlled];
}
