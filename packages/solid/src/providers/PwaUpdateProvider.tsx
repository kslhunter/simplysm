import { onCleanup, type ParentComponent } from "solid-js";
import { useNotification } from "../components/feedback/notification/NotificationProvider";

const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * PWA Service Worker update detection Provider.
 *
 * @remarks
 * Polls for SW updates every 5 minutes and displays a notification when a new version is detected.
 * Must be used inside NotificationProvider.
 *
 * Graceful no-op if navigator.serviceWorker is unavailable or no SW is registered.
 */
export const PwaUpdateProvider: ParentComponent = (props) => {
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    const notification = useNotification();
    let intervalId: ReturnType<typeof setInterval> | undefined;
    const cleanups: (() => void)[] = [];

    void navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration == null) return;

      intervalId = setInterval(() => {
        void registration.update();
      }, UPDATE_INTERVAL);

      if (registration.waiting != null) {
        promptUpdate(registration.waiting);
      }

      const onUpdateFound = () => {
        const newSW = registration.installing;
        if (newSW == null) return;

        const onStateChange = () => {
          if (newSW.state === "installed" && navigator.serviceWorker.controller != null) {
            promptUpdate(newSW);
          }
        };
        newSW.addEventListener("statechange", onStateChange);
        cleanups.push(() => newSW.removeEventListener("statechange", onStateChange));
      };

      registration.addEventListener("updatefound", onUpdateFound);
      cleanups.push(() => registration.removeEventListener("updatefound", onUpdateFound));
    }).catch(() => {});

    const onControllerChange = () => {
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    onCleanup(() => {
      if (intervalId != null) {
        clearInterval(intervalId);
      }
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      for (const fn of cleanups) fn();
    });

    function promptUpdate(waitingSW: ServiceWorker): void {
      notification.info("App updated", "Refresh to use the latest version", {
        action: {
          label: "Refresh",
          onClick: () => {
            waitingSW.postMessage({ type: "SKIP_WAITING" });
          },
        },
      });
    }
  }

  return <>{props.children}</>;
};
