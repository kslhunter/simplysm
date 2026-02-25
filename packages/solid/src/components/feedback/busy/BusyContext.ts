import { createContext, useContext, type Accessor } from "solid-js";

/**
 * Busy overlay display type
 * - `spinner`: Full-screen spinner
 * - `bar`: Top progress bar
 */
export type BusyVariant = "spinner" | "bar";

/**
 * Busy overlay Context value
 */
export interface BusyContextValue {
  /** Current display type */
  variant: Accessor<BusyVariant>;
  /** Show overlay (nestable calls, requires matching hide calls) */
  show: (message?: string) => void;
  /** Hide overlay (actually hides after all show calls have corresponding hide calls) */
  hide: () => void;
  /** Set progress bar progress (0-100, undefined for indeterminate) */
  setProgress: (percent: number | undefined) => void;
}

/** Busy overlay Context */
export const BusyContext = createContext<BusyContextValue>();

/**
 * Hook to access Busy overlay
 *
 * @throws Error if BusyProvider is not present
 */
export function useBusy(): BusyContextValue {
  const context = useContext(BusyContext);
  if (!context) {
    throw new Error("useBusy can only be used inside BusyProvider");
  }
  return context;
}
