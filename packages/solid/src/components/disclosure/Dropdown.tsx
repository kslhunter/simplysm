import {
  type JSX,
  type ParentComponent,
  createSignal,
  createEffect,
  createContext,
  onCleanup,
  Show,
  splitProps,
} from "solid-js";
import { createResizeObserver } from "@solid-primitives/resize-observer";
import { createControllableSignal } from "../../hooks/createControllableSignal";
import { createSlotSignal, type SlotAccessor } from "../../hooks/createSlotSignal";
import { createMountTransition } from "../../hooks/createMountTransition";
import { Portal } from "solid-js/web";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { mergeStyles } from "../../helpers/mergeStyles";
import { createSlotComponent } from "../../helpers/createSlotComponent";
import { borderSubtle } from "../../styles/tokens.styles";

// --- DropdownContext (internal) ---

interface DropdownContextValue {
  toggle: () => void;
  setTrigger: (content: SlotAccessor) => void;
  setContent: (content: SlotAccessor) => void;
}

const DropdownContext = createContext<DropdownContextValue>();

// --- DropdownTrigger ---

const DropdownTrigger = createSlotComponent(DropdownContext, (ctx) => ctx.setTrigger);

// --- DropdownContent ---

const DropdownContent = createSlotComponent(DropdownContext, (ctx) => ctx.setContent);

// --- Dropdown ---

export interface DropdownProps {
  /**
   * 절대 위치 (컨텍스트 메뉴 등, minWidth 없음)
   * Trigger와 함께 사용 시 Trigger 기준 위치 계산
   */
  position?: { x: number; y: number };

  /**
   * 팝업 열림 상태
   */
  open?: boolean;

  /**
   * 열림 상태 변경 시 콜백
   */
  onOpenChange?: (open: boolean) => void;

  /**
   * 팝업 최대 높이 (기본값: 300px), 초과 시 내부 스크롤
   */
  maxHeight?: number;

  /**
   * 비활성화 (Trigger 클릭 무시)
   */
  disabled?: boolean;

  /**
   * 키보드 네비게이션 활성화 (Select 등에서 사용)
   *
   * direction=down일 때:
   * - 트리거에서 ArrowDown -> 첫 focusable 아이템 포커스
   * - 첫 아이템에서 ArrowUp -> 트리거 포커스
   * - 트리거에서 ArrowUp -> 닫기
   *
   * direction=up일 때:
   * - 트리거에서 ArrowUp -> 마지막 focusable 아이템 포커스
   * - 마지막 아이템에서 ArrowDown -> 트리거 포커스
   * - 트리거에서 ArrowDown -> 닫기
   */
  keyboardNav?: boolean;

  /**
   * 팝업에 적용할 커스텀 class
   */
  class?: string;

  /**
   * 팝업에 적용할 커스텀 style
   */
  style?: JSX.CSSProperties;

  /**
   * children (Dropdown.Trigger, Dropdown.Content)
   */
  children: JSX.Element;
}

interface DropdownComponent extends ParentComponent<DropdownProps> {
  Trigger: typeof DropdownTrigger;
  Content: typeof DropdownContent;
}

/**
 * 드롭다운 팝업 컴포넌트
 *
 * Trigger/Content 슬롯 패턴으로 트리거와 컨텐츠를 분리합니다.
 * Trigger 클릭 시 auto-toggle되며, disabled prop으로 비활성화할 수 있습니다.
 *
 * @example
 * ```tsx
 * <Dropdown>
 *   <Dropdown.Trigger>
 *     <Button>열기</Button>
 *   </Dropdown.Trigger>
 *   <Dropdown.Content>
 *     <div>팝업 내용</div>
 *   </Dropdown.Content>
 * </Dropdown>
 * ```
 *
 * @example Context menu (Trigger 없이 position 사용)
 * ```tsx
 * <Dropdown position={{ x: 300, y: 200 }} open={true}>
 *   <Dropdown.Content>
 *     <div>메뉴</div>
 *   </Dropdown.Content>
 * </Dropdown>
 * ```
 */
