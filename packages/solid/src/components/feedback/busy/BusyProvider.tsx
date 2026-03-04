import { type ParentComponent, createSignal, createContext, useContext, type Accessor } from "solid-js";
import { Portal } from "solid-js/web";
import { BusyContainer } from "./BusyContainer";

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
const BusyCtx = createContext<BusyContextValue>();

/**
 * Hook to access Busy overlay
 *
 * @throws Error if BusyProvider is not present
 */
export function useBusy(): BusyContextValue {
  const context = useContext(BusyCtx);
  if (!context) {
    throw new Error("useBusy can only be used inside BusyProvider");
  }
  return context;
}

/** BusyProvider configuration */
export interface BusyProviderProps {
  /** Display style (default: `"spinner"`) */
  variant?: BusyVariant;
}

/**
 * Busy Overlay Provider
 *
 * @remarks
 * - show/hide can be nested (managed with internal counter)
 * - Renders via Portal to always display on top
 * - Works independently (no other Provider dependencies)
 */
export const BusyProvider: ParentComponent<BusyProviderProps> = (props) => {
  const [busyCount, setBusyCount] = createSignal(0);
  const [message, setMessage] = createSignal<string | undefined>();
  const [progress, setProgress] = createSignal<number | undefined>();

  const variant = (): BusyVariant => props.variant ?? "spinner";

  const show = (msg?: string): void => {
    setBusyCount((c) => c + 1);
    if (msg !== undefined) {
      setMessage(msg);
    }
  };

  const hide = (): void => {
    const newCount = Math.max(0, busyCount() - 1);
    setBusyCount(newCount);
    if (newCount <= 0) {
      setMessage(undefined);
      setProgress(undefined);
    }
  };

  const contextValue: BusyContextValue = {
    variant,
    show,
    hide,
    setProgress: (percent: number | undefined) => setProgress(percent),
  };

  return (
    <BusyCtx.Provider value={contextValue}>
      {props.children}
      <Portal>
        <BusyContainer
          busy={busyCount() > 0}
          variant={variant()}
          message={message()}
          progressPercent={progress()}
          class="fixed left-0 top-0 h-screen w-screen overflow-hidden"
          style={{ "pointer-events": busyCount() > 0 ? "auto" : "none" }}
        />
      </Portal>
    </BusyCtx.Provider>
  );
};
