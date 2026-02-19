import { onCleanup, type ParentComponent } from "solid-js";
import { useLogger } from "../hooks/useLogger";

/**
 * 전역 에러 캡처 Provider
 *
 * @remarks
 * window.onerror, unhandledrejection 이벤트를 캡처하여 useLogger를 통해 로깅한다.
 * LoggerProvider가 없으면 consola로 fallback.
 */
export const ErrorLoggerProvider: ParentComponent = (props) => {
  const logger = useLogger();

  const onError = (event: ErrorEvent) => {
    logger.error("Uncaught error:", event.error ?? event.message);
  };

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    logger.error("Unhandled rejection:", event.reason);
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onUnhandledRejection);

  onCleanup(() => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onUnhandledRejection);
  });

  return <>{props.children}</>;
};
