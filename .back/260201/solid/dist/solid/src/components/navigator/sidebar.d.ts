import "@simplysm/core-common";
import { type JSX, type ParentComponent } from "solid-js";
/**
 * Sidebar 컴포넌트의 props
 */
export type SidebarProps = JSX.HTMLAttributes<HTMLElement>;
/**
 * 사이드바 패널 컴포넌트
 *
 * SidebarContainer 내부에서 사용하며, 좌측에 고정 배치된다.
 * SidebarMenu, SidebarUser 등의 컴포넌트를 children으로 포함할 수 있다.
 *
 * 사이드바 너비는 SidebarContainer의 width prop으로 설정한다.
 *
 * @example
 * ```tsx
 * <SidebarContainer width="280px">
 *   <Sidebar>
 *     <SidebarMenu menus={[...]} />
 *     <SidebarUser>사용자 이름</SidebarUser>
 *   </Sidebar>
 *   <main>콘텐츠</main>
 * </SidebarContainer>
 * ```
 */
export declare const Sidebar: ParentComponent<SidebarProps>;
//# sourceMappingURL=sidebar.d.ts.map