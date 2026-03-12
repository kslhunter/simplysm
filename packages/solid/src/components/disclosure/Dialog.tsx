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
  type Accessor,
  type Component,
} from "solid-js";
import { Portal, Dynamic } from "solid-js/web";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { IconX } from "@tabler/icons-solidjs";
import { createControllableSignal } from "../../hooks/createControllableSignal";
import { createMountTransition } from "../../hooks/createMountTransition";
import { startPointerDrag } from "../../helpers/startPointerDrag";
import { createSlot } from "../../helpers/createSlot";
import { mergeStyles } from "../../helpers/mergeStyles";
import { useI18n } from "../../providers/i18n/I18nProvider";
import { Icon } from "../display/Icon";
import { bg, border } from "../../styles/base.styles";
import { bringToFront, registerDialog, unregisterDialog, isTopmost } from "./dialogZIndex";
import { Button } from "../form-control/Button";

//#region Dialog Context Types & Utilities

/** Dialog default configuration */
export interface DialogDefaults {
  /** Allow closing via ESC key */
  closeOnEscape?: boolean;
  /** Allow closing via backdrop click */
  closeOnInteractOutside?: boolean;
}

/** Dialog default configuration Context */
export const DialogDefaultsContext = createContext<Accessor<DialogDefaults>>();

/** Programmatic dialog options */
export interface DialogShowOptions {
  /** Dialog header */
  header?: JSX.Element;
  /** Show close button */
  withCloseButton?: boolean;
  /** Close on backdrop click */
  closeOnInteractOutside?: boolean;
  /** Close on ESC key */
  closeOnEscape?: boolean;
  /** Resizable */
  resizable?: boolean;
  /** Draggable */
  draggable?: boolean;
  /** Display mode */
  mode?: "float" | "fill";
  /** Initial width (px) */
  width?: number;
  /** Initial height (px) */
  height?: number;
  /** Minimum width (px) */
  minWidth?: number;
  /** Minimum height (px) */
  minHeight?: number;
  /** Floating position */
  position?: "bottom-right" | "top-right";
  /** Custom header style */
  headerStyle?: JSX.CSSProperties | string;
  /** Confirmation function before closing (return false to cancel) */
  beforeClose?: () => boolean;
}

/** Extract result type from component's close prop */
export type ExtractCloseResult<P> =
  P extends { close?: (result?: infer T) => void } ? T : undefined;

/** Programmatic dialog Context value */
export interface DialogContextValue {
  /** Open dialog and wait until closing, returns result */
  show<P extends Record<string, any>>(
    component: Component<P>,
    props: "close" extends keyof P ? Omit<P, "close"> : never,
    options?: DialogShowOptions,
  ): Promise<ExtractCloseResult<P> | undefined>;
}

/** Programmatic dialog Context */
export const DialogContext = createContext<DialogContextValue>();

/**
 * Hook to access programmatic dialogs
 *
 * @throws Throws error if DialogProvider is not present
 */
export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog can only be used inside DialogProvider");
  return ctx;
}

//#endregion

const [DialogHeader, createHeaderSlotAccessor] = createSlot<{ children: JSX.Element }>();
const [DialogAction, createActionSlotAccessor] = createSlot<{ children: JSX.Element }>();

