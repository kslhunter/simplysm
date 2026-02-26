import {
  createContext,
  createEffect,
  createSignal,
  createUniqueId,
  For,
  type JSX,
  onCleanup,
  type ParentComponent,
  Show,
  splitProps,
  useContext,
} from "solid-js";
import { Portal } from "solid-js/web";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { IconX } from "@tabler/icons-solidjs";
import { createControllableSignal } from "../../hooks/createControllableSignal";
import { createSlotSignal, type SlotAccessor } from "../../hooks/createSlotSignal";
import { createMountTransition } from "../../hooks/createMountTransition";
import { startPointerDrag } from "../../helpers/startPointerDrag";
import { createSlotComponent } from "../../helpers/createSlotComponent";
import { mergeStyles } from "../../helpers/mergeStyles";
import { useI18nOptional } from "../../providers/i18n/I18nContext";
import { Icon } from "../display/Icon";
import { borderSubtle } from "../../styles/tokens.styles";
import { DialogDefaultsContext } from "./DialogContext";
import { bringToFront, registerDialog, unregisterDialog, isTopmost } from "./dialogZIndex";
import { Button } from "../form-control/Button";

interface DialogSlotsContextValue {
  setHeader: (content: SlotAccessor) => void;
  setAction: (content: SlotAccessor) => void;
}

const DialogSlotsContext = createContext<DialogSlotsContextValue>();

const DialogHeader = createSlotComponent(DialogSlotsContext, (ctx) => ctx.setHeader);
const DialogAction = createSlotComponent(DialogSlotsContext, (ctx) => ctx.setAction);

export interface DialogProps {
  /** Modal open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Show close button (default: true) */
  closable?: boolean;
  /** Close on backdrop click */
  closeOnBackdrop?: boolean;
  /** Close on Escape key (default: true) */
  closeOnEscape?: boolean;
  /** Resizable (default: false) */
  resizable?: boolean;
  /** Draggable (default: true) */
  movable?: boolean;
  /** Floating mode (no backdrop) */
  float?: boolean;
  /** Full-screen mode */
  fill?: boolean;
  /** Width */
  width?: number;
  /** Height */
  height?: number;
  /** Minimum width */
  minWidth?: number;
  /** Minimum height */
  minHeight?: number;
  /** Fixed position */
  position?: "bottom-right" | "top-right";
  /** Header style */
  headerStyle?: JSX.CSSProperties | string;
  /** Confirmation function before closing */
  canDeactivate?: () => boolean;
  /** Callback after close animation completes */
  onCloseComplete?: () => void;
  /** Additional CSS class */
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
 * Dialog component
 *
 * Provides a declarative dialog UI. Supports dragging, 8-directional resizing,
 * float/fill modes, automatic z-index management, and more.
 *
 * @example
 * ```tsx
 * const [open, setOpen] = createSignal(false);
 *
 * <Button onClick={() => setOpen(true)}>Open Dialog</Button>
 * <Dialog open={open()} onOpenChange={setOpen}>
 *   <Dialog.Header>My Dialog</Dialog.Header>
 *   <div class="p-4">Dialog content</div>
 * </Dialog>
 * ```
 */
interface DialogComponent extends ParentComponent<DialogProps> {
  Header: typeof DialogHeader;
  Action: typeof DialogAction;
}

export const Dialog: DialogComponent = (props) => {
  const dialogDefaults = useContext(DialogDefaultsContext);
  const i18n = useI18nOptional();

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

  const [header, setHeader] = createSlotSignal();
  const [action, setAction] = createSlotSignal();
  const hasHeader = () => header() !== undefined;

  const [open, setOpen] = createControllableSignal({
    value: () => local.open ?? false,
    onChange: () => local.onOpenChange,
  });

  // Animation state (mount transition)
  const { mounted, animating, unmount } = createMountTransition(open);

  // Prevent duplicate onCloseComplete calls
  let closeCompleteEmitted = false;

  const emitCloseComplete = () => {
    if (closeCompleteEmitted) return;
    closeCompleteEmitted = true;
    unmount();
    local.onCloseComplete?.();
  };

  // Reset closeCompleteEmitted when open changes + detect fallback unmount
  let wasMounted = false;
  createEffect(() => {
    if (open()) {
      closeCompleteEmitted = false;
    }
    if (mounted()) {
      wasMounted = true;
    } else if (wasMounted) {
      // Prevent onCloseComplete from not being called when fallback timer runs
      // before transitionend and removes DOM
      emitCloseComplete();
    }
  });

  // Dialog ref
  let dialogRef: HTMLDivElement | undefined;

  // Wrapper ref (managed as signal to guarantee Portal ref timing)
  const [wrapperRef, setWrapperRef] = createSignal<HTMLDivElement>();

  const closeOnEscape = () => local.closeOnEscape ?? dialogDefaults?.().closeOnEscape ?? true;
  const closeOnBackdrop = () =>
    local.closeOnBackdrop ?? dialogDefaults?.().closeOnBackdrop ?? false;

  // Detect Escape key
  createEffect(() => {
    if (!open()) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      const el = wrapperRef();
      if (!el || !isTopmost(el)) return;

      if (closeOnEscape()) {
        e.stopImmediatePropagation();
        tryClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown));
  });

