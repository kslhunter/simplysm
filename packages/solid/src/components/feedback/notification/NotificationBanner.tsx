import { type Component, Show } from "solid-js";
import { Portal } from "solid-js/web";
import clsx from "clsx";
import { IconX } from "@tabler/icons-solidjs";
import { useNotification } from "./NotificationProvider";
import { useI18n } from "../../../providers/i18n/I18nContext";
import { Icon } from "../../display/Icon";
import { themeTokens } from "../../../styles/theme.styles";
import { gap } from "../../../styles/control.styles";

const themeClasses: Record<string, string> = {
  info: themeTokens.info.solid,
  success: themeTokens.success.solid,
  warning: themeTokens.warning.solid,
  danger: themeTokens.danger.solid,
};

export const NotificationBanner: Component = () => {
  const notification = useNotification();
  const i18n = useI18n();

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
            class={clsx(
              "fixed right-4 top-8 z-notification flex max-w-[calc(100vw-2rem)] items-start gap-4 rounded-lg px-3 py-2 text-white shadow-lg dark:shadow-black/30",
              themeClasses[item().theme],
            )}
          >
            <div class={clsx("flex flex-col", gap.sm, "min-w-0")}>
              <span class="font-bold">{item().title}</span>
              <Show when={item().message}>
                <pre class="overflow-auto opacity-90">{item().message}</pre>
              </Show>
            </div>
            <div class={clsx("flex items-center", gap.xl, "shrink-0")}>
              <Show when={item().action}>
                <button type="button" class="rounded bg-white/20 px-3 py-1 hover:bg-white/30" onClick={handleAction}>
                  {item().action!.label}
                </button>
              </Show>
              <button
                type="button"
                aria-label={i18n.t("notification.close")}
                class="rounded p-1 hover:bg-white/20"
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
