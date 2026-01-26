import { type ParentProps, splitProps } from "solid-js";
import { twJoin } from "tailwind-merge";
import { useSidebar } from "../contexts/SidebarContext";
import { useMobile } from "../hooks/useMediaQuery";

export interface SdSidebarProps extends ParentProps {
  /** 커스텀 클래스 */
  class?: string;
}

/**
 * 사이드바 패널 컴포넌트
 *
 * @remarks
 * - 데스크톱: isCollapsed=true면 왼쪽으로 슬라이드하여 숨김
 * - 모바일: isCollapsed=true면 오버레이로 표시 (기본 숨김 상태에서 열림)
 */
export function SdSidebar(props: SdSidebarProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  const { isCollapsed, setSidebarHovered } = useSidebar();
  const isMobile = useMobile();

  // 모바일에서는 isCollapsed 의미가 반대 (true = 열림, false = 숨김)
  const shouldHide = () => (isMobile() ? !isCollapsed() : isCollapsed());

  return (
    <div
      class={twJoin(
        "absolute",
        "top-0",
        "left-0",
        "w-(--sidebar-width)",
        "h-full",
        "flex",
        "flex-col",
        "bg-bg-elevated",
        "border-r",
        "border-border-base",
        "transition-transform",
        isMobile() ? "shadow-xl duration-300" : "duration-100",
        shouldHide() ? "ease-in" : "ease-out",
        local.class,
      )}
      style={{
        "z-index": "var(--z-index-sidebar)",
        transform: shouldHide() ? "translateX(-100%)" : "translateX(0)",
      }}
      data-sd-collapsed={isCollapsed()}
      onMouseEnter={() => setSidebarHovered(true)}
      onMouseLeave={() => setSidebarHovered(false)}
      {...rest}
    >
      {local.children}
    </div>
  );
}
