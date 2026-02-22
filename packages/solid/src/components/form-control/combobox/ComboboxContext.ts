import { type JSX, createContext, useContext } from "solid-js";

export interface ComboboxContextValue<TValue = unknown> {
  /** 값이 선택되어 있는지 확인 */
  isSelected: (value: TValue) => boolean;

  /** 값 선택 */
  selectValue: (value: TValue) => void;

  /** 드롭다운 닫기 */
  closeDropdown: () => void;

  /** 아이템 템플릿 등록 */
  setItemTemplate: (fn: ((...args: unknown[]) => JSX.Element) | undefined) => void;
}

export const ComboboxContext = createContext<ComboboxContextValue>();

export function useComboboxContext<TValue = unknown>(): ComboboxContextValue<TValue> {
  const context = useContext(ComboboxContext);
  if (!context) {
    throw new Error("useComboboxContext는 Combobox 컴포넌트 내부에서만 사용할 수 있습니다");
  }
  return context as ComboboxContextValue<TValue>;
}
