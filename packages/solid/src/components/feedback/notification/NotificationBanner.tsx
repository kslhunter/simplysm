import { type Component, Show } from "solid-js";
import { Portal } from "solid-js/web";
import clsx from "clsx";
import { useNotification } from "./NotificationContext";
import { themeTokens } from "../../../styles/tokens.styles";

const baseClass = clsx(
  "fixed",
  "top-4",
  "right-4",
  "z-50",
  "flex",
  "items-center",
  "justify-between",
  "gap-4",
  "px-3",
  "py-2",
  "text-white",
  "shadow-lg",
  "dark:shadow-black/30",
  "rounded-lg",
  "max-w-sm",
);

const themeClasses: Record<string, string> = {
  info: themeTokens.info.solid,
  success: themeTokens.success.solid,
  warning: themeTokens.warning.solid,
  danger: themeTokens.danger.solid,
};

export const NotificationBanner: Component = () => {
  const notification = useNotification();

  const handleDismiss = () => {
    notification.dismissBanner();
  };

  const handleAction = () => {
    const latest = notification.latestUnread();
    latest?.action?.onClick();
  };

  return (
    <Show when={notification.latestUnread()}>
      {(item) => (
        <Portal>
          <div
            data-notification-banner
            data-theme={item().theme}
            role="alert"
            class={clsx(baseClass, themeClasses[item().theme])}
          >
            <div class="flex flex-col gap-0.5">
              <span class="font-semibold">{item().title}</span>
              <Show when={item().message}>
                <span class="text-sm opacity-90">{item().message}</span>
              </Show>
            </div>
            <div class="flex items-center gap-2">
              <Show when={item().action}>
                <button
                  type="button"
                  class="rounded bg-white/20 px-3 py-1 text-sm hover:bg-white/30"
                  onClick={handleAction}
                >
                  {item().action!.label}
                </button>
              </Show>
              <button
                type="button"
                aria-label="알림 닫기"
                class="rounded p-1 hover:bg-white/20"
                onClick={handleDismiss}
              >
                <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </Portal>
      )}
    </Show>
  );
};
