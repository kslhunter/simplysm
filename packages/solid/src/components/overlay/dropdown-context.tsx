import { type Accessor, createContext, type JSX, useContext } from "solid-js";

/**
 * Dropdown의 상태를 관리하는 Context 값 (외부 API)
 *
 * @property id - 현재 Dropdown의 고유 ID
 * @property parentId - 부모 Dropdown의 ID (최상위면 undefined)
 * @property open - 열림 상태 accessor
 * @property close - 이 Dropdown을 닫는 함수
 */
export interface DropdownContextValue {
  id: string;
  parentId?: string;
  open: Accessor<boolean>;
  close: () => void;
}

/**
 * Dropdown 내부에서 사용하는 확장된 Context 값
 */
export interface DropdownInternalContextValue extends DropdownContextValue {
  registerChild: (childId: string) => void;
  unregisterChild: (childId: string) => void;
  isDescendant: (targetId: string) => boolean;
  placement: Accessor<"top" | "bottom">;
  isMobile: Accessor<boolean>;
  popupStyle: Accessor<JSX.CSSProperties>;
  /** popup에서 trigger로 포커스를 이동시키는 함수 (ArrowUp 키 처리용) */
  focusTrigger: () => void;
}

export const DropdownContext = createContext<DropdownInternalContextValue>();

/**
 * Dropdown 상태에 접근하는 훅
 *
 * Dropdown 내부에서 사용하여 현재 Dropdown의 상태나
 * 부모-자식 관계에 접근할 수 있다.
 *
 * @returns Dropdown 상태 객체 또는 undefined (Dropdown 외부에서 호출 시)
 */
export function useDropdown(): DropdownContextValue | undefined {
  const ctx = useContext(DropdownContext);
  if (!ctx) return undefined;

  // 외부에 노출할 API만 반환
  return {
    id: ctx.id,
    parentId: ctx.parentId,
    open: ctx.open,
    close: ctx.close,
  };
}

/**
 * 내부 컴포넌트용 훅 (DropdownPopup 등)
 */
export function useDropdownInternal(): DropdownInternalContextValue | undefined {
  return useContext(DropdownContext);
}
