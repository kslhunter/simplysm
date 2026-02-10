import { type ParentComponent, createSignal } from "solid-js";
import { Portal } from "solid-js/web";
import clsx from "clsx";
import { LoadingContext, type LoadingContextValue, type LoadingVariant } from "./LoadingContext";
import { LoadingContainer } from "./LoadingContainer";

const overlayClass = clsx("fixed left-0 top-0", "h-screen w-screen", "overflow-hidden");

export interface LoadingProviderProps {
  variant?: LoadingVariant;
}

export const LoadingProvider: ParentComponent<LoadingProviderProps> = (props) => {
  const [busyCount, setBusyCount] = createSignal(0);
  const [message, setMessage] = createSignal<string | undefined>();
  const [progress, setProgress] = createSignal<number | undefined>();

  const variant = (): LoadingVariant => props.variant ?? "spinner";

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

  const contextValue: LoadingContextValue = {
    variant,
    show,
    hide,
    setProgress: (percent: number | undefined) => setProgress(percent),
  };

  return (
    <LoadingContext.Provider value={contextValue}>
      {props.children}
      <Portal>
        <LoadingContainer
          busy={busyCount() > 0}
          variant={variant()}
          message={message()}
          progressPercent={progress()}
          class={overlayClass}
          style={{ "pointer-events": busyCount() > 0 ? "auto" : "none" }}
        />
      </Portal>
    </LoadingContext.Provider>
  );
};
