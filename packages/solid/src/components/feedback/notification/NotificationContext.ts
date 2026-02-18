import { createContext, useContext, type Accessor } from "solid-js";

export type NotificationTheme = "info" | "success" | "warning" | "danger";

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

export interface NotificationItem {
  id: string;
  theme: NotificationTheme;
  title: string;
  message?: string;
  action?: NotificationAction;
  createdAt: Date;
  read: boolean;
}

export interface NotificationOptions {
  action?: NotificationAction;
}

export interface NotificationUpdateOptions {
  renotify?: boolean;
}

export interface NotificationContextValue {
  // 상태
  items: Accessor<NotificationItem[]>;
  unreadCount: Accessor<number>;
  latestUnread: Accessor<NotificationItem | undefined>;

  // 알림 발생 (id 반환)
  info: (title: string, message?: string, options?: NotificationOptions) => string;
  success: (title: string, message?: string, options?: NotificationOptions) => string;
  warning: (title: string, message?: string, options?: NotificationOptions) => string;
  danger: (title: string, message?: string, options?: NotificationOptions) => string;

  // 에러 처리 (danger 알림 + 로깅)
  try: <TResult>(
    fn: () => Promise<TResult> | TResult,
    header?: string,
  ) => Promise<TResult | undefined>;

  // 알림 수정
  update: (
    id: string,
    updates: Partial<Pick<NotificationItem, "title" | "message" | "theme" | "action">>,
    options?: NotificationUpdateOptions,
  ) => void;

  // 알림 삭제
  remove: (id: string) => void;

  // 관리
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissBanner: () => void;
  clear: () => void;
}

export const NotificationContext = createContext<NotificationContextValue>();

export function useNotification(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification은 NotificationProvider 내부에서만 사용할 수 있습니다");
  }
  return context;
}
