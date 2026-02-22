import {
  type JSX,
  type ParentComponent,
  createContext,
  createEffect,
  createUniqueId,
  onCleanup,
  Show,
  splitProps,
  For,
  useContext,
  createSignal,
} from "solid-js";
import { Portal } from "solid-js/web";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { IconX } from "@tabler/icons-solidjs";
import { createControllableSignal } from "../../hooks/createControllableSignal";
import { createMountTransition } from "../../hooks/createMountTransition";
import { createPointerDrag } from "../../hooks/createPointerDrag";
import { mergeStyles } from "../../helpers/mergeStyles";
import { Icon } from "../display/Icon";
import { borderSubtle } from "../../styles/tokens.styles";
import { DialogDefaultsContext } from "./DialogContext";
import { registerDialog, unregisterDialog, bringToFront } from "./dialogZIndex";

type SlotAccessor = (() => JSX.Element) | undefined;

interface DialogSlotsContextValue {
  setHeader: (content: SlotAccessor) => void;
  setAction: (content: SlotAccessor) => void;
}

const DialogSlotsContext = createContext<DialogSlotsContextValue>();

/**
 * 다이얼로그 헤더 서브 컴포넌트
 */
const DialogHeader: ParentComponent = (props) => {
  const ctx = useContext(DialogSlotsContext)!;
  ctx.setHeader(() => props.children);
  onCleanup(() => ctx.setHeader(undefined));
  return null;
};

/**
 * 다이얼로그 액션 서브 컴포넌트
 */
const DialogAction: ParentComponent = (props) => {
  const ctx = useContext(DialogSlotsContext)!;
  ctx.setAction(() => props.children);
  onCleanup(() => ctx.setAction(undefined));
  return null;
};

export interface DialogProps {
  /** 모달 열림 상태 */
  open?: boolean;
  /** 열림 상태 변경 시 콜백 */
  onOpenChange?: (open: boolean) => void;
  /** 닫기 버튼 표시 (기본: true) */
  closable?: boolean;
  /** 백드롭 클릭으로 닫기 */
  closeOnBackdrop?: boolean;
  /** Escape 키로 닫기 (기본값: true) */
  closeOnEscape?: boolean;
  /** 리사이즈 가능 여부 (기본: false) */
  resizable?: boolean;
  /** 드래그 이동 가능 여부 (기본: true) */
  movable?: boolean;
  /** 플로팅 모드 (백드롭 없음) */
  float?: boolean;
  /** 전체 화면 모드 */
  fill?: boolean;
  /** 너비 */
  width?: number;
  /** 높이 */
  height?: number;
  /** 최소 너비 */
  minWidth?: number;
  /** 최소 높이 */
  minHeight?: number;
  /** 고정 위치 */
  position?: "bottom-right" | "top-right";
  /** 헤더 스타일 */
  headerStyle?: JSX.CSSProperties | string;
  /** 닫기 전 확인 함수 */
  canDeactivate?: () => boolean;
  /** 닫기 애니메이션 완료 후 콜백 */
  onCloseComplete?: () => void;
  /** 추가 CSS 클래스 */
  class?: string;
}

type ResizeDirection =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

