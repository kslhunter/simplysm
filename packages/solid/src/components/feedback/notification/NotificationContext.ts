import { type Accessor, createContext, useContext } from "solid-js";

/** Notification theme */
export type NotificationTheme = "info" | "success" | "warning" | "danger";

/** Notification action button */
export interface NotificationAction {
  /** Button text */
  label: string;
  /** Click handler */
  onClick: () => void;
}

/** Notification item */
export interface NotificationItem {
  /** Unique identifier */
  id: string;
  /** Theme (info, success, warning, danger) */
  theme: NotificationTheme;
  /** Notification title */
  title: string;
  /** Notification message (optional) */
  message?: string;
  /** Action button (optional) */
  action?: NotificationAction;
  /** Creation time */
  createdAt: Date;
  /** Read status */
  read: boolean;
}

/** Notification creation options */
export interface NotificationOptions {
  /** Action button to display in notification */
  action?: NotificationAction;
}

/** Notification update options */
export interface NotificationUpdateOptions {
  /** If true, mark read notification as unread (redisplay banner) */
  renotify?: boolean;
}

/**
 * Notification system Context value
 *
 * @remarks
 * Provides methods to create, update, delete, and manage read status of notifications.
 * Maintains up to 50 notifications; older items are removed when exceeded.
 */
export interface NotificationContextValue {
  // State
  items: Accessor<NotificationItem[]>;
  unreadCount: Accessor<number>;
  latestUnread: Accessor<NotificationItem | undefined>;

  // Create notification (returns id)
  info: (title: string, message?: string, options?: NotificationOptions) => string;
  success: (title: string, message?: string, options?: NotificationOptions) => string;
  warning: (title: string, message?: string, options?: NotificationOptions) => string;
  danger: (title: string, message?: string, options?: NotificationOptions) => string;
  error: (err?: any, header?: string) => void;

  // Update notification
  update: (
    id: string,
    updates: Partial<Pick<NotificationItem, "title" | "message" | "theme" | "action">>,
    options?: NotificationUpdateOptions,
  ) => void;

  // Delete notification
  remove: (id: string) => void;

  // Management
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissBanner: () => void;
  clear: () => void;
}

/** Notification system Context */
export const NotificationContext = createContext<NotificationContextValue>();

/**
 * Hook to access the notification system
 *
 * @throws Error if used outside NotificationProvider
 */
export function useNotification(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification can only be used inside NotificationProvider");
  }
  return context;
}
