import { type Component, createSignal, For, Show } from "solid-js";
import { IconBell } from "@tabler/icons-solidjs";
import clsx from "clsx";
import { useNotification } from "./NotificationContext";
import { Dropdown } from "../../disclosure/Dropdown";
import { Icon } from "../../display/Icon";
import { NotificationBanner } from "./NotificationBanner";

export interface NotificationBellProps {
  showBanner?: boolean;
}

const buttonClass = clsx(
  "relative",
  "p-2",
  "rounded-full",
  "hover:bg-gray-100",
  "dark:hover:bg-gray-800",
  "transition-colors",
  "focus:outline-none",
  "focus-visible:ring-2",
  "focus-visible:ring-primary-500"
);

const badgeClass = clsx(
  "absolute",
  "top-0",
  "right-0",
  "flex",
  "items-center",
  "justify-center",
  "min-w-5",
  "h-5",
  "px-1",
  "text-xs",
  "font-bold",
  "text-white",
  "bg-red-500",
  "rounded-full"
);

const themeStyles: Record<string, string> = {
  info: "border-l-info-500 bg-info-50 dark:bg-info-900/10",
  success: "border-l-success-500 bg-success-50 dark:bg-success-900/10",
  warning: "border-l-warning-500 bg-warning-50 dark:bg-warning-900/10",
  danger: "border-l-danger-500 bg-danger-50 dark:bg-danger-900/10",
};

export const NotificationBell: Component<NotificationBellProps> = (props) => {
  const notification = useNotification();
  const [open, setOpen] = createSignal(false);
  let buttonRef: HTMLButtonElement | undefined;

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

      <button
        ref={(el) => (buttonRef = el)}
        type="button"
        data-notification-bell
        class={buttonClass}
        aria-label={`알림 ${notification.unreadCount()}개`}
        aria-haspopup="true"
        aria-expanded={open()}
        onClick={() => handleOpenChange(!open())}
      >
        <Icon icon={IconBell} />
        <Show when={notification.unreadCount() > 0}>
          <span data-notification-badge aria-hidden="true" class={badgeClass}>
            {notification.unreadCount()}
          </span>
        </Show>
      </button>

      <Dropdown
        triggerRef={() => buttonRef}
        open={open()}
        onOpenChange={handleOpenChange}
        maxHeight={400}
        class="w-80"
      >
        <div class="p-2">
          <div class="mb-2 flex items-center justify-between px-2">
            <span class="font-semibold">알림</span>
            <Show when={notification.items().length > 0}>
              <button
                type="button"
                data-notification-clear
                class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                onClick={handleClear}
              >
                전체 삭제
              </button>
            </Show>
          </div>

          <Show
            when={notification.items().length > 0}
            fallback={
              <div class="py-8 text-center text-gray-500">알림이 없습니다</div>
            }
          >
            <div class="flex flex-col gap-2">
              <For each={[...notification.items()].reverse()}>
                {(item) => (
                  <div
                    class={clsx(
                      "rounded-lg border-l-4 p-2",
                      themeStyles[item.theme]
                    )}
                  >
                    <div class="font-medium">{item.title}</div>
                    <Show when={item.message}>
                      <div class="text-sm text-gray-600 dark:text-gray-400">
                        {item.message}
                      </div>
                    </Show>
                    <div class="mt-1 text-xs text-gray-400">
                      {item.createdAt.toLocaleTimeString()}
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Dropdown>
    </>
  );
};
