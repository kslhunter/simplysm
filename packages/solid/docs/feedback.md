# Feedback

## Notification System

### NotificationProvider / useNotification

```typescript
type NotificationTheme = "info" | "success" | "warning" | "danger";

interface NotificationAction {
  label: string;
  onClick: () => void;
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
  error(err?: any, header?: string): void;

  update(id: string, updates: Partial<NotificationItem>, options?: NotificationUpdateOptions): void;
  remove(id: string): void;
  markAsRead(id: string): void;
  markAllAsRead(): void;
  dismissBanner(): void;
  clear(): void;
}
```

Centralized notification management. Each `info`/`success`/`warning`/`danger` call creates a notification and returns its `id`. Use `error(err)` to display an error object as a danger notification. Maintains up to 50 notifications; older items are removed when exceeded.

Notifications can include an `action` button via the `options` parameter.

### NotificationBell

```typescript
interface NotificationBellProps {
  showBanner?: boolean;
}
```

Bell icon button showing unread notification count. Set `showBanner` to display the latest notification as a banner.

### NotificationBanner

Displays the latest unread notification as a dismissible banner. No props.

---

## Busy Overlay

### BusyProvider / useBusy

```typescript
type BusyVariant = "spinner" | "bar";

interface BusyContextValue {
  variant: Accessor<BusyVariant>;
  show(message?: string): void;
  hide(): void;
  setProgress(percent: number | undefined): void;
}

interface BusyProviderProps {
  variant?: BusyVariant;
}
```

Full-screen loading overlay with nestable `show`/`hide` calls (managed with an internal counter). Each `show` must have a matching `hide`.

- `variant="spinner"` -- centered spinner (default)
- `variant="bar"` -- top progress bar animation
- `setProgress(percent)` -- display a determinate progress bar (0--100, `undefined` for indeterminate)

### BusyContainer

```typescript
interface BusyContainerProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  busy?: boolean;
  ready?: boolean;
  variant?: BusyVariant;
  message?: string;
  progressPercent?: number;
  children?: JSX.Element;
}
```

Local loading overlay for a specific container. Two modes:
- `busy` -- shows overlay while preserving children
- `ready={false}` -- hides children entirely until data is loaded

---

## Print System

### PrintProvider / usePrint

```typescript
interface PrintContextValue {
  toPrinter(factory: () => JSX.Element, options?: PrintOptions): Promise<void>;
  toPdf(factory: () => JSX.Element, options?: PrintOptions): Promise<Uint8Array>;
}

interface PrintOptions {
  size?: string;
  margin?: string;
}
```

Print and PDF generation. `toPrinter` opens the browser print dialog. `toPdf` generates a PDF as a byte array.

### Print

Component used inside the print factory to signal readiness via `usePrintInstance().ready()`.

---

## Usage Examples

```typescript
import { useNotification, useBusy, BusyContainer } from "@simplysm/solid";

// Notifications
const notification = useNotification();
notification.success("Saved", "Record updated successfully");
notification.error(new Error("Connection failed"));

// Notification with action button
notification.info("Update available", "A new version is ready", {
  action: { label: "Refresh", onClick: () => location.reload() },
});

// Global loading
const busy = useBusy();
busy.show("Loading data...");
try { await fetchData(); }
finally { busy.hide(); }

// Local loading container
<BusyContainer busy={isLoading()} variant="spinner">
  <DataContent />
</BusyContainer>
```
