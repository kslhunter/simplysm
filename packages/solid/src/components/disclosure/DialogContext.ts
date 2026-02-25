import { createContext, useContext, type Accessor, type JSX } from "solid-js";

/** Dialog default configuration */
export interface DialogDefaults {
  /** Allow closing via ESC key */
  closeOnEscape?: boolean;
  /** Allow closing via backdrop click */
  closeOnBackdrop?: boolean;
}

/** Dialog default configuration Context */
export const DialogDefaultsContext = createContext<Accessor<DialogDefaults>>();

/** Programmatic dialog options */
export interface DialogShowOptions {
  /** Dialog header */
  header?: JSX.Element;
  /** Show close button */
  closable?: boolean;
  /** Close on backdrop click */
  closeOnBackdrop?: boolean;
  /** Close on ESC key */
  closeOnEscape?: boolean;
  /** Resizable */
  resizable?: boolean;
  /** Draggable */
  movable?: boolean;
  /** Floating mode (fixed to bottom-right) */
  float?: boolean;
  /** Fill full screen */
  fill?: boolean;
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
  canDeactivate?: () => boolean;
}

/** Programmatic dialog Context value */
export interface DialogContextValue {
  /** Open dialog and wait until closing, returns result */
  show<T = undefined>(
    factory: () => JSX.Element,
    options: DialogShowOptions,
  ): Promise<T | undefined>;
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
