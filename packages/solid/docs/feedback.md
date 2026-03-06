# Feedback

Components for user feedback: notifications, busy/loading states, printing, and progress.

---

## `NotificationContext`

Context and hook for displaying in-app notifications.

```tsx
import { useNotification } from "@simplysm/solid";

const noti = useNotification();
noti.success("Done", "Item saved successfully.");
noti.danger("Save failed", err.message);
```

**`NotificationContextValue`**

| Method | Description |
|--------|-------------|
| `success(title, message, options?)` | Success notification |
| `danger(title, message, options?)` | Danger/error notification |
| `warning(title, message, options?)` | Warning notification |
| `info(title, message, options?)` | Info notification |
| `update(id, options)` | Update an existing notification |
| `remove(id)` | Remove a notification |

Also exports: `NotificationTheme`, `NotificationAction`, `NotificationItem`, `NotificationOptions`, `NotificationUpdateOptions`, `NotificationContextValue`, `NotificationContext`, `NotificationProvider`

---

## `NotificationBell`

Bell icon button showing unread notification count with optional dropdown.

```tsx
import { NotificationBell } from "@simplysm/solid";

<NotificationBell showBanner />
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `showBanner` | `boolean` | Also show notification banner |

---

## `NotificationBanner`

Portal-based banner that appears at the top of the screen showing the latest unread notification.

```tsx
import { NotificationBanner } from "@simplysm/solid";

<NotificationBanner />
```

---

## `BusyContext`

Context and hook for displaying global busy state overlays.

```tsx
import { useBusy, BusyProvider } from "@simplysm/solid";

<BusyProvider variant="spinner">
  <App />
</BusyProvider>

const busy = useBusy();
busy.set(true);
busy.set(false);
```

Also exports: `BusyVariant`, `BusyContextValue`, `BusyProviderProps`

---

## `BusyContainer`

Container that shows a loading overlay (spinner or progress bar) while busy.

```tsx
import { BusyContainer } from "@simplysm/solid";

<BusyContainer busy={loading} ready={initialized} variant="spinner">
  <ContentComponent />
</BusyContainer>
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `busy` | `boolean` | Show busy indicator |
| `ready` | `boolean` | Content is ready (hides skeleton state) |
| `variant` | `BusyVariant` | `"spinner"` or `"bar"` |
| `message` | `string` | Message shown during loading |
| `progressPercent` | `number` | Progress percentage for bar variant |

---

## `PrintContext`

Context and hook for print and PDF generation.

```tsx
import { usePrint } from "@simplysm/solid";

const print = usePrint();

// Print to printer
print.toPrinter(() => <PrintableContent />);

// Generate PDF
const pdfBytes = await print.toPdf(() => <PrintableContent />);
```

**`PrintContextValue`**

| Method | Description |
|--------|-------------|
| `toPrinter(factory, options?)` | Opens browser print dialog |
| `toPdf(factory, options?) => Promise<Uint8Array>` | Generates PDF bytes via html-to-image + jsPDF |

Also exports: `PrintOptions`, `PrintContext`, `PrintInstance`

---

## `PrintProvider`

Provider that enables print functionality via `usePrint()`.

```tsx
import { PrintProvider } from "@simplysm/solid";

<PrintProvider>
  <App />
</PrintProvider>
```

---

## `Print`

Component for defining printable content layout with pages.

```tsx
import { Print } from "@simplysm/solid";

print.toPrinter(() => (
  <Print>
    <Print.Page>Page 1 content</Print.Page>
    <Print.Page>Page 2 content</Print.Page>
  </Print>
));
```

Sub-components: `Print.Page`

---

## `PrintInstanceContext`

Context for communication within print components. Use `usePrintInstance()` inside components rendered via `usePrint()` to access the current print job.

```tsx
import { PrintInstanceContext, usePrintInstance } from "@simplysm/solid";

const printInstance = usePrintInstance();
```

---

## `Progress`

Progress bar component.

```tsx
import { Progress } from "@simplysm/solid";

<Progress value={0.75} theme="primary" size="sm" />
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `value` | `number` | Progress value between 0 and 1 |
| `theme` | `ProgressTheme` | Color theme (SemanticTheme) |
| `size` | `ComponentSizeCompact` | Size |
| `inset` | `boolean` | Borderless inset style |
