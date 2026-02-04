import { type ParentComponent, createSignal, createMemo, Show } from "solid-js";
import {
  NotificationContext,
  type NotificationContextValue,
  type NotificationItem,
  type NotificationOptions,
  type NotificationTheme,
} from "./NotificationContext";

const MAX_ITEMS = 50;

export const NotificationProvider: ParentComponent = (props) => {
  const [items, setItems] = createSignal<NotificationItem[]>([]);
  const [dismissedBannerId, setDismissedBannerId] = createSignal<string | null>(null);

  const unreadItems = createMemo(() => items().filter((i) => !i.read));
  const unreadCount = createMemo(() => unreadItems().length);

  const latestUnread = createMemo(() => {
    const latest = unreadItems().at(-1);
    if (!latest) return undefined;
    return latest.id === dismissedBannerId() ? undefined : latest;
  });

  const addNotification = (
    theme: NotificationTheme,
    title: string,
    message?: string,
    options?: NotificationOptions
  ) => {
    const newItem: NotificationItem = {
      id: crypto.randomUUID(),
      theme,
      title,
      message,
      action: options?.action,
      createdAt: new Date(),
      read: false,
    };

    setItems((prev) => {
      const updated = [...prev, newItem];
      if (updated.length > MAX_ITEMS) {
        return updated.slice(-MAX_ITEMS);
      }
      return updated;
    });

    setDismissedBannerId(null);
  };

  const info = (title: string, message?: string, options?: NotificationOptions) => {
    addNotification("info", title, message, options);
  };

  const success = (title: string, message?: string, options?: NotificationOptions) => {
    addNotification("success", title, message, options);
  };

  const warning = (title: string, message?: string, options?: NotificationOptions) => {
    addNotification("warning", title, message, options);
  };

  const danger = (title: string, message?: string, options?: NotificationOptions) => {
    addNotification("danger", title, message, options);
  };

  const markAsRead = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  };

  const markAllAsRead = () => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const dismissBanner = () => {
    const latest = latestUnread();
    if (latest) {
      setDismissedBannerId(latest.id);
    }
  };

  const clear = () => {
    setItems([]);
    setDismissedBannerId(null);
  };

  const contextValue: NotificationContextValue = {
    items,
    unreadCount,
    latestUnread,
    info,
    success,
    warning,
    danger,
    markAsRead,
    markAllAsRead,
    dismissBanner,
    clear,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {/* 스크린 리더용 Live Region */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        class="sr-only"
      >
        <Show when={latestUnread()}>
          {(item) => `알림: ${item().title} ${item().message ?? ""}`}
        </Show>
      </div>
      {props.children}
    </NotificationContext.Provider>
  );
};
