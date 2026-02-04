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

export interface NotificationContextValue {
  // 상태
  items: Accessor<NotificationItem[]>;
  unreadCount: Accessor<number>;
  latestUnread: Accessor<NotificationItem | undefined>;

  // 알림 발생
  info: (title: string, message?: string, options?: NotificationOptions) => void;
  success: (title: string, message?: string, options?: NotificationOptions) => void;
  warning: (title: string, message?: string, options?: NotificationOptions) => void;
  danger: (title: string, message?: string, options?: NotificationOptions) => void;

  // 관리
  markAsRead: (id: string) => void;
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
