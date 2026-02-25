import { createMemo, createSignal, type ParentComponent, Show } from "solid-js";
import {
  NotificationContext,
  type NotificationContextValue,
  type NotificationItem,
  type NotificationOptions,
  type NotificationTheme,
  type NotificationUpdateOptions,
} from "./NotificationContext";
import { useLogger } from "../../../hooks/useLogger";

const MAX_ITEMS = 50;

/**
 * Notification system Provider
 *
 * @remarks
 * - Maintains up to 50 notifications (older items auto-removed)
 * - Shows latest unread notification in banner
 * - Includes aria-live region for screen readers
 * - Logs errors to logger if LoggerProvider is present
 */
export const NotificationProvider: ParentComponent = (props) => {
  const logger = useLogger();
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
    options?: NotificationOptions,
  ): string => {
    const id = crypto.randomUUID();
    const newItem: NotificationItem = {
      id,
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
    return id;
  };

  const info = (title: string, message?: string, options?: NotificationOptions): string => {
    return addNotification("info", title, message, options);
  };

  const success = (title: string, message?: string, options?: NotificationOptions): string => {
    return addNotification("success", title, message, options);
  };

  const warning = (title: string, message?: string, options?: NotificationOptions): string => {
    return addNotification("warning", title, message, options);
  };

  const danger = (title: string, message?: string, options?: NotificationOptions): string => {
    return addNotification("danger", title, message, options);
  };

  const error = (err?: any, header?: string): void => {
    if (err instanceof Error) {
      danger(header ?? err.message, header != null ? err.message : undefined);
      logger.error(err.stack ?? err.message);
      return;
    }
    throw err;
  };

  const update = (
    id: string,
    updates: Partial<Pick<NotificationItem, "title" | "message" | "theme" | "action">>,
    options?: NotificationUpdateOptions,
  ): void => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, ...updates };

        // renotify: if read, change back to unread
        if (options?.renotify && item.read) {
          updated.read = false;
          // if dismissed banner is renotified, show it again
          setDismissedBannerId(null);
        }

        return updated;
      }),
    );
  };

  const remove = (id: string): void => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const markAsRead = (id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
  };

  const markAllAsRead = () => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const dismissBanner = () => {
    const latest = latestUnread();
    if (latest) {
      setDismissedBannerId(latest.id);
      markAsRead(latest.id);
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
    error,
    update,
    remove,
    markAsRead,
    markAllAsRead,
    dismissBanner,
    clear,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {/* Screen reader Live Region */}
      <div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
        <Show when={latestUnread()}>
          {(item) => `Notification: ${item().title} ${item().message ?? ""}`}
        </Show>
      </div>
      {props.children}
    </NotificationContext.Provider>
  );
};