const RESIZE_DIRECTIONS: ResizeDirection[] = [
  "left",
  "right",
  "top",
  "bottom",
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

const resizeCursorMap: Record<ResizeDirection, string> = {
  "left": "cursor-ew-resize",
  "right": "cursor-ew-resize",
  "top": "cursor-ns-resize",
  "bottom": "cursor-ns-resize",
  "top-left": "cursor-nwse-resize",
  "top-right": "cursor-nesw-resize",
  "bottom-left": "cursor-nesw-resize",
  "bottom-right": "cursor-nwse-resize",
};

const dialogContentClass = clsx("flex-1", "overflow-auto");

const resizePositionMap: Record<ResizeDirection, string> = {
  "left": clsx("left-0 top-0", "h-full w-1.5"),
  "right": clsx("right-0 top-0", "h-full w-1.5"),
  "top": clsx("left-0 top-0", "h-1.5 w-full"),
  "bottom": clsx("bottom-0 left-0", "h-1.5 w-full"),
  "top-left": clsx("left-0 top-0", "z-[1] size-1.5"),
  "top-right": clsx("right-0 top-0", "z-[1] size-1.5"),
  "bottom-left": clsx("bottom-0 left-0", "z-[1] size-1.5"),
  "bottom-right": clsx("bottom-0 right-0", "z-[1] size-1.5"),
};

/**
 * 다이얼로그 컴포넌트
 *
 * 선언적 다이얼로그 UI를 제공합니다. 드래그 이동, 8방향 리사이즈,
 * float/fill 모드, z-index 자동 관리 등을 지원합니다.
 *
 * @example
 * ```tsx
 * const [open, setOpen] = createSignal(false);
 *
 * <Button onClick={() => setOpen(true)}>다이얼로그 열기</Button>
 * <Dialog open={open()} onOpenChange={setOpen}>
 *   <Dialog.Header>내 다이얼로그</Dialog.Header>
 *   <div class="p-4">다이얼로그 내용</div>
 * </Dialog>
 * ```
 */
interface DialogComponent extends ParentComponent<DialogProps> {
  Header: typeof DialogHeader;
  Action: typeof DialogAction;
}

export const Dialog: DialogComponent = (props) => {
  const dialogDefaults = useContext(DialogDefaultsContext);

  const [local] = splitProps(props, [
    "open",
    "onOpenChange",
    "closable",
    "closeOnBackdrop",
    "closeOnEscape",
    "resizable",
    "movable",
    "float",
    "fill",
    "width",
    "height",
    "minWidth",
    "minHeight",
    "position",
    "headerStyle",
    "canDeactivate",
    "onCloseComplete",
    "class",
    "children",
  ]);

  const headerId = "dialog-header-" + createUniqueId();

  const [header, _setHeader] = createSignal<SlotAccessor>();
  const setHeader = (content: SlotAccessor) => _setHeader(() => content);
  const [action, _setAction] = createSignal<SlotAccessor>();
  const setAction = (content: SlotAccessor) => _setAction(() => content);
  const hasHeader = () => header() !== undefined;

  const [open, setOpen] = createControllableSignal({
    value: () => local.open ?? false,
    onChange: () => local.onOpenChange,
  });

  // 애니메이션 상태 (mount transition)
  const { mounted, animating, unmount } = createMountTransition(open);

  // onCloseComplete 중복 호출 방지
  let closeCompleteEmitted = false;

  const emitCloseComplete = () => {
    if (closeCompleteEmitted) return;
    closeCompleteEmitted = true;
    unmount();
    local.onCloseComplete?.();
  };

  // open 변경 시 closeCompleteEmitted 초기화
  createEffect(() => {
    if (open()) {
      closeCompleteEmitted = false;
    }
  });

  // dialog ref
  let dialogRef: HTMLDivElement | undefined;

  // wrapper ref (signal로 관리하여 Portal ref 타이밍 보장)
  const [wrapperRef, setWrapperRef] = createSignal<HTMLDivElement>();

  const closeOnEscape = () => local.closeOnEscape ?? dialogDefaults?.().closeOnEscape ?? true;
  const closeOnBackdrop = () =>
    local.closeOnBackdrop ?? dialogDefaults?.().closeOnBackdrop ?? false;

  // Escape 키 감지
  createEffect(() => {
    if (!open()) return;
    if (!closeOnEscape()) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        tryClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown));
  });

  // 열릴 때 등록, 닫힐 때 해제
  createEffect(() => {
    if (!open()) return;
    const el = wrapperRef();
    if (!el) return;
    registerDialog(el);
    onCleanup(() => unregisterDialog(el));
  });

  // 닫기 시도 (canDeactivate 체크)
  const tryClose = () => {
    if (local.canDeactivate && !local.canDeactivate()) return;
    setOpen(false);
  };

  // 백드롭 클릭 핸들러
  const handleBackdropClick = () => {
    if (!closeOnBackdrop()) return;
    tryClose();
  };

  // 닫기 버튼 클릭 핸들러
  const handleCloseClick = () => {
    tryClose();
  };

  // transitionend 이벤트 처리
  const handleTransitionEnd = (e: TransitionEvent) => {
    if (e.propertyName !== "opacity") return;
    if (!open()) {
      emitCloseComplete();
    }
  };

  // z-index 자동 관리
  const handleDialogFocus = () => {
    const el = wrapperRef();
    if (!el) return;
    bringToFront(el);
  };

  // 드래그 이동
  const handleHeaderPointerDown = (event: PointerEvent) => {
    // movable 기본값은 true
    if (local.movable === false) return;
    const wrapperEl = wrapperRef();
    if (!dialogRef || !wrapperEl) return;
    // 닫기 버튼 등 인터랙티브 요소에서 시작된 이벤트는 드래그로 처리하지 않음
    if ((event.target as HTMLElement).closest("button")) return;

    const target = event.currentTarget as HTMLElement;
    const dialogEl = dialogRef;

    const startX = event.clientX;
    const startY = event.clientY;
    const startTop = dialogEl.offsetTop;
    const startLeft = dialogEl.offsetLeft;

    createPointerDrag(target, event.pointerId, {
      onMove(e) {
        e.stopPropagation();
        e.preventDefault();

        dialogEl.style.position = "absolute";
        dialogEl.style.left = `${startLeft + e.clientX - startX}px`;
        dialogEl.style.top = `${startTop + e.clientY - startY}px`;
        dialogEl.style.right = "auto";
        dialogEl.style.bottom = "auto";
        dialogEl.style.margin = "0";

        // 화면 밖 방지
        if (dialogEl.offsetLeft > wrapperEl.offsetWidth - 100) {
          dialogEl.style.left = wrapperEl.offsetWidth - 100 + "px";
        }
        if (dialogEl.offsetTop > wrapperEl.offsetHeight - 100) {
          dialogEl.style.top = wrapperEl.offsetHeight - 100 + "px";
        }
        if (dialogEl.offsetTop < 0) {
          dialogEl.style.top = "0";
        }
        if (dialogEl.offsetLeft < -dialogEl.offsetWidth + 100) {
          dialogEl.style.left = -dialogEl.offsetWidth + 100 + "px";
        }
      },
      onEnd(e) {
        e.stopPropagation();
        e.preventDefault();
      },
    });
  };

  // 리사이즈
  const handleResizeBarPointerDown = (event: PointerEvent, direction: ResizeDirection) => {
    if (!local.resizable) return;
    if (!dialogRef) return;

    const target = event.currentTarget as HTMLElement;
    const dialogEl = dialogRef;

    const startX = event.clientX;
    const startY = event.clientY;
    const startHeight = dialogEl.clientHeight;
    const startWidth = dialogEl.clientWidth;
    const startTop = dialogEl.offsetTop;
    const startLeft = dialogEl.offsetLeft;

    createPointerDrag(target, event.pointerId, {
      onMove(e) {
        e.stopPropagation();
        e.preventDefault();

        if (direction === "top" || direction === "top-right" || direction === "top-left") {
          if (dialogEl.style.position === "absolute") {
            dialogEl.style.top = startTop + (e.clientY - startY) + "px";
            dialogEl.style.bottom = "auto";
          }
          dialogEl.style.height = `${Math.max(startHeight - (e.clientY - startY), local.minHeight ?? 0)}px`;
        }
        if (direction === "bottom" || direction === "bottom-right" || direction === "bottom-left") {
          dialogEl.style.height = `${Math.max(startHeight + e.clientY - startY, local.minHeight ?? 0)}px`;
        }
        if (direction === "right" || direction === "bottom-right" || direction === "top-right") {
          dialogEl.style.width = `${Math.max(
            startWidth + (e.clientX - startX) * (dialogEl.style.position === "absolute" ? 1 : 2),
            local.minWidth ?? 0,
          )}px`;
        }
        if (direction === "left" || direction === "bottom-left" || direction === "top-left") {
          if (dialogEl.style.position === "absolute") {
            dialogEl.style.left = startLeft + (e.clientX - startX) + "px";
          }
          dialogEl.style.width = `${Math.max(
            startWidth - (e.clientX - startX) * (dialogEl.style.position === "absolute" ? 1 : 2),
            local.minWidth ?? 0,
          )}px`;
        }
      },
      onEnd(e) {
        e.stopPropagation();
        e.preventDefault();
      },
    });
  };

  // dialog 인라인 스타일 계산
  const dialogStyle = (): JSX.CSSProperties => {
    const style: JSX.CSSProperties = {};

    if (local.fill) {
      style.width = "100%";
      style.height = "100%";
    } else {
      if (local.width !== undefined) {
        style.width = `${local.width}px`;
      }
      if (local.height !== undefined) {
        style.height = `${local.height}px`;
      }
    }

    if (local.minWidth !== undefined) {
      style["min-width"] = `${local.minWidth}px`;
    }
    if (local.minHeight !== undefined) {
      style["min-height"] = `${local.minHeight}px`;
    }

    // position 모드
    if (local.position === "bottom-right") {
      style.position = "absolute";
      style.right = "3rem";
      style.bottom = "2rem";
    } else if (local.position === "top-right") {
      style.position = "absolute";
      style.right = "2rem";
      style.top = "2rem";
    }

    return style;
  };

  // 애니메이션 클래스
  const animationClass = () => {
    const base = clsx("transition-[opacity,transform]", "duration-200", "ease-out");
    if (animating()) {
      return clsx(base, "translate-y-0 opacity-100");
    } else {
      return clsx(base, "-translate-y-4 opacity-0");
    }
  };

  // wrapper 클래스
  const wrapperClass = () =>
    // eslint-disable-next-line tailwindcss/enforces-shorthand -- inset-0은 Chrome 84 미지원
    clsx(
      "fixed bottom-0 left-0 right-0 top-0",
      "flex flex-col items-center",
      !local.fill && "pt-[calc(3rem+0.5rem)]",
      local.float && "pointer-events-none",
    );

  // 백드롭 클래스
  const backdropClass = () =>
    // eslint-disable-next-line tailwindcss/enforces-shorthand -- inset-0은 Chrome 84 미지원
    clsx(
      "absolute bottom-0 left-0 right-0 top-0",
      "bg-black/30",
      "dark:bg-black/50",
      "transition-opacity",
      "duration-200",
      "ease-out",
      animating() ? "opacity-100" : "opacity-0",
    );

  // dialog 클래스
  const dialogBaseClass = () =>
    clsx(
      "relative",
      "mx-auto",
      "w-fit min-w-[200px]",
      "bg-white dark:bg-base-800",
      local.float
        ? clsx("shadow-md dark:shadow-black/30", "border", borderSubtle)
        : "shadow-2xl dark:shadow-black/40",
      local.fill ? "rounded-none border-none" : "rounded-lg",
      "overflow-hidden",
      "flex flex-col",
      "focus:outline-none",
      local.float && "pointer-events-auto",
      animationClass(),
    );

  // 헤더 클래스
  const headerClass = () => clsx("flex items-center", "select-none", "border-b", borderSubtle);

  return (
    <Show when={mounted()}>
      <Portal>
        <DialogSlotsContext.Provider value={{ setHeader, setAction }}>
          <div ref={setWrapperRef} data-modal class={wrapperClass()}>
            {/* 백드롭 */}
            <Show when={!local.float}>
              <div data-modal-backdrop class={backdropClass()} onClick={handleBackdropClick} />
            </Show>

            {/* 다이얼로그 */}
            <div
              ref={(el) => {
                dialogRef = el;
              }}
              data-modal-dialog
              role="dialog"
              aria-modal={local.float ? undefined : true}
              aria-labelledby={hasHeader() ? headerId : undefined}
              tabIndex={0}
              class={twMerge(dialogBaseClass(), local.class)}
              style={dialogStyle()}
              onFocus={handleDialogFocus}
              onTransitionEnd={handleTransitionEnd}
            >
              {/* 헤더 */}
              <Show when={hasHeader()}>
                <div
                  data-modal-header
                  class={clsx(headerClass(), "touch-none")}
                  style={
                    typeof local.headerStyle === "string"
                      ? mergeStyles(local.headerStyle)
                      : local.headerStyle
                  }
                  onPointerDown={handleHeaderPointerDown}
                >
                  <h5 id={headerId} class={clsx("flex-1", "px-4 py-2", "text-sm font-bold")}>
                    {header()!()}
                  </h5>
                  <Show when={action()}>{action()!()}</Show>
                  <Show when={local.closable ?? true}>
                    <button
                      data-modal-close
                      type="button"
                      class={clsx(
                        "inline-flex items-center justify-center",
                        "px-3 py-2",
                        "text-base-400 dark:text-base-500",
                        "hover:text-base-600 dark:hover:text-base-300",
                        "cursor-pointer",
                        "transition-colors",
                      )}
                      onClick={handleCloseClick}
                    >
                      <Icon icon={IconX} size="1.25em" />
                    </button>
                  </Show>
                </div>
              </Show>

              {/* 콘텐츠 */}
              <div data-modal-content class={dialogContentClass}>
                {local.children}
              </div>

              {/* 리사이즈 바 */}
              <Show when={local.resizable}>
                <For each={RESIZE_DIRECTIONS}>
                  {(direction) => (
                    <div
                      data-resize-bar={direction}
                      class={clsx(
                        "absolute",
                        "touch-none",
                        resizePositionMap[direction],
                        resizeCursorMap[direction],
                      )}
                      onPointerDown={(e) => handleResizeBarPointerDown(e, direction)}
                    />
                  )}
                </For>
              </Show>
            </div>
          </div>
        </DialogSlotsContext.Provider>
      </Portal>
    </Show>
  );
};

Dialog.Header = DialogHeader;
Dialog.Action = DialogAction;
