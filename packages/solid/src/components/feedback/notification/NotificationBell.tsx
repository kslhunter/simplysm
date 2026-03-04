import { type Component, createSignal, For, Show } from "solid-js";
import { IconBell } from "@tabler/icons-solidjs";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { useNotification } from "./NotificationProvider";
import { Dropdown } from "../../disclosure/Dropdown";
import { Icon } from "../../display/Icon";
import { NotificationBanner } from "./NotificationBanner";
import { text } from "../../../styles/base.styles";
import { gap } from "../../../styles/control.styles";
import { Button } from "../../form-control/Button";
import { useI18n } from "../../../providers/i18n/I18nContext";

export interface NotificationBellProps {
  showBanner?: boolean;
}

const themeStyles: Record<string, string> = {
  info: clsx("border-l-info-500", "bg-info-50", "dark:bg-info-900/10"),
  success: clsx("border-l-success-500", "bg-success-50", "dark:bg-success-900/10"),
  warning: clsx("border-l-warning-500", "bg-warning-50", "dark:bg-warning-900/10"),
  danger: clsx("border-l-danger-500", "bg-danger-50", "dark:bg-danger-900/10"),
};

export const NotificationBell: Component<NotificationBellProps> = (props) => {
  const notification = useNotification();
  const i18n = useI18n();
  const [open, setOpen] = createSignal(false);

  const handleClear = () => {
    notification.clear();
    setOpen(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      notification.markAllAsRead();
    }
  };

  return (
    <>
      <Show when={props.showBanner !== false}>
        <NotificationBanner />
      </Show>

      <Dropdown open={open()} onOpenChange={handleOpenChange} maxHeight={400}>
        <Dropdown.Trigger>
          <Button
            variant="ghost"
            size="xs"
            data-notification-bell
            class="relative p-2 rounded-full"
            aria-label={i18n.t("notificationBell.unreadCount", { count: String(notification.unreadCount()) })}
            aria-haspopup="true"
            aria-expanded={open()}
          >
            <Icon icon={IconBell} />
            <Show when={notification.unreadCount() > 0}>
              <span data-notification-badge aria-hidden="true" class="absolute top-0 right-0 flex items-center justify-center w-5 h-5 px-1 text-xs font-bold text-white bg-danger-500 rounded-full">
                {notification.unreadCount()}
              </span>
            </Show>
          </Button>
        </Dropdown.Trigger>
        <Dropdown.Content>
          <div class="w-80 p-2">
            <div class="mb-2 flex items-center justify-between px-2">
              <span class="font-bold">{i18n.t("notificationBell.notifications")}</span>
              <Show when={notification.items().length > 0}>
                <button
                  type="button"
                  data-notification-clear
                  class={clsx("text-sm", text.muted, "hover:text-base-700 dark:hover:text-base-300")}
                  onClick={handleClear}
                >
                  {i18n.t("notificationBell.clearAll")}
                </button>
              </Show>
            </div>

            <Show
              when={notification.items().length > 0}
              fallback={<div class={clsx("py-8 text-center", text.muted)}>{i18n.t("notificationBell.noNotifications")}</div>}
            >
              <div class={clsx("flex flex-col", gap.xl)}>
                <For each={[...notification.items()].reverse()}>
                  {(item) => (
                    <div class={clsx("rounded-lg border-l-4 p-2", themeStyles[item.theme])}>
                      <div class="font-medium">{item.title}</div>
                      <Show when={item.message}>
                        <pre class={clsx("text-sm", text.muted)}>{item.message}</pre>
                      </Show>
                      <div class={clsx("mt-1 text-xs", text.muted)}>{item.createdAt.toLocaleTimeString()}</div>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </Dropdown.Content>
      </Dropdown>
    </>
  );
};
