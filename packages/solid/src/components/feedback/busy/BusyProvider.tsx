import { type ParentComponent, createSignal } from "solid-js";
import { Portal } from "solid-js/web";
import { BusyContext, type BusyContextValue, type BusyType } from "./BusyContext";
import { BusyContainer } from "./BusyContainer";

export interface BusyProviderProps {
  type?: BusyType;
}

export const BusyProvider: ParentComponent<BusyProviderProps> = (props) => {
  const [busyCount, setBusyCount] = createSignal(0);
  const [message, setMessage] = createSignal<string | undefined>();
  const [progress, setProgress] = createSignal<number | undefined>();

  const type = (): BusyType => props.type ?? "spinner";

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
    type,
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
          type={type()}
          message={message()}
          progressPercent={progress()}
          class="fixed left-0 top-0 h-screen w-screen overflow-hidden"
          style={{ "pointer-events": busyCount() > 0 ? "auto" : "none" }}
        />
      </Portal>
    </BusyContext.Provider>
  );
};
