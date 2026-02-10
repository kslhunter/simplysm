import { createContext, useContext, type Accessor } from "solid-js";

export type LoadingVariant = "spinner" | "bar";

export interface LoadingContextValue {
  variant: Accessor<LoadingVariant>;
  show: (message?: string) => void;
  hide: () => void;
  setProgress: (percent: number | undefined) => void;
}

export const LoadingContext = createContext<LoadingContextValue>();

export function useLoading(): LoadingContextValue {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading은 LoadingProvider 내부에서만 사용할 수 있습니다");
  }
  return context;
}
