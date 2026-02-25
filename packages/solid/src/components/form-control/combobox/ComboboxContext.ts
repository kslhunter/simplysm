import { type JSX, createContext, useContext } from "solid-js";

export interface ComboboxContextValue<TValue = unknown> {
  /** Check if value is selected */
  isSelected: (value: TValue) => boolean;

  /** Select value */
  selectValue: (value: TValue) => void;

  /** Close dropdown */
  closeDropdown: () => void;

  /** Register item template */
  setItemTemplate: (fn: ((...args: unknown[]) => JSX.Element) | undefined) => void;
}

export const ComboboxContext = createContext<ComboboxContextValue>();

export function useComboboxContext<TValue = unknown>(): ComboboxContextValue<TValue> {
  const context = useContext(ComboboxContext);
  if (!context) {
    throw new Error("useComboboxContext can only be used inside the Combobox component");
  }
  return context as ComboboxContextValue<TValue>;
}
