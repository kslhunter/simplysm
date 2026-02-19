import { type ParentComponent, createSignal } from "solid-js";
import { Portal } from "solid-js/web";
import clsx from "clsx";
import { BusyContext, type BusyContextValue, type BusyVariant } from "./BusyContext";
import { BusyContainer } from "./BusyContainer";

const overlayClass = clsx("fixed left-0 top-0", "h-screen w-screen", "overflow-hidden");

/** BusyProvider 설정 */
export interface BusyProviderProps {
  /** 표시 방식 (기본값: `"spinner"`) */
  variant?: BusyVariant;
}

/**
 * Busy 오버레이 Provider
 *
 * @remarks
 * - show/hide는 중첩 호출 가능 (내부 카운터로 관리)
 * - Portal로 렌더링하여 항상 최상위에 표시
 * - 독립적으로 동작 (다른 Provider 의존성 없음)
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
