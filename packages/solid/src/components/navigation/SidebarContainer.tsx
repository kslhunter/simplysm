import { type JSX, type ParentComponent, Show, splitProps, createMemo } from "solid-js";
import { useBeforeLeave } from "@solidjs/router";
import { createMediaQuery } from "@solid-primitives/media";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { SidebarContext, SM_MEDIA_QUERY } from "./SidebarContext";
import { usePersisted } from "../../contexts/usePersisted";

const backdropClass = clsx(
  "fixed",
  "top-0",
  "left-0",
  "right-0",
  "bottom-0",
  "z-sidebar-backdrop",
  "bg-black/50",
  "sm:hidden",
);

const containerClass = clsx("flex", "flex-col", "min-h-screen", "transition-[padding-left]", "duration-100");

export interface SidebarContainerProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
}

/**
 * 사이드바 컨테이너 컴포넌트
 *
 * @remarks
 * - SidebarContext.Provider로 toggle 상태 공유
 * - usePersisted로 toggle 상태 localStorage 저장 (키: sidebar.toggle)
 * - 데스크탑(640px+)에서 padding-left + transition으로 콘텐츠 확장/축소
 * - 모바일(640px-)에서 backdrop 렌더링 및 클릭 시 닫기
 * - 페이지 이동 시 모바일에서 자동 닫기
 *
 * @example
 * ```tsx
 * <SidebarContainer>
 *   <Sidebar>
 *     <SidebarUser menus={userMenus}>
 *       <span>사용자</span>
 *     </SidebarUser>
 *     <SidebarMenu menus={menuItems} />
 *   </Sidebar>
 *   <main>콘텐츠</main>
 * </SidebarContainer>
 * ```
 */
export const SidebarContainer: ParentComponent<SidebarContainerProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "style"]);

  const [toggle, setToggle] = usePersisted("sidebar.toggle", false);

  // Tailwind sm: breakpoint 감지
  const isDesktop = createMediaQuery(SM_MEDIA_QUERY);

  // 사이드바 열림 여부 계산
  const isOpen = createMemo(() => {
    if (isDesktop()) {
      return !toggle();
    }
    return toggle();
  });

  // backdrop 클릭 시 닫기
  const handleBackdropClick = () => {
    setToggle(false);
  };

  // 모바일에서 페이지 이동 시 자동 닫기
  useBeforeLeave(() => {
    if (!isDesktop() && toggle()) {
      setToggle(false);
    }
  });

  // 데스크탑에서 사이드바 열림 시 padding-left 적용 (16rem = w-64)
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
        class={getClassName()}
        style={{
          "padding-left": getPaddingLeft(),
          ...(typeof local.style === "object" ? local.style : {}),
        }}
      >
        {local.children}
        <Show when={!isDesktop() && isOpen()}>
          <div class={backdropClass} onClick={handleBackdropClick} />
        </Show>
      </div>
    </SidebarContext.Provider>
  );
};
