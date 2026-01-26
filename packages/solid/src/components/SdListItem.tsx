import {
  createSignal,
  type JSX,
  mergeProps,
  type ParentProps,
  Show,
  splitProps,
  untrack,
} from "solid-js";
import { twJoin } from "tailwind-merge";
import { SdCollapse } from "./SdCollapse";
import { SdCollapseIcon } from "./SdCollapseIcon";
import type { IconComponent } from "../types/icon.types";
import { ripple } from "../directives/ripple";
void ripple; // solid-js 린트 우회용

export interface SdListItemProps extends ParentProps {
  /** 레이아웃 타입 */
  layout?: "accordion" | "flat";
  /** 선택 상태 */
  selected?: boolean;
  /** 읽기 전용 */
  readonly?: boolean;
  /** 선택 아이콘 */
  selectedIcon?: IconComponent;
  /** 콘텐츠 영역 커스텀 클래스 */
  contentClass?: string;
  /** 콘텐츠 영역 커스텀 스타일 */
  contentStyle?: JSX.CSSProperties;
  /** 열림 상태 (controlled) */
  open?: boolean;
  /** 열림 기본값 (uncontrolled 초기값) */
  defaultOpen?: boolean;
  /** 열림 상태 변경 핸들러 */
  onOpenChange?: (open: boolean) => void;
  /** 클릭 핸들러 */
  onClick?: () => void;
  /** 도구 슬롯 */
  tool?: JSX.Element;
  /** 하위 리스트 (SdList 컴포넌트) */
  childList?: JSX.Element;
  /** 자식 존재 여부 (childList 평가 없이 확인용) */
  hasChildren?: boolean;
}

/**
 * 리스트 아이템 컴포넌트
 *
 * @remarks
 * - `layout="accordion"`: 아코디언 형태로 자식 리스트를 접고 펼칠 수 있다.
 * - `layout="flat"`: 자식 리스트를 항상 펼쳐둔다.
 * - `childList` prop으로 중첩 구조를 만들 수 있다.
 */
export function SdListItem(props: SdListItemProps) {
  const merged = mergeProps(
    { layout: "accordion" as const, selected: false, readonly: false, defaultOpen: false },
    props,
  );
  const [local, rest] = splitProps(merged, [
    "layout",
    "selected",
    "readonly",
    "selectedIcon",
    "contentClass",
    "contentStyle",
    "open",
    "defaultOpen",
    "onOpenChange",
    "onClick",
    "tool",
    "children",
    "childList",
    "hasChildren",
  ]);

  // Controlled vs Uncontrolled
  const [internalOpen, setInternalOpen] = createSignal(untrack(() => local.defaultOpen));
  const isControlled = () => local.open !== undefined;
  const isOpen = (): boolean => (isControlled() ? local.open! : internalOpen());

  const toggleOpen = () => {
    const newOpen = !isOpen();
    if (isControlled()) {
      local.onOpenChange?.(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };

  // 자식 여부 확인 (hasChildren prop 우선, 없으면 childList 존재 여부로 판단)
  const hasChildrenFn = () => local.hasChildren ?? local.childList !== undefined;

  const handleContentClick = () => {
    if (local.onClick) {
      local.onClick();
    }

    // 아코디언 레이아웃이고 자식이 있으면 토글
    if (local.layout === "accordion" && hasChildrenFn()) {
      toggleOpen();
    }
  };

  // 키보드 접근성
  const handleKeyDown = (e: KeyboardEvent) => {
    if (local.readonly) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleContentClick();
    }
  };

  const hasSelectedIcon = () => local.selectedIcon !== undefined;

  // flat 레이아웃에서 자식이 있는 아이템은 그룹 헤더 역할이므로 ripple 불필요
  const enableRipple = () => {
    return !local.readonly && !(local.layout === "flat" && hasChildrenFn());
  };

  return (
    <div
      data-component="sd-list-item"
      data-sd-layout={local.layout}
      data-sd-open={isOpen()}
      data-sd-selected={local.selected}
      data-sd-readonly={local.readonly}
      data-sd-has-selected-icon={hasSelectedIcon()}
      data-sd-has-children={hasChildrenFn()}
      {...rest}
    >
      {/* 콘텐츠 영역 */}
      <div
        use:ripple={enableRipple()}
        class={twJoin(
          "flex",
          "flex-row",
          "gap-2",
          "items-center",
          "p-ctrl",
          "py-ctrl-sm",
          local.readonly ? "cursor-default" : "cursor-pointer",
          // accordion 레이아웃 hover
          local.layout === "accordion" && !local.readonly && "hover:bg-bg-hover",
          // selected 상태
          local.selected && "bg-bg-hover",
          local.selected && "font-semibold",
          // flat 레이아웃 + 자식 있음
          local.layout === "flat" &&
            hasChildrenFn() &&
            `block cursor-default bg-transparent text-sm opacity-70`,
          local.contentClass,
        )}
        style={local.contentStyle}
        onClick={handleContentClick}
        onKeyDown={handleKeyDown}
        tabindex={local.readonly ? undefined : 0}
        role="button"
        aria-expanded={hasChildrenFn() ? isOpen() : undefined}
      >
        {/* 선택 아이콘 */}
        <Show when={local.selectedIcon !== undefined && !hasChildrenFn()}>
          <span
            class={twJoin(
              local.selected
                ? "text-primary"
                : `text-text-muted/10`,
              `[&>svg]:block`,
            )}
          >
            {local.selectedIcon?.({})}
          </span>
        </Show>

        {/* 콘텐츠 */}
        <div class="flex-1">{local.children}</div>

        {/* 도구 슬롯 */}
        <Show when={local.tool}>
          <div>{local.tool}</div>
        </Show>

        {/* 아코디언 아이콘 */}
        <Show when={hasChildrenFn() && local.layout === "accordion"}>
          <SdCollapseIcon open={isOpen()} />
        </Show>
      </div>

      {/* 자식 리스트 */}
      <Show when={hasChildrenFn()}>
        <SdCollapse data-component="sd-list-item-child" open={local.layout === "flat" || isOpen()}>
          <div class={twJoin(local.layout === "accordion" && "py-1")}>{local.childList}</div>
        </SdCollapse>
      </Show>
    </div>
  );
}
