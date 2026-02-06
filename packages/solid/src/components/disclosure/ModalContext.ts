import { createContext, useContext, type Component, type JSX } from "solid-js";

export interface ModalShowOptions {
  title: string;
  hideHeader?: boolean;
  hideCloseButton?: boolean;
  useCloseByBackdrop?: boolean;
  useCloseByEscapeKey?: boolean;
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

export interface ModalContentProps<T = undefined> {
  close: (result?: T) => void;
}

export interface ModalContextValue {
  show<T = undefined>(
    content: Component<ModalContentProps<T>>,
    options: ModalShowOptions,
  ): Promise<T | undefined>;
}

export const ModalContext = createContext<ModalContextValue>();

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within a ModalProvider");
  return ctx;
}
