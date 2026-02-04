import { type Component, createSignal, For, Show } from "solid-js";
import { IconBell } from "@tabler/icons-solidjs";
import clsx from "clsx";
import { useNotification } from "./NotificationContext";
import { Dropdown } from "../overlay/Dropdown";
import { List } from "../data/List";
import { ListItem } from "../data/ListItem";
import { Icon } from "../display/Icon";

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

const themeIconColors: Record<string, string> = {
  info: "text-info-500",
  success: "text-success-500",
  warning: "text-warning-500",
  danger: "text-danger-500",
};

export const NotificationBell: Component = () => {
  const notification = useNotification();
  const [open, setOpen] = createSignal(false);
  let buttonRef: HTMLButtonElement | undefined;

  const handleItemClick = (id: string) => {
    notification.markAsRead(id);
  };

  const handleClear = () => {
    notification.clear();
    setOpen(false);
  };

  return (
    <>
      <button
        ref={(el) => (buttonRef = el)}
        type="button"
        data-notification-bell
        class={buttonClass}
        aria-label={`알림 ${notification.unreadCount()}개`}
        aria-haspopup="true"
        aria-expanded={open()}
        onClick={() => setOpen(!open())}
      >
        <Icon icon={IconBell} size="1.25rem" />
        <Show when={notification.unreadCount() > 0}>
          <span data-notification-badge aria-hidden="true" class={badgeClass}>
            {notification.unreadCount()}
          </span>
        </Show>
      </button>

      <Dropdown
        triggerRef={() => buttonRef}
        open={open()}
        onOpenChange={setOpen}
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
            <List inset>
              <For each={[...notification.items()].reverse()}>
                {(item) => (
                  <ListItem
                    class={clsx(!item.read && "bg-primary-50 dark:bg-primary-900/10")}
                    onClick={() => handleItemClick(item.id)}
                  >
                    <div class="flex items-start gap-3">
                      <div class={clsx("mt-0.5", themeIconColors[item.theme])}>
                        <Icon icon={IconBell} size="1rem" />
                      </div>
                      <div class="flex-1">
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
                    </div>
                  </ListItem>
                )}
              </For>
            </List>
          </Show>
        </div>
      </Dropdown>
    </>
  );
};
