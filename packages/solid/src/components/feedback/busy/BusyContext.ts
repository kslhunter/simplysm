import { createContext, useContext, type Accessor } from "solid-js";

export type BusyVariant = "spinner" | "bar";

export interface BusyContextValue {
  variant: Accessor<BusyVariant>;
  show: (message?: string) => void;
  hide: () => void;
  setProgress: (percent: number | undefined) => void;
}

export const BusyContext = createContext<BusyContextValue>();

export function useBusy(): BusyContextValue {
  const context = useContext(BusyContext);
  if (!context) {
    throw new Error("useBusy는 BusyProvider 내부에서만 사용할 수 있습니다");
  }
  return context;
}
