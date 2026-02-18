import { createContext, useContext, type Accessor, type JSX } from "solid-js";

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
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  position?: "bottom-right" | "top-right";
  headerStyle?: JSX.CSSProperties | string;
  canDeactivate?: () => boolean;
}

export interface DialogContextValue {
  show<T = undefined>(
    factory: () => JSX.Element,
    options: DialogShowOptions,
  ): Promise<T | undefined>;
}

export const DialogContext = createContext<DialogContextValue>();

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog는 DialogProvider 내부에서만 사용할 수 있습니다");
  return ctx;
}
