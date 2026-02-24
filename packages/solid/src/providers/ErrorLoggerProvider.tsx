import { onCleanup, type ParentComponent } from "solid-js";
import { useLogger } from "../hooks/useLogger";

/**
 * Global error capture Provider.
 *
 * @remarks
 * Captures window.onerror and unhandledrejection events and logs them via useLogger.
 * Falls back to consola if LoggerProvider is not present.
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
