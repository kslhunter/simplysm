import { type Component, Show } from "solid-js";
import { Portal } from "solid-js/web";
import clsx from "clsx";
import { IconX } from "@tabler/icons-solidjs";
import { useNotification } from "./NotificationContext";
import { Icon } from "../../display/Icon";
import { themeTokens } from "../../../styles/tokens.styles";

const baseClass = clsx(
  "fixed",
  "top-8",
  "right-4",
  "z-notification",
  "flex",
  "items-start",
  "gap-4",
  "px-3",
  "py-2",
  "text-white",
  "shadow-lg",
  "dark:shadow-black/30",
  "rounded-lg",
  "max-w-[calc(100vw-2rem)]",
);

const themeClasses: Record<string, string> = {
  info: themeTokens.info.solid,
  success: themeTokens.success.solid,
  warning: themeTokens.warning.solid,
  danger: themeTokens.danger.solid,
};

const contentClass = clsx("flex flex-col", "gap-0.5", "min-w-0");
const messageClass = clsx("opacity-90", "overflow-auto");
const actionsClass = clsx("flex items-center", "gap-2", "shrink-0");
const actionButtonClass = clsx("rounded", "bg-white/20", "px-3 py-1", "hover:bg-white/30");
const dismissButtonClass = clsx("rounded", "p-1", "hover:bg-white/20");

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
            <div class={contentClass}>
              <span class="font-bold">{item().title}</span>
              <Show when={item().message}>
                <pre class={messageClass}>{item().message}</pre>
              </Show>
            </div>
            <div class={actionsClass}>
              <Show when={item().action}>
                <button type="button" class={actionButtonClass} onClick={handleAction}>
                  {item().action!.label}
                </button>
              </Show>
              <button
                type="button"
                aria-label="알림 닫기"
                class={dismissButtonClass}
                onClick={handleDismiss}
              >
                <Icon icon={IconX} size="1.25em" />
              </button>
            </div>
          </div>
        </Portal>
      )}
    </Show>
  );
};
