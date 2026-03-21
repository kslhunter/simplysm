# Feedback Components

Source: `src/components/feedback/**`

## `Progress`

Animated progress bar with semantic theme.

```ts
type ProgressTheme = SemanticTheme;

interface ProgressProps extends JSX.HTMLAttributes<HTMLDivElement> {
  value: number;
  theme?: ProgressTheme;
  size?: ComponentSize;
  inset?: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `value` | `number` | Progress percentage (0-100) |
| `theme` | `ProgressTheme` | Semantic color theme |
| `size` | `ComponentSize` | Size scale |
| `inset` | `boolean` | Borderless inset style |

Renders percentage text or custom children inside the bar.

## `NotificationProvider`

Notification system provider. Maintains up to 50 notifications with aria-live region for accessibility.

```ts
const NotificationProvider: ParentComponent;
```

### `useNotification()`

```ts
type NotificationTheme = "info" | "success" | "warning" | "danger";

interface NotificationAction {
  label: string;
  onClick: () => void;
}

interface NotificationItem {
  id: string;
  theme: NotificationTheme;
  title: string;
  message?: string;
  action?: NotificationAction;
  createdAt: Date;
  read: boolean;
}

interface NotificationOptions {
  action?: NotificationAction;
}

interface NotificationUpdateOptions {
  renotify?: boolean;
}

interface NotificationContextValue {
  items: Accessor<NotificationItem[]>;
  unreadCount: Accessor<number>;
  latestUnread: Accessor<NotificationItem | undefined>;
  info(title: string, message?: string, options?: NotificationOptions): string;
  success(title: string, message?: string, options?: NotificationOptions): string;
  warning(title: string, message?: string, options?: NotificationOptions): string;
  danger(title: string, message?: string, options?: NotificationOptions): string;
  error(title: string, error: unknown): string;
  update(id: string, data: Partial<Pick<NotificationItem, "title" | "message" | "theme" | "action">>, options?: NotificationUpdateOptions): void;
  remove(id: string): void;
  markAsRead(id: string): void;
  markAllAsRead(): void;
  dismissBanner(): void;
  clear(): void;
}

const NotificationContext: Context<NotificationContextValue>;
function useNotification(): NotificationContextValue;
```

| Method | Description |
|--------|-------------|
| `info()` | Create info notification, returns id |
| `success()` | Create success notification, returns id |
| `warning()` | Create warning notification, returns id |
| `danger()` | Create danger notification, returns id |
| `error()` | Create error notification from Error object, returns id |
| `update()` | Update existing notification by id |
| `remove()` | Remove notification by id |
| `markAsRead()` | Mark single notification as read |
| `markAllAsRead()` | Mark all notifications as read |
| `dismissBanner()` | Dismiss the banner display |
| `clear()` | Remove all notifications |

## `NotificationBell`

Bell icon with unread badge and dropdown notification list.

```ts
interface NotificationBellProps {
  showBanner?: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `showBanner` | `boolean` | Show notification banner |

## `NotificationBanner`

Portal-rendered banner showing latest unread notification with dismiss/action buttons.

```ts
const NotificationBanner: Component;
```

No props. Must be inside NotificationProvider.

## `BusyProvider`

Busy overlay provider with nestable show/hide calls.

```ts
type BusyVariant = "spinner" | "bar";

interface BusyProviderProps {
  variant?: BusyVariant;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `variant` | `BusyVariant` | Display style (default: "spinner") |

### `useBusy()`

```ts
interface BusyContextValue {
  variant: Accessor<BusyVariant>;
  show: (message?: string) => void;
  hide: () => void;
  setProgress: (percent: number | undefined) => void;
}

function useBusy(): BusyContextValue;
```

| Method | Description |
|--------|-------------|
| `show()` | Show busy overlay with optional message. Nestable (counter-based). |
| `hide()` | Hide busy overlay. Must match each show() call. |
| `setProgress()` | Set progress percentage (undefined = indeterminate) |

## `BusyContainer`

Standalone busy container with spinner/bar variants, optional progress bar, and keyboard blocking.

```ts
interface BusyContainerProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  busy?: boolean;
  ready?: boolean;
  variant?: BusyVariant;
  message?: string;
  progressPercent?: number;
  children?: JSX.Element;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `busy` | `boolean` | Show loading overlay |
| `ready` | `boolean` | If false, children are hidden |
| `variant` | `BusyVariant` | Spinner or progress bar |
| `message` | `string` | Loading message text |
| `progressPercent` | `number` | Progress percentage (0-100) |

## `PrintProvider`

Print/PDF generation provider. Renders factory content off-screen for capture.

```ts
const PrintProvider: ParentComponent;
```

### `usePrint()`

```ts
interface PrintOptions {
  size?: string;
  margin?: string;
}

interface PrintContextValue {
  toPrinter: (factory: () => JSX.Element, options?: PrintOptions) => Promise<void>;
  toPdf: (factory: () => JSX.Element, options?: PrintOptions) => Promise<Uint8Array>;
}

function usePrint(): PrintContextValue;
```

| Method | Description |
|--------|-------------|
| `toPrinter()` | Render content and send to system printer |
| `toPdf()` | Render content and return PDF as Uint8Array |

### `usePrintInstance()`

```ts
interface PrintInstance {
  ready: () => void;
}

function usePrintInstance(): PrintInstance | undefined;
```

Call `ready()` inside print content to signal that async content has loaded.

## `Print`

Print content wrapper with page break support.

### Sub-components

- **`Print.Page`** -- Page break boundary. Uses `[data-print-page]` attribute for CSS page breaks.
