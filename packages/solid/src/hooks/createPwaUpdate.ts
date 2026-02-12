import { onCleanup } from "solid-js";
import { useNotification } from "../components/feedback/notification/NotificationContext";

const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * PWA Service Worker update detection hook.
 *
 * Polls for SW updates every 5 minutes. When a new version is detected,
 * shows a notification with a reload action via the Notification system.
 *
 * No-ops gracefully when:
 * - `navigator.serviceWorker` is unavailable (HTTP, unsupported browser)
 * - No service worker is registered (dev mode, tests)
 *
 * Must be called inside NotificationProvider.
 */
export function createPwaUpdate(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  const notification = useNotification();
  let intervalId: ReturnType<typeof setInterval> | undefined;

  void navigator.serviceWorker.getRegistration().then((registration) => {
    if (registration == null) return;

    // Periodic update check
    intervalId = setInterval(() => {
      void registration.update();
    }, UPDATE_INTERVAL);

    // Already waiting SW
    if (registration.waiting != null) {
      promptUpdate(registration.waiting);
    }

    // Detect new SW installation
    registration.addEventListener("updatefound", () => {
      const newSW = registration.installing;
      if (newSW == null) return;

      newSW.addEventListener("statechange", () => {
        if (newSW.state === "installed" && navigator.serviceWorker.controller != null) {
          promptUpdate(newSW);
        }
      });
    });
  });

  // Reload when new SW takes control
  const onControllerChange = () => {
    window.location.reload();
  };
  navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

  onCleanup(() => {
    if (intervalId != null) {
      clearInterval(intervalId);
    }
    navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  });

  function promptUpdate(waitingSW: ServiceWorker): void {
    notification.info("앱이 업데이트되었습니다", "새로고침하면 최신 버전을 사용할 수 있습니다", {
      action: {
        label: "새로고침",
        onClick: () => {
          waitingSW.postMessage({ type: "SKIP_WAITING" });
        },
      },
    });
  }
}
