import { createContext, useContext, type Accessor, type Component, type JSX } from "solid-js";

export interface DialogDefaults {
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
}

export const DialogDefaultsContext = createContext<Accessor<DialogDefaults>>();

export interface DialogShowOptions {
  title: string;
  hideHeader?: boolean;
  closable?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  resizable?: boolean;
  movable?: boolean;
  float?: boolean;
  fill?: boolean;
  widthPx?: number;
  heightPx?: number;
  minWidthPx?: number;
  minHeightPx?: number;
  position?: "bottom-right" | "top-right";
  headerStyle?: JSX.CSSProperties | string;
  canDeactivate?: () => boolean;
}

export interface DialogContentProps<T = undefined> {
  close: (result?: T) => void;
}

export interface DialogContextValue {
  show<T = undefined>(
    content: Component<DialogContentProps<T>>,
    options: DialogShowOptions,
  ): Promise<T | undefined>;
}

export const DialogContext = createContext<DialogContextValue>();

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within a DialogProvider");
  return ctx;
}
