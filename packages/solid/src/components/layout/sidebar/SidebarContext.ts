import { createContext, useContext, type Accessor, type Setter } from "solid-js";

/**
 * Tailwind sm: breakpoint에 해당하는 미디어 쿼리
 * @see tailwind.config.ts screens.sm (640px)
 */
export const SM_MEDIA_QUERY = "(min-width: 640px)";

/**
 * 사이드바 toggle 상태 공유 Context
 *
 * @remarks
 * toggle 시맨틱:
 * - `toggle=false` (기본값): 데스크탑(640px+)에서 열림, 모바일(640px-)에서 닫힘
 * - `toggle=true`: 데스크탑(640px+)에서 닫힘, 모바일(640px-)에서 열림 (오버레이)
 */
export interface SidebarContextValue {
  toggle: Accessor<boolean>;
  setToggle: Setter<boolean>;
}

export const SidebarContext = createContext<SidebarContextValue>();

export function useSidebarContext(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebarContext can only be used inside SidebarContainer");
  }
  return context;
}

/**
 * SidebarContext를 선택적으로 사용 (Context 없으면 undefined 반환)
 *
 * @remarks
 * SidebarContainer 외부에서도 사용 가능한 컴포넌트(예: Topbar)에서 사용
 */
export function useSidebarContextOptional(): SidebarContextValue | undefined {
  return useContext(SidebarContext);
}
