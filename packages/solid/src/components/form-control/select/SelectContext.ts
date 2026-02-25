import { createContext, useContext, type Accessor, type JSX } from "solid-js";
import type { SlotAccessor } from "../../../hooks/createSlotSignal";

export interface SelectContextValue<TValue = unknown> {
  /** Whether multiple select mode is enabled */
  multiple: Accessor<boolean>;

  /** Check if value is selected */
  isSelected: (value: TValue) => boolean;

  /** Toggle value selection/deselection */
  toggleValue: (value: TValue) => void;

  /** Close dropdown */
  closeDropdown: () => void;

  /** Register header slot */
  setHeader: (content: SlotAccessor) => void;

  /** Register action slot */
  setAction: (content: SlotAccessor) => void;

  /** Register item template */
  setItemTemplate: (fn: ((...args: unknown[]) => JSX.Element) | undefined) => void;
}

export const SelectContext = createContext<SelectContextValue>();

export function useSelectContext<TValue = unknown>(): SelectContextValue<TValue> {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error("useSelectContext can only be used inside Select component");
  }
  return context as SelectContextValue<TValue>;
}