export const Dropdown: DropdownComponent = ((props: DropdownProps) => {
  const [local, rest] = splitProps(props, [
    "position",
    "open",
    "onOpenChange",
    "maxHeight",
    "disabled",
    "keyboardNav",
    "class",
    "style",
    "children",
  ]);

  const [open, setOpen] = createControllableSignal({
    value: () => local.open ?? false,
    onChange: () => local.onOpenChange,
  });

  // toggle 함수 (disabled 체크 포함)
  const toggle = () => {
    if (local.disabled) return;
    setOpen(!open());
  };

  // 슬롯 등록 시그널
  const [triggerSlot, setTrigger] = createSlotSignal();
  const [contentSlot, setContent] = createSlotSignal();

  // Trigger wrapper ref (위치 계산에 필요)
  let triggerRef: HTMLDivElement | undefined;

  // 팝업 ref
  const [popupRef, setPopupRef] = createSignal<HTMLDivElement>();

  // 애니메이션 상태 (mount transition)
  const { mounted, animating, unmount } = createMountTransition(open);

  // 계산된 위치
  const [computedStyle, setComputedStyle] = createSignal<JSX.CSSProperties>({});

  // 방향 (위/아래)
  const [direction, setDirection] = createSignal<"down" | "up">("down");

  // 위치 계산 함수 추출
  const updatePosition = () => {
    const popup = popupRef();
    if (!popup) return;

    const style: JSX.CSSProperties = {};

    if (triggerRef) {
      const rect = triggerRef.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // 위/아래 방향 결정 (화면 중앙 기준)
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openDown = spaceBelow >= spaceAbove;
      setDirection(openDown ? "down" : "up");

      // 좌/우 조정 (화면 밖으로 나가지 않도록) - 뷰포트 기준
      const adjustedLeft = Math.min(rect.left, viewportWidth - popup.offsetWidth);

      style.left = `${Math.max(0, adjustedLeft)}px`;
      style["min-width"] = `${rect.width}px`;

      if (openDown) {
        style.top = `${rect.bottom}px`;
      } else {
        style.bottom = `${viewportHeight - rect.top}px`;
      }
    } else if (local.position) {
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // 위/아래 방향 결정
      const spaceBelow = viewportHeight - local.position.y;
      const spaceAbove = local.position.y;
      const openDown = spaceBelow >= spaceAbove;
      setDirection(openDown ? "down" : "up");

      // 좌/우 조정 - 뷰포트 기준
      const adjustedLeft = Math.min(local.position.x, viewportWidth - (popup.offsetWidth || 200));
      style.left = `${Math.max(0, adjustedLeft)}px`;

      if (openDown) {
        style.top = `${local.position.y}px`;
      } else {
        style.bottom = `${viewportHeight - local.position.y}px`;
      }
    }

    setComputedStyle(style);
  };

  // 마운트 시 위치 계산 + popup 크기 변경 시 재계산
  createEffect(() => {
    if (!mounted()) return;

    updatePosition();

    const popup = popupRef();
    if (popup) {
      createResizeObserver(popup, () => {
        updatePosition();
      });
    }
  });

  // 외부 클릭 감지 (pointerdown)
  createEffect(() => {
    if (!open()) return;

    const handlePointerDown = (e: PointerEvent) => {
      const popup = popupRef();
      const target = e.target as Node;

      // 팝업 내부 클릭은 무시
      if (popup?.contains(target)) return;

      // Trigger 내부 클릭도 무시
      if (triggerRef?.contains(target)) return;

      // 외부 클릭 -> 닫기
      setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    onCleanup(() => document.removeEventListener("pointerdown", handlePointerDown));
  });

  // Tab 키 포커스 이동 감지 (focusout)
  createEffect(() => {
    if (!open()) return;

    const handleFocusOut = (e: FocusEvent) => {
      const popup = popupRef();
      const relatedTarget = e.relatedTarget as Node | null;

      // relatedTarget이 null이면 무시 (pointerdown이 처리)
      if (!relatedTarget) return;

      // 팝업 내부로 이동은 무시
      if (popup?.contains(relatedTarget)) return;

      // Trigger 내부로 이동도 무시
      if (triggerRef?.contains(relatedTarget)) return;

      // 외부로 포커스 이동 -> 닫기
      setOpen(false);
    };

    document.addEventListener("focusout", handleFocusOut);
    onCleanup(() => document.removeEventListener("focusout", handleFocusOut));
  });

  // Escape 키 감지
  createEffect(() => {
    if (!open()) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown));
  });

  // 키보드 네비게이션: 트리거용 핸들러
  const handleTriggerKeyDown = (e: KeyboardEvent) => {
    if (!local.keyboardNav) return;

    // 닫혀있을 때: ArrowUp/ArrowDown으로 열기
    if (!open()) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    // 열려있을 때: direction에 따른 처리
    const popup = popupRef();
    if (!popup) return;

    const dir = direction();
    const focusables = [
      ...popup.querySelectorAll<HTMLElement>(
        '[tabindex]:not([tabindex="-1"]), button, [data-list-item]',
      ),
    ];

    if (dir === "down") {
      if (e.key === "ArrowDown" && focusables.length > 0) {
        e.preventDefault();
        focusables[0]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(false);
      }
    } else {
      // direction === "up"
      if (e.key === "ArrowUp" && focusables.length > 0) {
        e.preventDefault();
        focusables[focusables.length - 1]?.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(false);
      }
    }
  };

  // 키보드 네비게이션: 팝업용 핸들러
  const handlePopupKeyDown = (e: KeyboardEvent) => {
    if (!local.keyboardNav) return;

    // List 등에서 이미 처리된 이벤트는 무시
    if (e.defaultPrevented) return;

    if (!triggerRef) return;

    const dir = direction();

    // 팝업에서 ArrowUp/ArrowDown이 처리되지 않았다면 (첫/마지막 아이템)
    // 트리거로 포커스 이동
    if (dir === "down" && e.key === "ArrowUp") {
      e.preventDefault();
      triggerRef.focus();
    } else if (dir === "up" && e.key === "ArrowDown") {
      e.preventDefault();
      triggerRef.focus();
    }
  };

  // 스크롤 감지
  createEffect(() => {
    if (!open()) return;

    const handleScroll = (e: Event) => {
      // 팝업 내부 스크롤은 무시
      const popup = popupRef();
      if (popup?.contains(e.target as Node)) return;

      setOpen(false);
    };

    // capture로 모든 스크롤 감지
    document.addEventListener("scroll", handleScroll, { capture: true });
    onCleanup(() => document.removeEventListener("scroll", handleScroll, { capture: true }));
  });

  // resize 감지 (뷰포트 크기 변경 시 닫기)
  createEffect(() => {
    if (!open()) return;

    const handleResize = () => {
      setOpen(false);
    };

    window.addEventListener("resize", handleResize);
    onCleanup(() => window.removeEventListener("resize", handleResize));
  });

  // transitionend 이벤트 처리
  const handleTransitionEnd = (e: TransitionEvent) => {
    // opacity 전환 완료 시에만 처리
    if (e.propertyName !== "opacity") return;

    if (!open()) {
      // 닫힘 애니메이션 완료 -> DOM에서 제거
      unmount();
    }
  };

  const maxHeight = () => local.maxHeight ?? 300;

  // 애니메이션 클래스 (opacity와 transform만 transition, 위치 속성은 제외)
  const animationClass = () => {
    const base = "transition-[opacity,transform] duration-150 ease-out";
    const visible = animating();
    const dir = direction();

    if (visible) {
      return clsx(base, "translate-y-0 opacity-100");
    } else {
      return clsx(base, "opacity-0", dir === "down" ? "-translate-y-1" : "translate-y-1");
    }
  };

  return (
    <DropdownContext.Provider value={{ toggle, setTrigger, setContent }}>
      {local.children}

      {/* Trigger 슬롯 렌더링 (wrapper div에 click/keyboard handler 부착) */}
      <Show when={triggerSlot()}>
        <div
          ref={(el) => {
            triggerRef = el;
          }}
          data-dropdown-trigger
          onClick={toggle}
          onKeyDown={handleTriggerKeyDown}
        >
          {triggerSlot()!()}
        </div>
      </Show>

      {/* Content 슬롯: Portal + 팝업 */}
      <Show when={mounted()}>
        <Portal>
          <div
            {...rest}
            ref={setPopupRef}
            data-dropdown
            class={twMerge(
              clsx(
                "fixed",
                "z-dropdown",
                "bg-white dark:bg-base-800",
                "border",
                borderSubtle,
                "shadow-lg dark:shadow-black/30",
                "rounded-md",
                "overflow-y-auto",
                animationClass(),
              ),
              local.class,
            )}
            style={mergeStyles(computedStyle(), local.style, {
              "max-height": `${maxHeight()}px`,
            })}
            onTransitionEnd={handleTransitionEnd}
            onKeyDown={handlePopupKeyDown}
          >
            <Show when={contentSlot()}>{contentSlot()!()}</Show>
          </div>
        </Portal>
      </Show>
    </DropdownContext.Provider>
  );
}) as DropdownComponent;

Dropdown.Trigger = DropdownTrigger;
Dropdown.Content = DropdownContent;
