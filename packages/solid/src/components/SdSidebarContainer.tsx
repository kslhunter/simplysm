import { IconChevronLeft, IconChevronRight, IconMenu2 } from "@tabler/icons-solidjs";
import { type ParentProps, mergeProps, Show, splitProps } from "solid-js";
import { twJoin } from "tailwind-merge";
import { SidebarProvider, useSidebar } from "../contexts/SidebarContext";
import { useMobile } from "../hooks/useMediaQuery";

export interface SdSidebarContainerProps extends ParentProps {
  /** 초기 접힘 상태 (기본값: false) */
  defaultCollapsed?: boolean;
  /** @deprecated defaultCollapsed 사용 권장 */
  defaultToggle?: boolean;
  /** 사이드바 너비 (CSS 값, 기본: 200px) */
  sidebarWidth?: string;
  /** 커스텀 클래스 */
  class?: string;
}


/**
 * 사이드바 컨테이너 내부 컴포넌트
 *
 * @remarks
 * SidebarProvider 내부에서 실제 레이아웃을 렌더링한다.
 */
function SdSidebarContainerInner(props: Omit<SdSidebarContainerProps, "defaultCollapsed" | "defaultToggle">) {
  const merged = mergeProps({ sidebarWidth: "200px" }, props);
  const [local, rest] = splitProps(merged, ["sidebarWidth", "class", "children"]);

  const { isCollapsed, toggleCollapsed, isSidebarHovered, setSidebarHovered } = useSidebar();
  const isMobile = useMobile();

  const onBackdropClick = () => {
    toggleCollapsed();
  };

  // 데스크톱에서만 padding-left 적용 (모바일은 오버레이 방식)
  const paddingLeft = () => (isMobile() || isCollapsed() ? "0" : `var(--sidebar-width)`);

  return (
    <div
      class={twJoin(
        "relative",
        "h-full",
        "overflow-hidden",
        "transition-[padding-left]",
        "duration-100",
        isCollapsed() ? "ease-in" : "ease-out",
        local.class,
      )}
      data-sd-collapsed={isCollapsed()}
      style={{
        "--sidebar-width": local.sidebarWidth,
        "padding-left": paddingLeft(),
      }}
      {...rest}
    >
      {local.children}

      {/* 백드롭 (모바일 전용) */}
      <Show when={isMobile() && isCollapsed()}>
        <div
          class={twJoin(
            "absolute",
            "inset-0",
            "bg-black",
            "transition-opacity",
            "duration-300",
            "ease-in-out",
            "opacity-60",
            "pointer-events-auto",
          )}
          style={{ "z-index": "calc(var(--z-index-sidebar) - 1)" }}
          onClick={onBackdropClick}
        />
      </Show>

      {/* 토글 버튼 (데스크톱 전용) */}
      <Show when={!isMobile()}>
        <button
          type="button"
          class={twJoin(
            "absolute",
            "top-1/2",
            "-translate-y-1/2",
            "w-5",
            "h-10",
            "bg-bg-elevated",
            "border",
            "border-l-0",
            "border-border-base",
            "rounded-r",
            "flex",
            "items-center",
            "justify-center",
            "cursor-pointer",
            "transition-[left,opacity]",
            "duration-100",
            isCollapsed() ? "ease-in" : "ease-out",
          )}
          style={{
            "z-index": "calc(var(--z-index-sidebar) + 1)",
            left: isCollapsed() ? "0" : `var(--sidebar-width)`,
            // 열린 상태: 평소 투명, 사이드바 영역 hover 시 나타남
            // 접힌 상태: 항상 보임
            opacity: isCollapsed() || isSidebarHovered() ? 1 : 0,
          }}
          onClick={toggleCollapsed}
          onMouseEnter={() => setSidebarHovered(true)}
          onMouseLeave={() => setSidebarHovered(false)}
          aria-label={isCollapsed() ? "사이드바 열기" : "사이드바 접기"}
        >
          {isCollapsed() ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
        </button>
      </Show>

      {/* 햄버거 메뉴 버튼 (모바일 전용, 사이드바 닫혀있을 때만) */}
      <Show when={isMobile() && !isCollapsed()}>
        <button
          type="button"
          class={twJoin(
            "absolute",
            "top-3",
            "left-3",
            "w-10",
            "h-10",
            "bg-bg-elevated",
            "border",
            "border-border-base",
            "rounded-sm",
            "flex",
            "items-center",
            "justify-center",
            "cursor-pointer",
            "shadow-md",
          )}
          style={{ "z-index": "calc(var(--z-index-sidebar) + 1)" }}
          onClick={toggleCollapsed}
          aria-label="사이드바 열기"
        >
          <IconMenu2 size={20} />
        </button>
      </Show>
    </div>
  );
}

/**
 * 사이드바 레이아웃 컨테이너 컴포넌트
 *
 * @remarks
 * - 데스크톱: 사이드바 너비만큼 padding-left 적용
 * - 모바일: 오버레이 방식으로 백드롭 표시
 * - isCollapsed 상태를 Context로 관리하여 하위 컴포넌트에서 접근 가능
 */
export function SdSidebarContainer(props: SdSidebarContainerProps) {
  const [local, rest] = splitProps(props, ["defaultCollapsed", "defaultToggle"]);

  // defaultCollapsed 우선, 없으면 defaultToggle 사용 (하위 호환성)
  const initialCollapsed = local.defaultCollapsed ?? local.defaultToggle ?? false;

  return (
    <SidebarProvider defaultCollapsed={initialCollapsed}>
      <SdSidebarContainerInner {...rest} />
    </SidebarProvider>
  );
}