  // Register when opening, unregister when closing
  createEffect(() => {
    if (!open()) return;
    const el = wrapperRef();
    if (!el) return;
    registerDialog(el);
    onCleanup(() => unregisterDialog(el));
  });

  // Attempt to close (check canDeactivate)
  const tryClose = () => {
    if (local.canDeactivate && !local.canDeactivate()) return;
    setOpen(false);
  };

  // Backdrop click handler
  const handleBackdropClick = () => {
    if (!closeOnBackdrop()) return;
    tryClose();
  };

  // Close button click handler
  const handleCloseClick = () => {
    tryClose();
  };

  // Handle transitionend event
  const handleTransitionEnd = (e: TransitionEvent) => {
    if (e.propertyName !== "opacity") return;
    if (!open()) {
      emitCloseComplete();
    }
  };

  // Automatic z-index management
  const handleDialogFocus = () => {
    const el = wrapperRef();
    if (!el) return;
    bringToFront(el);
  };

  // Dragging
  const handleHeaderPointerDown = (event: PointerEvent) => {
    // movable default is true
    if (local.movable === false) return;
    const wrapperEl = wrapperRef();
    if (!dialogRef || !wrapperEl) return;
    // Do not treat events from interactive elements like close button as drag
    if ((event.target as HTMLElement).closest("button")) return;

    const target = event.currentTarget as HTMLElement;
    const dialogEl = dialogRef;

    const startX = event.clientX;
    const startY = event.clientY;
    const startTop = dialogEl.offsetTop;
    const startLeft = dialogEl.offsetLeft;

    startPointerDrag(target, event.pointerId, {
      onMove(e) {
        e.stopPropagation();
        e.preventDefault();

        dialogEl.style.position = "absolute";
        dialogEl.style.left = `${startLeft + e.clientX - startX}px`;
        dialogEl.style.top = `${startTop + e.clientY - startY}px`;
        dialogEl.style.right = "auto";
        dialogEl.style.bottom = "auto";
        dialogEl.style.margin = "0";

        // Prevent off-screen
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

  // Resize
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

    startPointerDrag(target, event.pointerId, {
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

  // Calculate dialog inline styles
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

    // Position mode
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

  // Animation class
  const animationClass = () => {
    const base = clsx("transition-[opacity,transform]", "duration-200", "ease-out");
    if (animating()) {
      return clsx(base, "translate-y-0 opacity-100");
    } else {
      return clsx(base, "-translate-y-4 opacity-0");
    }
  };

  // Wrapper class
  const wrapperClass = () =>
    // eslint-disable-next-line tailwindcss/enforces-shorthand -- inset-0 not supported in Chrome 84
    clsx(
      "fixed bottom-0 left-0 right-0 top-0",
      "flex flex-col items-center",
      !local.fill && "pt-[calc(3rem+0.5rem)]",
      local.float && "pointer-events-none",
    );

  // Backdrop class
  const backdropClass = () =>
    // eslint-disable-next-line tailwindcss/enforces-shorthand -- inset-0 not supported in Chrome 84
    clsx(
      "absolute bottom-0 left-0 right-0 top-0",
      "bg-black/30",
      "dark:bg-black/50",
      "transition-opacity",
      "duration-200",
      "ease-out",
      animating() ? "opacity-100" : "opacity-0",
    );

  // Dialog class
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

  // Header class
  const headerClass = () =>
    clsx("flex items-center gap-2", "px-3 py-1", "select-none", "border-b", borderSubtle);

  return (
    <Show when={mounted()}>
      <Portal>
        <DialogSlotsContext.Provider value={{ setHeader, setAction }}>
          <div ref={setWrapperRef} data-modal class={wrapperClass()}>
            {/* Backdrop */}
            <Show when={!local.float}>
              <div data-modal-backdrop class={backdropClass()} onClick={handleBackdropClick} />
            </Show>

            {/* Dialog */}
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
              {/* Header */}
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
                  <h5 id={headerId} class={clsx("flex-1 font-bold")}>
                    {header()!()}
                  </h5>
                  <Show when={action()}>{action()!()}</Show>
                  <Show when={local.closable ?? true}>
                    <Button
                      data-modal-close
                      size={"sm"}
                      variant={"ghost"}
                      aria-label={i18n?.t("dialog.close") ?? "Close dialog"}
                      onClick={handleCloseClick}
                    >
                      <Icon icon={IconX} />
                    </Button>
                  </Show>
                </div>
              </Show>

              {/* Content */}
              <div data-modal-content class={dialogContentClass}>
                {local.children}
              </div>

              {/* Resize bars */}
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
