import { createContext, useContext, type JSX } from "solid-js";
import type { SlotAccessor } from "../../../hooks/createSlotSignal";

export interface SelectListContextValue {
  /** Header 슬롯 등록 */
  setHeader: (content: SlotAccessor) => void;

  /** Filter 슬롯 등록 */
  setFilter: (content: SlotAccessor) => void;

  /** ItemTemplate 등록 */
  setItemTemplate: (fn: ((...args: unknown[]) => JSX.Element) | undefined) => void;
}

export const SelectListContext = createContext<SelectListContextValue>();

export function useSelectListContext(): SelectListContextValue {
  const context = useContext(SelectListContext);
  if (!context) {
    throw new Error("useSelectListContext는 SelectList 컴포넌트 내부에서만 사용할 수 있습니다");
  }
  return context;
}
