import { createContext, useContext, type Accessor } from "solid-js";

export interface SelectContextValue<T = unknown> {
  /** 다중 선택 모드 여부 */
  multiple: Accessor<boolean>;

  /** 값이 선택되어 있는지 확인 */
  isSelected: (value: T) => boolean;

  /** 값 선택/해제 토글 */
  toggleValue: (value: T) => void;

  /** 드롭다운 닫기 */
  closeDropdown: () => void;
}

export const SelectContext = createContext<SelectContextValue>();

export function useSelectContext<T = unknown>(): SelectContextValue<T> {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error("useSelectContext는 Select 컴포넌트 내부에서만 사용할 수 있습니다");
  }
  return context as SelectContextValue<T>;
}
