import { createContext, useContext, type Accessor, type JSX } from "solid-js";

type SlotAccessor = (() => JSX.Element) | undefined;

export interface SelectContextValue<TValue = unknown> {
  /** 다중 선택 모드 여부 */
  multiple: Accessor<boolean>;

  /** 값이 선택되어 있는지 확인 */
  isSelected: (value: TValue) => boolean;

  /** 값 선택/해제 토글 */
  toggleValue: (value: TValue) => void;

  /** 드롭다운 닫기 */
  closeDropdown: () => void;

  /** 헤더 슬롯 등록 */
  setHeader: (content: SlotAccessor) => void;

  /** 액션 슬롯 등록 */
  setAction: (content: SlotAccessor) => void;

  /** 아이템 템플릿 등록 */
  setItemTemplate: (fn: ((...args: unknown[]) => JSX.Element) | undefined) => void;
}

export const SelectContext = createContext<SelectContextValue>();

export function useSelectContext<TValue = unknown>(): SelectContextValue<TValue> {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error("useSelectContext는 Select 컴포넌트 내부에서만 사용할 수 있습니다");
  }
  return context as SelectContextValue<TValue>;
}
