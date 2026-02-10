import { type JSX, type ParentComponent } from "solid-js";
import "@simplysm/core-common";
/**
 * Topbar 컴포넌트의 props
 *
 * @property showToggle - 사이드바 토글 버튼 표시 여부 (기본값: SidebarContainer 내부일 때 true)
 */
export interface TopbarProps extends JSX.HTMLAttributes<HTMLElement> {
  showToggle?: boolean;
}
/**
 * 상단바 컴포넌트
 *
 * TopbarContainer 내부에서 사용하며, 좌측에 사이드바 토글 버튼을 선택적으로 표시한다.
 * SidebarContainer 내부에서 사용하면 자동으로 토글 버튼이 표시된다.
 *
 * @example
 * ```tsx
 * <Topbar>
 *   <h1>페이지 제목</h1>
 *   <TopbarMenu menus={[...]} />
 *   <div style={{ flex: 1 }} />
 *   <TopbarUser menus={[...]}>사용자</TopbarUser>
 * </Topbar>
 * ```
 */
export declare const Topbar: ParentComponent<TopbarProps>;
//# sourceMappingURL=topbar.d.ts.map
