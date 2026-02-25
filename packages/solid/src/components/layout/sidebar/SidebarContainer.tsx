import {
  type JSX,
  type ParentComponent,
  Show,
  splitProps,
  createMemo,
  createSignal,
} from "solid-js";
import { useBeforeLeave } from "@solidjs/router";
import { createMediaQuery } from "@solid-primitives/media";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { SidebarContext, SM_MEDIA_QUERY } from "./SidebarContext";
import { mergeStyles } from "../../../helpers/mergeStyles";

const backdropClass = clsx(
  "absolute",
  "top-0",
  "left-0",
  "right-0",
  "bottom-0",
  "z-sidebar-backdrop",
  "bg-black/50",
  "sm:hidden",
);

const containerClass = clsx("relative h-full transition-[padding-left] duration-100");

export interface SidebarContainerProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
}

/**
 * 사이드바 컨테이너 컴포넌트
 *
 * @remarks
 * - `position: relative`로 Sidebar를 포함하는 컨테이너 역할
 * - 부모 요소에 높이가 지정되어야 함 (`h-full` 사용)
 * - 콘텐츠 영역의 `overflow-auto`는 사용자가 직접 적용해야 함
 * - SidebarContext.Provider로 toggle 상태 공유
 * - toggle 상태는 메모리에만 유지 (페이지 새로고침 시 초기화)
 * - 데스크탑(640px+)에서 padding-left + transition으로 콘텐츠 확장/축소
 * - 모바일(640px-)에서 backdrop 렌더링 및 클릭 시 닫기
 * - 페이지 이동 시 모바일에서 자동 닫기
 *
 * @example
 * ```tsx
 * <div class="h-screen">
 *   <SidebarContainer>
 *     <Sidebar>
 *       <SidebarUser menus={userMenus}>
 *         <span>사용자</span>
 *       </SidebarUser>
 *       <SidebarMenu menus={menuItems} />
 *     </Sidebar>
 *     <main class="h-full overflow-auto">콘텐츠</main>
 *   </SidebarContainer>
 * </div>
 * ```
 */
export const SidebarContainer: ParentComponent<SidebarContainerProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "style"]);

  const [toggle, setToggle] = createSignal(false);

  // Detect Tailwind sm: breakpoint
  const isDesktop = createMediaQuery(SM_MEDIA_QUERY);

  // Calculate sidebar open state
  const isOpen = createMemo(() => {
    if (isDesktop()) {
      return !toggle();
    }
    return toggle();
  });

  // Close on backdrop click
  const handleBackdropClick = () => {
    setToggle(false);
  };

  // Auto-close on page navigation on mobile
  useBeforeLeave(() => {
    if (!isDesktop() && toggle()) {
      setToggle(false);
    }
  });

  // Apply padding-left on desktop when sidebar is open (16rem = w-64)
  const getPaddingLeft = () => {
    if (isDesktop() && isOpen()) {
      return "16rem";
    }
    return undefined;
  };

  const getClassName = () => twMerge(containerClass, local.class);

  return (
    <SidebarContext.Provider value={{ toggle, setToggle }}>
      <div
        {...rest}
        data-sidebar-container
        class={getClassName()}
        style={mergeStyles(local.style, { "padding-left": getPaddingLeft() })}
      >
        {local.children}
        <Show when={!isDesktop() && isOpen()}>
          <div
            class={backdropClass}
            onClick={handleBackdropClick}
            onKeyDown={(e) => e.key === "Escape" && handleBackdropClick()}
            role="button"
            aria-label="사이드바 닫기"
            tabIndex={0}
          />
        </Show>
      </div>
    </SidebarContext.Provider>
  );
};
