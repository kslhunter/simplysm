import { type ParentComponent, createSignal, createMemo, Show } from "solid-js";
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
 * 알림 시스템 Provider
 *
 * @remarks
 * - 최대 50개 알림 유지 (초과 시 오래된 항목 자동 제거)
 * - 읽지 않은 최신 알림을 배너로 표시
 * - 스크린 리더용 aria-live region 포함
 * - LoggerProvider가 있으면 에러 알림을 로거에도 기록
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

  const tryFn = async <TResult,>(
    fn: () => Promise<TResult> | TResult,
    header?: string,
  ): Promise<TResult | undefined> => {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof Error) {
        danger(header ?? err.message, header != null ? err.message : undefined);
        logger.error(err.stack ?? err.message);
        return undefined;
      }
      throw err;
    }
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

        // renotify: 읽은 상태면 다시 읽지 않음으로 변경
        if (options?.renotify && item.read) {
          updated.read = false;
          // 배너가 dismiss된 상태에서 renotify되면 다시 보이게
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
    try: tryFn,
    update,
    remove,
    markAsRead,
    markAllAsRead,
    dismissBanner,
    clear,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {/* 스크린 리더용 Live Region */}
      <div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
        <Show when={latestUnread()}>
          {(item) => `알림: ${item().title} ${item().message ?? ""}`}
        </Show>
      </div>
      {props.children}
    </NotificationContext.Provider>
  );
};
