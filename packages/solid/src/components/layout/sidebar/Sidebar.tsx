import { type JSX, type ParentComponent, splitProps, createMemo } from "solid-js";
import { createMediaQuery } from "@solid-primitives/media";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { useSidebarContext, SM_MEDIA_QUERY } from "./SidebarContext";
import { mergeStyles } from "../../../utils/mergeStyles";

const baseClass = clsx(
  "absolute",
  "top-0",
  "left-0",
  "bottom-0",
  "w-64",
  "z-sidebar",
  "flex",
  "flex-col",
  "bg-zinc-100",
  "dark:bg-slate-900",
  "border-r",
  "border-slate-200",
  "dark:border-slate-700",
  "transition-transform",
  "duration-300",
  "sm:duration-100",
);

const mobileOpenClass = clsx`shadow-xl`;

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
 *   <SidebarUser menus={userMenus}>
 *     <span>사용자</span>
 *   </SidebarUser>
 *   <SidebarMenu menus={menuItems} />
 * </Sidebar>
 * ```
 */
export const Sidebar: ParentComponent<SidebarProps> = (props) => {
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
      class={getClassName()}
      style={mergeStyles(local.style, { transform: getTransform() })}
      aria-hidden={!isOpen()}
      inert={!isOpen() || undefined}
    >
      {local.children}
    </aside>
  );
};
