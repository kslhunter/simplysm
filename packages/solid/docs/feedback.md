# Feedback Components

Source: `src/components/feedback/**`

## `Progress`

Progress bar component with theme colors and custom content support.

```typescript
export interface ProgressProps extends JSX.HTMLAttributes<HTMLDivElement> {
  value: number;
  theme?: ProgressTheme;
  size?: ComponentSize;
  inset?: boolean;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `value` | `number` | Progress value (0-100) |
| `theme` | `SemanticTheme` | Bar color theme. Default: `"primary"` |
| `size` | `ComponentSize` | Padding size |
| `inset` | `boolean` | Borderless transparent background mode |

### `ProgressTheme`

```typescript
export type ProgressTheme = SemanticTheme;
```

---

## `NotificationProvider`

Provider for the notification system. Maintains up to 50 notifications.

### `useNotification`

```typescript
export function useNotification(): NotificationContextValue;
```

### `NotificationContextValue`

```typescript
export interface NotificationContextValue {
  items: Accessor<NotificationItem[]>;
  unreadCount: Accessor<number>;
  latestUnread: Accessor<NotificationItem | undefined>;
  info: (title: string, message?: string, options?: NotificationOptions) => string;
  success: (title: string, message?: string, options?: NotificationOptions) => string;
  warning: (title: string, message?: string, options?: NotificationOptions) => string;
  danger: (title: string, message?: string, options?: NotificationOptions) => string;
  error: (err?: any, header?: string) => void;
  update: (id: string, updates: Partial<Pick<NotificationItem, "title" | "message" | "theme" | "action">>, options?: NotificationUpdateOptions) => void;
  remove: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissBanner: () => void;
  clear: () => void;
}
```

### `NotificationItem`

```typescript
export interface NotificationItem {
  id: string;
  theme: NotificationTheme;
  title: string;
  message?: string;
  action?: NotificationAction;
  createdAt: Date;
  read: boolean;
}
```

### `NotificationTheme`

```typescript
export type NotificationTheme = "info" | "success" | "warning" | "danger";
```

### `NotificationAction`

```typescript
export interface NotificationAction {
  label: string;
  onClick: () => void;
}
```

### `NotificationOptions`

```typescript
export interface NotificationOptions {
  action?: NotificationAction;
}
```

### `NotificationUpdateOptions`

```typescript
export interface NotificationUpdateOptions {
  renotify?: boolean;
}
```

---

## `NotificationBell`

Bell icon button that shows unread count badge and dropdown notification list.

```typescript
export interface NotificationBellProps {
  showBanner?: boolean;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `showBanner` | `boolean` | Show notification banner. Default: `true` |

---

## `NotificationBanner`

Fixed-position banner showing the latest unread notification with dismiss and action buttons.

No props (reads from `NotificationContext`).

---

## `BusyProvider`

Provider for busy overlay state management. Supports nested show/hide calls.

```typescript
export interface BusyProviderProps {
  variant?: BusyVariant;
}
```

### `BusyVariant`

```typescript
export type BusyVariant = "spinner" | "bar";
```

### `useBusy`

```typescript
export function useBusy(): BusyContextValue;

export interface BusyContextValue {
  variant: Accessor<BusyVariant>;
  show: (message?: string) => void;
  hide: () => void;
  setProgress: (percent: number | undefined) => void;
}
```

---

## `BusyContainer`

Inline loading overlay component with spinner or progress bar variants.

```typescript
export interface BusyContainerProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  busy?: boolean;
  ready?: boolean;
  variant?: BusyVariant;
  message?: string;
  progressPercent?: number;
  children?: JSX.Element;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `busy` | `boolean` | Show loading overlay (children preserved) |
| `ready` | `boolean` | If `false`, children hidden and loading shown (initial loading) |
| `variant` | `BusyVariant` | Display style. Inherits from `BusyProvider` context |
| `message` | `string` | Loading message text |
| `progressPercent` | `number` | Progress bar value (0-100) |

---

## `PrintProvider`

Provider for print-to-printer and print-to-PDF functionality.

### `usePrint`

```typescript
export function usePrint(): PrintContextValue;

export interface PrintContextValue {
  toPrinter: (factory: () => JSX.Element, options?: PrintOptions) => Promise<void>;
  toPdf: (factory: () => JSX.Element, options?: PrintOptions) => Promise<Uint8Array>;
}
```

### `PrintOptions`

```typescript
export interface PrintOptions {
  size?: string;
  margin?: string;
}
```

### `usePrintInstance`

```typescript
export function usePrintInstance(): PrintInstance | undefined;

export interface PrintInstance {
  ready: () => void;
}
```

---

## `Print`

Wrapper component for print content with page separation.

### Sub-components

- **`Print.Page`** -- Individual print page container
