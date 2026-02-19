import { onCleanup, type ParentComponent } from "solid-js";
import { useNotification } from "../components/feedback/notification/NotificationContext";

const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * PWA Service Worker 업데이트 감지 Provider
 *
 * @remarks
 * 5분마다 SW 업데이트를 폴링하며, 새 버전 감지 시 알림을 표시한다.
 * NotificationProvider 내부에서 사용해야 한다.
 *
 * navigator.serviceWorker가 없거나 등록된 SW가 없으면 graceful no-op.
 */
export const PwaUpdateProvider: ParentComponent = (props) => {
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    const notification = useNotification();
    let intervalId: ReturnType<typeof setInterval> | undefined;

    void navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration == null) return;

      intervalId = setInterval(() => {
        void registration.update();
      }, UPDATE_INTERVAL);

      if (registration.waiting != null) {
        promptUpdate(registration.waiting);
      }

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

  return <>{props.children}</>;
};
