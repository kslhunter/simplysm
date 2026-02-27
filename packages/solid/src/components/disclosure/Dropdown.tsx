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
import { tabbable } from "tabbable";

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
   * Absolute position (for context menus, no minWidth)
   * When used with Trigger, calculates position relative to Trigger
   */
  position?: { x: number; y: number };

  /**
   * Popup open state
   */
  open?: boolean;

  /**
   * Callback when open state changes
   */
  onOpenChange?: (open: boolean) => void;

  /**
   * Popup max height (default: 300px), scrolls internally if exceeded
   */
  maxHeight?: number;

  /**
   * Disabled (Trigger click ignored)
   */
  disabled?: boolean;

  /**
   * Enable keyboard navigation (used in Select, etc)
   *
   * When direction=down:
   * - ArrowDown from trigger -> focus first tabbable item in popup
   * - ArrowUp/ArrowDown within popup -> navigate between tabbable items
   * - ArrowUp from first tabbable -> focus trigger
   * - ArrowUp from trigger -> close
   *
   * When direction=up:
   * - ArrowUp from trigger -> focus last tabbable item in popup
   * - ArrowUp/ArrowDown within popup -> navigate between tabbable items
   * - ArrowDown from last tabbable -> focus trigger
   * - ArrowDown from trigger -> close
   */
  keyboardNav?: boolean;

  /**
   * Custom class for popup
   */
  class?: string;

  /**
   * Custom style for popup
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
 * Dropdown popup component
 *
 * Separates trigger and content using Trigger/Content slot pattern.
 * Auto-toggles on Trigger click, can be disabled with disabled prop.
 *
 * @example
 * ```tsx
 * <Dropdown>
 *   <Dropdown.Trigger>
 *     <Button>Open</Button>
 *   </Dropdown.Trigger>
 *   <Dropdown.Content>
 *     <div>Popup content</div>
 *   </Dropdown.Content>
 * </Dropdown>
 * ```
 *
 * @example Context menu (position without Trigger)
 * ```tsx
 * <Dropdown position={{ x: 300, y: 200 }} open={true}>
 *   <Dropdown.Content>
 *     <div>Menu</div>
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

  // Toggle function (includes disabled check)
  const toggle = () => {
    if (local.disabled) return;
    setOpen(!open());
  };

  // Slot registration signals
  const [triggerSlot, setTrigger] = createSlotSignal();
  const [contentSlot, setContent] = createSlotSignal();

  // Trigger wrapper ref (needed for position calculation)
  let triggerRef: HTMLDivElement | undefined;

  // Popup ref
  const [popupRef, setPopupRef] = createSignal<HTMLDivElement>();

  // Animation state (mount transition)
  const { mounted, animating, unmount } = createMountTransition(open);

  // Computed position
  const [computedStyle, setComputedStyle] = createSignal<JSX.CSSProperties>({});

  // Direction (up/down)
  const [direction, setDirection] = createSignal<"down" | "up">("down");

  // Extract position calculation function
  const updatePosition = () => {
    const popup = popupRef();
    if (!popup) return;

    const style: JSX.CSSProperties = {};

    if (triggerRef) {
      const rect = triggerRef.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Determine up/down direction (based on viewport center)
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openDown = spaceBelow >= spaceAbove;
      setDirection(openDown ? "down" : "up");

      // Adjust left/right (prevent off-screen) - relative to viewport
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

      // Determine up/down direction
      const spaceBelow = viewportHeight - local.position.y;
      const spaceAbove = local.position.y;
      const openDown = spaceBelow >= spaceAbove;
      setDirection(openDown ? "down" : "up");

      // Adjust left/right - relative to viewport
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

  // Calculate position on mount + recalculate when popup size changes
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

  // Detect outside click (pointerdown)
  createEffect(() => {
    if (!open()) return;

    const handlePointerDown = (e: PointerEvent) => {
      const popup = popupRef();
      const target = e.target as Node;

      // Ignore clicks inside popup
      if (popup?.contains(target)) return;

      // Ignore clicks inside trigger
      if (triggerRef?.contains(target)) return;

      // Outside click -> close
      setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    onCleanup(() => document.removeEventListener("pointerdown", handlePointerDown));
  });

  // Detect Tab key focus movement (focusout)
  createEffect(() => {
    if (!open()) return;

    const handleFocusOut = (e: FocusEvent) => {
      const popup = popupRef();
      const relatedTarget = e.relatedTarget as Node | null;

      // Ignore if relatedTarget is null (pointerdown handles it)
      if (!relatedTarget) return;

      // Ignore movement to popup
      if (popup?.contains(relatedTarget)) return;

      // Ignore movement to trigger
      if (triggerRef?.contains(relatedTarget)) return;

      // Focus moved outside -> close
      setOpen(false);
    };

    document.addEventListener("focusout", handleFocusOut);
    onCleanup(() => document.removeEventListener("focusout", handleFocusOut));
  });

  // Detect Escape key
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

  // Keyboard navigation: handler for trigger
  const handleTriggerKeyDown = (e: KeyboardEvent) => {
    if (!local.keyboardNav) return;

    // When closed: open with ArrowUp/ArrowDown
    if (!open()) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    // When open: handle based on direction
    const popup = popupRef();
    if (!popup) return;

    const dir = direction();
    const focusables = tabbable(popup);

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

  // Keyboard navigation: handler for popup
  const handlePopupKeyDown = (e: KeyboardEvent) => {
    if (!local.keyboardNav) return;

    // Ignore events already handled (e.g., by List)
    if (e.defaultPrevented) return;

    if (!triggerRef) return;

    const popup = popupRef();
    if (!popup) return;

    const dir = direction();
    const allTabbable = tabbable(popup);
    const current = (document.activeElement as HTMLElement) ?? (e.target as HTMLElement);
    const currentIdx = allTabbable.indexOf(current);

    if (e.key === "ArrowUp") {
      if (currentIdx > 0) {
        e.preventDefault();
        allTabbable[currentIdx - 1]!.focus();
      } else if (dir === "down") {
        e.preventDefault();
        triggerRef.focus();
      }
    } else if (e.key === "ArrowDown") {
      if (currentIdx >= 0 && currentIdx < allTabbable.length - 1) {
        e.preventDefault();
        allTabbable[currentIdx + 1]!.focus();
      } else if (dir === "up") {
        e.preventDefault();
        triggerRef.focus();
      }
    }
  };

  // Detect scroll
  createEffect(() => {
    if (!open()) return;

    const handleScroll = (e: Event) => {
      // Ignore scroll inside popup
      const popup = popupRef();
      if (popup?.contains(e.target as Node)) return;

      setOpen(false);
    };

    // Detect all scroll events with capture
    document.addEventListener("scroll", handleScroll, { capture: true });
    onCleanup(() => document.removeEventListener("scroll", handleScroll, { capture: true }));
  });

  // Detect resize (close when viewport size changes)
  createEffect(() => {
    if (!open()) return;

    const handleResize = () => {
      setOpen(false);
    };

    window.addEventListener("resize", handleResize);
    onCleanup(() => window.removeEventListener("resize", handleResize));
  });

  // Handle transitionend event
  const handleTransitionEnd = (e: TransitionEvent) => {
    // Only handle when opacity transition completes
    if (e.propertyName !== "opacity") return;

    if (!open()) {
      // Closing animation complete -> remove from DOM
      unmount();
    }
  };

  const maxHeight = () => local.maxHeight ?? 300;

  // Animation class (only transition opacity and transform, not position properties)
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

      {/* Render trigger slot (attach click/keyboard handlers to wrapper div) */}
      <Show when={triggerSlot()}>
        <div
          ref={(el) => {
            triggerRef = el;
          }}
          tabIndex={-1}
          data-dropdown-trigger
          onClick={toggle}
          onKeyDown={handleTriggerKeyDown}
        >
          {triggerSlot()!()}
        </div>
      </Show>

      {/* Content slot: Portal + popup */}
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