export interface DialogProps {
  /** Dialog open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Show close button (default: true) */
  withCloseButton?: boolean;
  /** Close on backdrop click */
  closeOnInteractOutside?: boolean;
  /** Close on Escape key (default: true) */
  closeOnEscape?: boolean;
  /** Resizable (default: false) */
  resizable?: boolean;
  /** Draggable (default: true) */
  draggable?: boolean;
  /** Display mode */
  mode?: "float" | "fill";
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
  beforeClose?: () => boolean;
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
const DialogInner: ParentComponent<DialogProps> = (props) => {
  const dialogDefaults = useContext(DialogDefaultsContext);
  const i18n = useI18n();

  const [local] = splitProps(props, [
    "open",
    "onOpenChange",
    "withCloseButton",
    "closeOnInteractOutside",
    "closeOnEscape",
    "resizable",
    "draggable",
    "mode",
    "width",
    "height",
    "minWidth",
    "minHeight",
    "position",
    "headerStyle",
    "beforeClose",
    "onCloseComplete",
    "class",
    "children",
  ]);

  const headerId = "dialog-header-" + createUniqueId();

  const [header, HeaderProvider] = createHeaderSlotAccessor();
  const [action, ActionProvider] = createActionSlotAccessor();
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
  const closeOnInteractOutside = () =>
    local.closeOnInteractOutside ?? dialogDefaults?.().closeOnInteractOutside ?? false;

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

  // Attempt to close (check beforeClose)
  const tryClose = () => {
    if (local.beforeClose && !local.beforeClose()) return;
    setOpen(false);
  };

  // Backdrop click handler
  const handleBackdropClick = () => {
    if (!closeOnInteractOutside()) return;
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
    // draggable default is true
    if (local.draggable === false) return;
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

    if (local.mode === "fill") {
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

  return (
    <Show when={mounted()}>
      <Portal>
        <HeaderProvider>
          <ActionProvider>
          <div
            ref={setWrapperRef}
            data-dialog
            // eslint-disable-next-line tailwindcss/enforces-shorthand -- inset-0 not supported in Chrome 84
            class={clsx(
              "fixed bottom-0 left-0 right-0 top-0",
              "flex flex-col items-center",
              local.mode !== "fill" && "pt-[calc(3rem+0.5rem)]",
              local.mode === "float" && "pointer-events-none",
            )}
          >
            {/* Backdrop */}
            <Show when={local.mode !== "float"}>
              <div
                data-dialog-backdrop
                // eslint-disable-next-line tailwindcss/enforces-shorthand -- inset-0 not supported in Chrome 84
                class={clsx(
                  "absolute bottom-0 left-0 right-0 top-0",
                  "bg-black/30",
                  "dark:bg-black/50",
                  "transition-opacity",
                  "duration-200",
                  "ease-out",
                  animating() ? "opacity-100" : "opacity-0",
                )}
                onClick={handleBackdropClick}
              />
            </Show>

            {/* Dialog */}
            <div
              ref={(el) => {
                dialogRef = el;
              }}
              data-dialog-panel
              role="dialog"
              aria-modal={local.mode === "float" ? undefined : true}
              aria-labelledby={hasHeader() ? headerId : undefined}
              tabIndex={0}
              class={twMerge(
                clsx(
                  "relative",
                  "mx-auto",
                  "w-fit min-w-[200px]",
                  bg.surface,
                  local.mode === "float"
                    ? clsx("shadow-md dark:shadow-black/30", "border", border.subtle)
                    : "shadow-2xl dark:shadow-black/40",
                  local.mode === "fill" ? "rounded-none border-none" : "rounded-lg",
                  "overflow-hidden",
                  "flex flex-col",
                  "focus:outline-none",
                  local.mode === "float" && "pointer-events-auto",
                  "transition-[opacity,transform] duration-200 ease-out",
                  animating() ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0",
                ),
                local.class,
              )}
              style={dialogStyle()}
              onFocus={handleDialogFocus}
              onTransitionEnd={handleTransitionEnd}
            >
              {/* Header */}
              <Show when={hasHeader()}>
                <div
                  data-dialog-header
                  class={clsx("flex items-center gap-2", "px-3 py-1", "select-none", "border-b", border.subtle, "touch-none")}
                  style={
                    typeof local.headerStyle === "string"
                      ? mergeStyles(local.headerStyle)
                      : local.headerStyle
                  }
                  onPointerDown={handleHeaderPointerDown}
                >
                  <h5 id={headerId} class={clsx("flex-1 font-bold")}>
                    {header()!.children}
                  </h5>
                  <Show when={action()}>{action()!.children}</Show>
                  <Show when={local.withCloseButton ?? true}>
                    <Button
                      data-dialog-close
                      size={"sm"}
                      variant={"ghost"}
                      aria-label={i18n.t("dialog.close")}
                      onClick={handleCloseClick}
                    >
                      <Icon icon={IconX} />
                    </Button>
                  </Show>
                </div>
              </Show>

              {/* Content */}
              <div data-dialog-content class="flex-1 overflow-auto">
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
          </ActionProvider>
        </HeaderProvider>
      </Portal>
    </Show>
  );
};

//#region Export
export const Dialog = Object.assign(DialogInner, {
  Header: DialogHeader,
  Action: DialogAction,
});
//#endregion

//#region DialogProvider

interface DialogEntry {
  id: string;
  component: Component<any>;
  props: Record<string, unknown>;
  options: DialogShowOptions;
  resolve: (result: unknown) => void;
  open: Accessor<boolean>;
  setOpen: (value: boolean) => void;
  pendingResult?: unknown;
}

let nextId = 0;

/**
 * Programmatic dialog Provider
 *
 * Open dialogs with `useDialog().show(component, props, options)`,
 * and close them with `props.close(result)` to resolve the Promise.
 *
 * @example
 * ```tsx
 * <DialogProvider>
 *   <App />
 * </DialogProvider>
 * ```
 */
export interface DialogProviderProps extends DialogDefaults {}

export const DialogProvider: ParentComponent<DialogProviderProps> = (props) => {
  const [local, _rest] = splitProps(props, ["closeOnEscape", "closeOnInteractOutside", "children"]);

  const defaults = () => ({
    closeOnEscape: local.closeOnEscape,
    closeOnInteractOutside: local.closeOnInteractOutside,
  });

  const [entries, setEntries] = createSignal<DialogEntry[]>([]);

  const show = <P extends Record<string, any>,>(
    component: Component<P>,
    componentProps: Record<string, any>,
    options?: DialogShowOptions,
  ): Promise<any> => {
    return new Promise((resolve) => {
      const id = String(nextId++);
      const [open, setOpen] = createSignal(true);
      const entry: DialogEntry = {
        id,
        component,
        props: componentProps,
        options: options ?? {},
        resolve,
        open,
        setOpen,
      };
      setEntries((prev) => [...prev, entry]);
    });
  };

  // Start close animation (set open to false)
  const requestClose = (id: string, result?: unknown) => {
    const entry = entries().find((e) => e.id === id);
    if (entry) {
      entry.pendingResult = result;
      entry.setOpen(false);
    }
  };

  // Actually remove after animation completes
  const removeEntry = (id: string) => {
    setEntries((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry) {
        entry.resolve(entry.pendingResult);
      }
      return prev.filter((e) => e.id !== id);
    });
  };

  const contextValue: DialogContextValue = {
    show,
  };

  return (
    <DialogDefaultsContext.Provider value={defaults}>
      <DialogContext.Provider value={contextValue}>
        {local.children}
        <For each={entries()}>
          {(entry) => (
            <Dialog
              open={entry.open()}
              onOpenChange={(open) => {
                if (!open && entry.pendingResult === undefined) {
                  requestClose(entry.id);
                }
              }}
              onCloseComplete={() => removeEntry(entry.id)}
              withCloseButton={entry.options.withCloseButton}
              closeOnInteractOutside={entry.options.closeOnInteractOutside}
              closeOnEscape={entry.options.closeOnEscape}
              resizable={entry.options.resizable}
              draggable={entry.options.draggable}
              mode={entry.options.mode}
              width={entry.options.width}
              height={entry.options.height}
              minWidth={entry.options.minWidth}
              minHeight={entry.options.minHeight}
              position={entry.options.position}
              headerStyle={entry.options.headerStyle}
              beforeClose={entry.options.beforeClose}
            >
              <Show when={entry.options.header !== undefined}>
                <Dialog.Header>{entry.options.header}</Dialog.Header>
              </Show>
              <Dynamic
                component={entry.component}
                {...entry.props}
                close={(result?: unknown) => requestClose(entry.id, result)}
              />
            </Dialog>
          )}
        </For>
      </DialogContext.Provider>
    </DialogDefaultsContext.Provider>
  );
};

//#endregion
