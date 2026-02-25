import { type ParentComponent, createSignal } from "solid-js";
import { Portal } from "solid-js/web";
import clsx from "clsx";
import { BusyContext, type BusyContextValue, type BusyVariant } from "./BusyContext";
import { BusyContainer } from "./BusyContainer";

const overlayClass = clsx("fixed left-0 top-0", "h-screen w-screen", "overflow-hidden");

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
    <BusyContext.Provider value={contextValue}>
      {props.children}
      <Portal>
        <BusyContainer
          busy={busyCount() > 0}
          variant={variant()}
          message={message()}
          progressPercent={progress()}
          class={overlayClass}
          style={{ "pointer-events": busyCount() > 0 ? "auto" : "none" }}
        />
      </Portal>
    </BusyContext.Provider>
  );
};
