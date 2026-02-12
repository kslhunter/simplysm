import type { ParentComponent } from "solid-js";
import { onCleanup } from "solid-js";
import { type AppConfig, ConfigContext } from "./ConfigContext";
import { useClipboardValueCopy } from "../hooks/useClipboardValueCopy";
import { ThemeProvider } from "./ThemeContext";
import { NotificationProvider } from "../components/feedback/notification/NotificationProvider";
import { NotificationBanner } from "../components/feedback/notification/NotificationBanner";
import { LoadingProvider } from "../components/feedback/loading/LoadingProvider";
import { DialogProvider } from "../components/disclosure/DialogProvider";
import { createPwaUpdate } from "../hooks/createPwaUpdate";
import { useLogger } from "../hooks/useLogger";

/** Runs PWA update detection inside NotificationProvider context */
function PwaUpdater() {
  createPwaUpdate();
  return null;
}

/** Captures uncaught errors and unhandled rejections via useLogger */
function GlobalErrorLogger() {
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

  return null;
}

/**
 * @simplysm/solid 초기화 Provider
 *
 * @remarks
 * 앱 루트에서 한 번 감싸며, 다음을 초기화한다:
 * - 앱 전역 설정 (config) Context 제공
 * - 폼 컨트롤 value 클립보드 복사 지원
 * - 테마 (라이트/다크/시스템)
 * - 알림 시스템 + 배너
 * - 전역 에러 캡처 (window.onerror, unhandledrejection)
 * - 루트 로딩 오버레이
 * - 프로그래매틱 다이얼로그
 *
 * @example
 * ```tsx
 * <InitializeProvider config={{ clientName: "myApp" }}>
 *   <App />
 * </InitializeProvider>
 * ```
 */
export const InitializeProvider: ParentComponent<{ config: AppConfig }> = (props) => {
  // 폼 컨트롤 value 클립보드 복사
  useClipboardValueCopy();

  /* eslint-disable solid/reactivity -- config는 초기 설정값으로 변경되지 않음 */
  return (
    <ConfigContext.Provider value={props.config}>
      <ThemeProvider>
        <NotificationProvider>
          <NotificationBanner />
          <GlobalErrorLogger />
          <PwaUpdater />
          <LoadingProvider variant={props.config.loadingVariant}>
            <DialogProvider>{props.children}</DialogProvider>
          </LoadingProvider>
        </NotificationProvider>
      </ThemeProvider>
    </ConfigContext.Provider>
  );
  /* eslint-enable solid/reactivity */
};
