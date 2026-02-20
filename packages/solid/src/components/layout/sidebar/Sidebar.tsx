import { type JSX, type ParentComponent, splitProps, createMemo } from "solid-js";
import { createMediaQuery } from "@solid-primitives/media";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { useSidebarContext, SM_MEDIA_QUERY } from "./SidebarContext";
import { mergeStyles } from "../../../helpers/mergeStyles";
import { SidebarContainer } from "./SidebarContainer";
import { SidebarMenu } from "./SidebarMenu";
import { SidebarUser } from "./SidebarUser";

export type { SidebarContainerProps } from "./SidebarContainer";
export type { SidebarMenuProps } from "./SidebarMenu";
export type { SidebarUserMenu, SidebarUserProps } from "./SidebarUser";

const baseClass = clsx(
  "absolute",
  "top-0",
  "left-0",
  "bottom-0",
  "w-64",
  "z-sidebar",
  "flex",
  "flex-col",
  "bg-base-100",
  "dark:bg-base-800",
  "border-r",
  "border-base-200",
  "dark:border-base-700",
  "transition-transform",
  "duration-300",
  "sm:duration-100",
);

const mobileOpenClass = clsx("shadow-xl");

export interface SidebarProps extends JSX.HTMLAttributes<HTMLElement> {
  children: JSX.Element;
}

/**
 * 사이드바 본체 컴포넌트
 *
 * @remarks
 * - SidebarContainer 내부에서 사용해야 함 (`position: absolute`로 컨테이너에 종속)
 * - Context에서 toggle 상태를 읽어 열림/닫힘 애니메이션 적용
 * - 토글 버튼 미포함 - useSidebarContext().setToggle로 외부에서 제어
 *
 * @example
 * ```tsx
 * <Sidebar>
 *   <Sidebar.User menus={userMenus}>
 *     <span>사용자</span>
 *   </Sidebar.User>
 *   <Sidebar.Menu menus={menuItems} />
 * </Sidebar>
 * ```
 */
interface SidebarComponent extends ParentComponent<SidebarProps> {
  Container: typeof SidebarContainer;
  Menu: typeof SidebarMenu;
  User: typeof SidebarUser;
}

const SidebarBase: ParentComponent<SidebarProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "style"]);

  const { toggle } = useSidebarContext();

  // Tailwind sm: breakpoint 감지
  const isDesktop = createMediaQuery(SM_MEDIA_QUERY);

  // 사이드바 열림 여부 계산
  const isOpen = createMemo(() => {
    if (isDesktop()) {
      return !toggle();
    }
    return toggle();
  });

  // transform 계산: 닫힘 시 왼쪽으로 숨김
  const getTransform = () => {
    return isOpen() ? "translateX(0)" : "translateX(-100%)";
  };

  const getClassName = () =>
    twMerge(baseClass, !isDesktop() && isOpen() && mobileOpenClass, local.class);

  return (
    <aside
      {...rest}
      data-sidebar
      class={getClassName()}
      style={mergeStyles(local.style, { transform: getTransform() })}
      aria-hidden={!isOpen()}
      inert={!isOpen() || undefined}
    >
      {local.children}
    </aside>
  );
};

export const Sidebar = SidebarBase as SidebarComponent;
Sidebar.Container = SidebarContainer;
Sidebar.Menu = SidebarMenu;
Sidebar.User = SidebarUser;
