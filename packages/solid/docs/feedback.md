# Feedback Components

## Notification

Notification system. `InitializeProvider` automatically sets up `NotificationProvider` and `NotificationBanner`, so you only need to use the `useNotification` hook and optionally add `NotificationBell` in your layout.

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

  // Automatic error handling with try
  const handleLoad = async () => {
    const data = await notification.try(
      async () => await fetchData(),
      "Failed to load data", // optional header
    );
    // On error: shows danger notification with header + err.message,
    // logs err.stack, returns undefined
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
| `try` | `<TResult>(fn: () => Promise<TResult> \| TResult, header?: string) => Promise<TResult \| undefined>` | Execute function with automatic error handling (shows danger notification + logs to `useLogger`) |
| `update` | `(id: string, updates: Partial<NotificationItem>, options?: { renotify?: boolean }) => void` | Update notification |
| `remove` | `(id: string) => void` | Remove notification |
| `markAsRead` | `(id: string) => void` | Mark as read |
| `markAllAsRead` | `() => void` | Mark all as read |
| `dismissBanner` | `() => void` | Dismiss banner |
| `clear` | `() => void` | Clear all |

**Components:**
- `NotificationBanner` -- Top-of-screen notification banner (automatically included by `InitializeProvider`)
- `NotificationBell` -- Notification bell icon (shows unread count, add to your layout as needed)

---

## Busy

Busy overlay system. `InitializeProvider` automatically sets up `BusyProvider` and `BusyContainer`. Use the `busyVariant` option in `AppConfig` to choose between `"spinner"` (default) and `"bar"` variants. Control the busy state using the `useBusy` hook.

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

Browser printing and PDF generation. Must be used inside `InitializeProvider`.

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
