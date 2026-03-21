# Feedback Components

Source: `src/components/feedback/**/*.tsx`

## Progress

Themed progress bar with percentage display.

```ts
type ProgressTheme = SemanticTheme;

interface ProgressProps extends JSX.HTMLAttributes<HTMLDivElement> {
  value: number;            // 0-100
  theme?: ProgressTheme;    // default: "primary"
  size?: ComponentSize;
  inset?: boolean;
}
```

Children override the default percentage text display.

## NotificationProvider

Notification system provider. Maintains up to 50 notifications.

```ts
const NotificationProvider: ParentComponent;
```

### useNotification()

Hook to create and manage notifications.

```ts
function useNotification(): NotificationContextValue;

interface NotificationContextValue {
  // State
  items: Accessor<NotificationItem[]>;
  unreadCount: Accessor<number>;
  latestUnread: Accessor<NotificationItem | undefined>;

  // Create (returns id)
  info: (title: string, message?: string, options?: NotificationOptions) => string;
  success: (title: string, message?: string, options?: NotificationOptions) => string;
  warning: (title: string, message?: string, options?: NotificationOptions) => string;
  danger: (title: string, message?: string, options?: NotificationOptions) => string;
  error: (err?: any, header?: string) => void;

  // Update
  update: (
    id: string,
    updates: Partial<Pick<NotificationItem, "title" | "message" | "theme" | "action">>,
    options?: NotificationUpdateOptions,
  ) => void;

  // Delete
  remove: (id: string) => void;

  // Management
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissBanner: () => void;
  clear: () => void;
}

interface NotificationOptions {
  action?: NotificationAction;
}

interface NotificationAction {
  label: string;
  onClick: () => void;
}

type NotificationTheme = "info" | "success" | "warning" | "danger";

interface NotificationItem {
  id: string;
  theme: NotificationTheme;
  title: string;
  message?: string;
  action?: NotificationAction;
  createdAt: Date;
  read: boolean;
}
```

## NotificationBell

Bell icon button with unread badge and dropdown notification list.

```ts
interface NotificationBellProps {
  showBanner?: boolean;  // show NotificationBanner (default: true)
}
```

Marks all notifications as read when the dropdown opens.

## NotificationBanner

Toast-style notification banner that appears for the latest unread notification. Typically used inside `NotificationBell`.

```ts
const NotificationBanner: Component;
```

## BusyProvider

Global loading overlay provider. Show/hide is nestable (counter-based).

```ts
interface BusyProviderProps {
  variant?: BusyVariant;  // default: "spinner"
}

type BusyVariant = "spinner" | "bar";
```

### useBusy()

Hook to control the loading overlay.

```ts
function useBusy(): BusyContextValue;

interface BusyContextValue {
  variant: Accessor<BusyVariant>;
  show: (message?: string) => void;
  hide: () => void;
  setProgress: (percent: number | undefined) => void;
}
```

`show`/`hide` calls are stackable: the overlay hides only after all `show` calls have corresponding `hide` calls.

## BusyContainer

Local loading overlay container. Can be used standalone or inside `BusyProvider`.

```ts
interface BusyContainerProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  busy?: boolean;             // show loading overlay
  ready?: boolean;            // false = hide children and show overlay (initial loading)
  variant?: BusyVariant;
  message?: string;
  progressPercent?: number;
  children?: JSX.Element;
}
```

- `busy=true`: overlay shown on top of children.
- `ready=false`: children hidden, overlay shown.
- Blocks keyboard input during busy state.

## PrintProvider

Print and PDF generation provider. Uses off-screen Portal rendering.

```ts
const PrintProvider: ParentComponent;
```

Requires `BusyProvider` as an ancestor.

### usePrint()

Hook to print content or generate PDF.

```ts
function usePrint(): PrintContextValue;

interface PrintContextValue {
  toPrinter: (factory: () => JSX.Element, options?: PrintOptions) => Promise<void>;
  toPdf: (factory: () => JSX.Element, options?: PrintOptions) => Promise<Uint8Array>;
}

interface PrintOptions {
  size?: string;    // e.g., "A4", "A3 landscape", "100mm 200mm"
  margin?: string;  // CSS margin, default: "0"
}
```

- `toPrinter`: renders content off-screen, then calls `window.print()`.
- `toPdf`: renders content off-screen, converts to images via `html-to-image`, generates PDF via `jsPDF`.

### usePrintInstance()

Hook available inside print content factories. Call `ready()` to signal that async content (e.g., data loading) is complete.

```ts
function usePrintInstance(): PrintInstance | undefined;

interface PrintInstance {
  ready: () => void;
}
```

## Print

Wrapper for print content.

```ts
const Print: ParentComponent;
```

### Sub-components

- **`Print.Page`** -- Page break boundary. Each `Print.Page` becomes a separate PDF page.
