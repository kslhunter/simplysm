# Feedback Components

## Notification

Notification system. Set up `NotificationProvider` and `NotificationBanner` in your provider tree. Use the `useNotification` hook to show notifications and optionally add `NotificationBell` in your layout.

```tsx
import {
  NotificationBell,
  useNotification,
} from "@simplysm/solid";

// Trigger notifications within components
function MyComponent() {
  const notification = useNotification();

  const handleSave = () => {
    notification.success("Success", "Saved successfully.");
  };

  const handleError = () => {
    notification.danger("Error", "An issue occurred.", {
      action: { label: "Retry", onClick: handleRetry },
    });
  };

  // Error handling with error()
  const handleLoad = async () => {
    try {
      const data = await fetchData();
    } catch (err) {
      notification.error(err, "Failed to load data"); // optional header
      // Shows danger notification with header + err.message,
      // logs err.stack via useLogger
    }
  };

  return <Button onClick={handleSave}>Save</Button>;
}
```

**useNotification API:**

| Property/Method | Type/Signature | Description |
|-----------------|----------------|-------------|
| `items` | `Accessor<NotificationItem[]>` | Reactive notification list |
| `unreadCount` | `Accessor<number>` | Unread notification count |
| `latestUnread` | `Accessor<NotificationItem \| undefined>` | Most recent unread notification |
| `info` | `(title: string, message?: string, options?: NotificationOptions) => string` | Info notification |
| `success` | `(title: string, message?: string, options?: NotificationOptions) => string` | Success notification |
| `warning` | `(title: string, message?: string, options?: NotificationOptions) => string` | Warning notification |
| `danger` | `(title: string, message?: string, options?: NotificationOptions) => string` | Error notification |
| `error` | `(err?: any, header?: string) => void` | Show error notification from caught error (shows danger notification + logs to `useLogger`). Re-throws if `err` is not an `Error` instance. |
| `update` | `(id: string, updates: Partial<NotificationItem>, options?: { renotify?: boolean }) => void` | Update notification |
| `remove` | `(id: string) => void` | Remove notification |
| `markAsRead` | `(id: string) => void` | Mark as read |
| `markAllAsRead` | `() => void` | Mark all as read |
| `dismissBanner` | `() => void` | Dismiss banner |
| `clear` | `() => void` | Clear all |

**Components:**
- `NotificationBanner` -- Top-of-screen notification banner. Automatically included by `SystemProvider`.
- `NotificationBell` -- Notification bell icon (shows unread count badge; click to view history). Add to your layout as needed. By default includes its own `NotificationBanner` instance via `showBanner` prop — set `showBanner={false}` when using with `SystemProvider` to avoid a duplicate banner.

**NotificationBell Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showBanner` | `boolean` | `true` | Render a `NotificationBanner` alongside the bell. Set to `false` when `SystemProvider` already provides one. |

---

## Busy

Busy overlay system. Set up `BusyProvider` in your provider tree. Pass `variant` prop to choose between `"spinner"` (default) and `"bar"` variants. Control the busy state using the `useBusy` hook.

```tsx
import { useBusy } from "@simplysm/solid";

// Control busy within components
function MyComponent() {
  const busy = useBusy();

  const fetchData = async () => {
    busy.show("Loading data...");
    try {
      await fetch("/api/data");
    } finally {
      busy.hide();
    }
  };

  return <Button onClick={fetchData}>Load Data</Button>;
}
```

**useBusy API:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `show` | `(message?: string) => void` | Show busy overlay |
| `hide` | `() => void` | Hide busy overlay |
| `setProgress` | `(percent: number \| undefined) => void` | Set progress |

**BusyContainer Props:**

`BusyContainer` can also be used directly to wrap content with busy state control:

```tsx
import { BusyContainer } from "@simplysm/solid";

<BusyContainer busy={isLoading()} message="Loading...">
  {/* wrapped content */}
</BusyContainer>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `busy` | `boolean` | - | Show busy overlay |
| `ready` | `boolean` | `true` | When `false`, shows busy and hides children; when `true`, shows children (controls rendering) |
| `variant` | `"spinner" \| "bar"` | - | Busy overlay variant |
| `message` | `string` | - | Message to display |
| `progressPercent` | `number` | - | Progress percentage (0-100) |

---

## Print / usePrint

Browser printing and PDF generation. Requires `<PrintProvider>` in the component tree.

```tsx
// Provider setup:
<SystemProvider clientName="my-app">
  <PrintProvider>
    <App />
  </PrintProvider>
</SystemProvider>
```

```tsx
import { Print, usePrint } from "@simplysm/solid";

function MyComponent() {
  const { toPrinter, toPdf } = usePrint();

  const handlePrint = async () => {
    await toPrinter(
      () => (
        <Print>
          <Print.Page>
            <h1>Print content</h1>
            <p>Page 1</p>
          </Print.Page>
          <Print.Page>
            <p>Page 2</p>
          </Print.Page>
        </Print>
      ),
      { size: "A4", margin: "10mm" },
    );
  };

  const handlePdf = async () => {
    const pdfData = await toPdf(
      () => (
        <Print>
          <Print.Page>
            <h1>PDF content</h1>
          </Print.Page>
        </Print>
      ),
      { size: "A4 landscape" },
    );
    // pdfData: Uint8Array
  };

  return (
    <>
      <Button onClick={handlePrint}>Print</Button>
      <Button onClick={handlePdf}>Download PDF</Button>
    </>
  );
}
```

**usePrint API:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `toPrinter` | `(factory: () => JSX.Element, options?: PrintOptions) => Promise<void>` | Browser print |
| `toPdf` | `(factory: () => JSX.Element, options?: PrintOptions) => Promise<Uint8Array>` | PDF generation |

**PrintOptions:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `size` | `string` | `"A4"` | Paper size (`"A4"`, `"A3"`, `"A4 landscape"`, `"210mm 297mm"`, etc.) |
| `margin` | `string` | `"0"` | Margins (`"10mm"`, `"1cm"`, etc.) |

**Sub-components:**
- `Print.Page` -- Explicit page breaks (auto-breaks if not used)

**usePrintInstance (for async data in print content):**

Use `usePrintInstance` inside print content components when you need to load async data before rendering. Call `ready()` to signal that the content is ready to print.

```tsx
import { usePrintInstance } from "@simplysm/solid";
import { createResource, Show } from "solid-js";

function InvoicePrintContent(props: { invoiceId: number }) {
  const printInstance = usePrintInstance();
  const [invoice] = createResource(() => fetchInvoice(props.invoiceId));

  createEffect(() => {
    if (invoice()) {
      printInstance?.ready();  // signal that content is ready
    }
  });

  return (
    <Show when={invoice()}>
      {(inv) => (
        <Print>
          <Print.Page>
            <h1>Invoice #{inv().id}</h1>
            {/* invoice content */}
          </Print.Page>
        </Print>
      )}
    </Show>
  );
}

// Usage
const { toPrinter } = usePrint();
await toPrinter(() => <InvoicePrintContent invoiceId={123} />, { size: "A4", margin: "10mm" });
```
