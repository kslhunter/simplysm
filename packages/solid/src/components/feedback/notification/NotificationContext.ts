import { type Accessor, createContext, useContext } from "solid-js";

/** 알림 테마 */
export type NotificationTheme = "info" | "success" | "warning" | "danger";

/** 알림 액션 버튼 */
export interface NotificationAction {
  /** 버튼 텍스트 */
  label: string;
  /** 클릭 핸들러 */
  onClick: () => void;
}

/** 알림 항목 */
export interface NotificationItem {
  /** 고유 식별자 */
  id: string;
  /** 테마 (info, success, warning, danger) */
  theme: NotificationTheme;
  /** 알림 제목 */
  title: string;
  /** 알림 메시지 (선택) */
  message?: string;
  /** 액션 버튼 (선택) */
  action?: NotificationAction;
  /** 생성 시각 */
  createdAt: Date;
  /** 읽음 여부 */
  read: boolean;
}

/** 알림 생성 옵션 */
export interface NotificationOptions {
  /** 알림에 표시할 액션 버튼 */
  action?: NotificationAction;
}

/** 알림 수정 옵션 */
export interface NotificationUpdateOptions {
  /** true면 읽은 알림을 다시 읽지 않음 상태로 변경 (배너 재표시) */
  renotify?: boolean;
}

/**
 * 알림 시스템 Context 값
 *
 * @remarks
 * 알림 생성, 수정, 삭제 및 읽음 관리를 위한 메서드 제공.
 * 최대 50개까지 유지되며 초과 시 오래된 항목부터 제거.
 */
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
  error: (err?: any, header?: string) => void;

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

/** 알림 시스템 Context */
export const NotificationContext = createContext<NotificationContextValue>();

/**
 * 알림 시스템에 접근하는 훅
 *
 * @throws NotificationProvider가 없으면 에러 발생
 */
export function useNotification(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification can only be used inside NotificationProvider");
  }
  return context;
}
