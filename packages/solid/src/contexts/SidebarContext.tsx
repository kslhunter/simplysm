import { SdError } from "@simplysm/core-common";
import { type Accessor, createContext, createSignal, type ParentProps, useContext } from "solid-js";

interface SidebarContextValue {
  /** 사이드바가 접힌 상태인지 (데스크톱: 숨김, 모바일: 표시) */
  isCollapsed: Accessor<boolean>;
  /** 접힘 상태 설정 */
  setCollapsed: (value: boolean) => void;
  /** 접힘 상태 반전 */
  toggleCollapsed: () => void;
  /** 사이드바 영역에 마우스가 올라가 있는지 */
  isSidebarHovered: Accessor<boolean>;
  /** 사이드바 hover 상태 설정 */
  setSidebarHovered: (value: boolean) => void;

  // @deprecated 하위 호환성 - isCollapsed 사용 권장
  /** @deprecated isCollapsed 사용 권장 */
  toggle: Accessor<boolean>;
  /** @deprecated setCollapsed 사용 권장 */
  setToggle: (value: boolean) => void;
  /** @deprecated toggleCollapsed 사용 권장 */
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextValue>();

/**
 * SidebarProvider의 props
 */
export interface SidebarProviderProps extends ParentProps {
  /** 초기 접힘 상태 (기본값: false) */
  defaultCollapsed?: boolean;
  /** @deprecated defaultCollapsed 사용 권장 */
  defaultToggle?: boolean;
}

/**
 * 사이드바 컨텍스트 Provider 컴포넌트.
 * 자식 컴포넌트에서 useSidebar()를 통해 사이드바 상태에 접근할 수 있다.
 *
 * @example
 * ```tsx
 * <SidebarProvider defaultCollapsed={false}>
 *   <App />
 * </SidebarProvider>
 * ```
 */
export function SidebarProvider(props: SidebarProviderProps) {
  // defaultCollapsed 우선, 없으면 defaultToggle 사용 (하위 호환성)
  const initialValue = props.defaultCollapsed ?? props.defaultToggle ?? false;
  const [isCollapsed, setCollapsedSignal] = createSignal(initialValue);
  const [isSidebarHovered, setIsSidebarHovered] = createSignal(false);

  const setCollapsed = (value: boolean) => {
    setCollapsedSignal(value);
  };

  const toggleCollapsed = () => {
    setCollapsedSignal((v) => !v);
  };

  const setSidebarHovered = (value: boolean) => {
    setIsSidebarHovered(value);
  };

  const store: SidebarContextValue = {
    isCollapsed,
    setCollapsed,
    toggleCollapsed,
    isSidebarHovered,
    setSidebarHovered,
    // 하위 호환성
    toggle: isCollapsed,
    setToggle: setCollapsed,
    toggleSidebar: toggleCollapsed,
  };

  return <SidebarContext.Provider value={store}>{props.children}</SidebarContext.Provider>;
}

/**
 * 사이드바 컨텍스트에 접근하는 hook.
 * SidebarProvider 내부에서만 사용 가능하다.
 *
 * @returns 사이드바 상태와 변경 함수를 포함하는 객체
 * @throws SidebarProvider 외부에서 호출 시 에러 발생
 *
 * @example
 * ```tsx
 * const { isCollapsed, setCollapsed, toggleCollapsed } = useSidebar();
 * ```
 */
export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new SdError("useSidebar는 SidebarProvider 내부에서만 사용할 수 있습니다.");
  }
  return context;
}
