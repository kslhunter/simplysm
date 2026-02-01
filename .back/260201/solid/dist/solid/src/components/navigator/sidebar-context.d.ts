import { type Accessor } from "solid-js";
/**
 * Sidebar의 상태를 관리하는 Context 값
 *
 * toggled는 "토글 버튼을 눌렀는가"를 의미하며,
 * 데스크톱과 모바일에서 반대로 동작한다:
 * - 데스크톱: toggled=false → 표시(기본), toggled=true → 숨김
 * - 모바일: toggled=false → 숨김(기본), toggled=true → 표시
 *
 * @property toggled - 토글 상태 accessor
 * @property setToggled - 토글 상태를 설정하는 함수
 * @property toggle - 토글 상태를 반전하는 함수
 * @property width - 사이드바 너비 accessor
 */
export interface SidebarContextValue {
    toggled: Accessor<boolean>;
    setToggled: (value: boolean) => void;
    toggle: () => void;
    width: Accessor<string>;
}
export declare const SidebarContext: import("solid-js").Context<SidebarContextValue | undefined>;
/**
 * Sidebar의 토글 상태에 접근하는 훅
 *
 * SidebarContainer 내부에서 사용하여 사이드바의 토글 상태를
 * 읽거나 변경할 수 있다.
 *
 * @returns Sidebar 상태 객체
 *   - `toggled`: 현재 토글 상태 accessor
 *   - `setToggled`: 토글 상태 변경 함수
 *   - `toggle`: 토글 상태 반전 함수
 * @throws SidebarContainer 외부에서 호출 시 에러 발생
 *
 * @example
 * ```tsx
 * function Header() {
 *   const { toggle } = useSidebar();
 *   return <button onClick={toggle}><IconMenu /></button>;
 * }
 * ```
 */
export declare function useSidebar(): SidebarContextValue;
//# sourceMappingURL=sidebar-context.d.ts.map