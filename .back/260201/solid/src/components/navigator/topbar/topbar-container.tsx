import { type JSX, type ParentComponent, splitProps } from "solid-js";
import { topbarContainer } from "./topbar-container.css";
import "@simplysm/core-common";

/**
 * TopbarContainer 컴포넌트의 props
 */
export interface TopbarContainerProps extends JSX.HTMLAttributes<HTMLDivElement> {}

/**
 * Topbar 레이아웃 컨테이너
 *
 * flex-column으로 Topbar와 콘텐츠 영역을 수직 배치한다.
 * SidebarContainer 내부 또는 독립적으로 사용 가능하다.
 *
 * @example
 * ```tsx
 * // 독립 사용
 * <TopbarContainer>
 *   <Topbar>...</Topbar>
 *   <main>콘텐츠</main>
 * </TopbarContainer>
 *
 * // SidebarContainer와 함께
 * <SidebarContainer>
 *   <Sidebar>...</Sidebar>
 *   <TopbarContainer>
 *     <Topbar>...</Topbar>
 *     <main>콘텐츠</main>
 *   </TopbarContainer>
 * </SidebarContainer>
 * ```
 */
export const TopbarContainer: ParentComponent<TopbarContainerProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <div {...rest} class={[topbarContainer, local.class].filter(Boolean).join(" ")}>
      {local.children}
    </div>
  );
};
