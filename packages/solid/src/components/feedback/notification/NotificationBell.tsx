import { type Component, createSignal, For, Show } from "solid-js";
import { IconBell } from "@tabler/icons-solidjs";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { useNotification } from "./NotificationContext";
import { Dropdown } from "../../disclosure/Dropdown";
import { Icon } from "../../display/Icon";
import { NotificationBanner } from "./NotificationBanner";
import { iconButtonBase } from "../../../styles/patterns.styles";

export interface NotificationBellProps {
  showBanner?: boolean;
}

const buttonClass = twMerge(iconButtonBase, "relative", "p-2", "rounded-full");

const badgeClass = clsx(
  "absolute",
  "top-0",
  "right-0",
  "flex",
  "items-center",
  "justify-center",
  "w-5",
  "h-5",
  "px-1",
  "text-xs",
  "font-bold",
  "text-white",
  "bg-danger-500",
  "rounded-full",
);

const themeStyles: Record<string, string> = {
  info: clsx("border-l-info-500", "bg-info-50", "dark:bg-info-900/10"),
  success: clsx("border-l-success-500", "bg-success-50", "dark:bg-success-900/10"),
  warning: clsx("border-l-warning-500", "bg-warning-50", "dark:bg-warning-900/10"),
  danger: clsx("border-l-danger-500", "bg-danger-50", "dark:bg-danger-900/10"),
};

const dropdownHeaderClass = clsx("mb-2 flex items-center", "justify-between", "px-2");
const clearButtonClass = clsx(
  "text-sm",
  "text-base-500 hover:text-base-700",
  "dark:text-base-400 dark:hover:text-base-300",
);
const emptyClass = clsx("py-8 text-center", "text-base-500 dark:text-base-400");
const listClass = clsx("flex flex-col", "gap-2");
const itemBaseClass = clsx("rounded-lg", "border-l-4", "p-2");
const itemMessageClass = clsx("text-sm", "text-base-600 dark:text-base-400");
const itemTimeClass = clsx("mt-1 text-xs", "text-base-400");

export const NotificationBell: Component<NotificationBellProps> = (props) => {
  const notification = useNotification();
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
          <button
            type="button"
            data-notification-bell
            class={buttonClass}
            aria-label={`${notification.unreadCount()} notifications`}
            aria-haspopup="true"
            aria-expanded={open()}
          >
            <Icon icon={IconBell} />
            <Show when={notification.unreadCount() > 0}>
              <span data-notification-badge aria-hidden="true" class={badgeClass}>
                {notification.unreadCount()}
              </span>
            </Show>
          </button>
        </Dropdown.Trigger>
        <Dropdown.Content>
          <div class="w-80 p-2">
            <div class={dropdownHeaderClass}>
              <span class="font-bold">알림</span>
              <Show when={notification.items().length > 0}>
                <button
                  type="button"
                  data-notification-clear
                  class={clearButtonClass}
                  onClick={handleClear}
                >
                  전체 삭제
                </button>
              </Show>
            </div>

            <Show
              when={notification.items().length > 0}
              fallback={<div class={emptyClass}>알림이 없습니다</div>}
            >
              <div class={listClass}>
                <For each={[...notification.items()].reverse()}>
                  {(item) => (
                    <div class={clsx(itemBaseClass, themeStyles[item.theme])}>
                      <div class="font-medium">{item.title}</div>
                      <Show when={item.message}>
                        <pre class={itemMessageClass}>{item.message}</pre>
                      </Show>
                      <div class={itemTimeClass}>{item.createdAt.toLocaleTimeString()}</div>
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
