# UI: Overlay Components

## SdBusyContainerControl

A container that shows a loading indicator overlay when `busy` is true. Blocks keyboard events while active.

**Selector:** `sd-busy-container`

```html
<sd-busy-container [busy]="isLoading()" [type]="'spinner'" [message]="'Loading...'">
  <div>Content</div>
</sd-busy-container>

<!-- With progress bar -->
<sd-busy-container [busy]="isUploading()" [useProgress]="true" [progressPercent]="uploadProgress()">
  <div>Content</div>
</sd-busy-container>
```

**Inputs:**

| Input             | Type                           | Description                            |
| ----------------- | ------------------------------ | -------------------------------------- |
| `busy`            | `boolean`                      | Show overlay                           |
| `message`         | `string`                       | Message shown inside indicator         |
| `type`            | `"spinner" \| "bar" \| "cube"` | Indicator style (defaults to provider) |
| `progressPercent` | `number`                       | Progress 0–100 (shows progress bar)    |

---

## SdBusyProvider

Injectable service that manages a global loading overlay and provides a global `type` signal.

**Usage:**

```typescript
import { inject } from "@angular/core";
import { SdBusyProvider } from "@simplysm/sd-angular";

class MyComponent {
  private readonly _busy = inject(SdBusyProvider);

  async load() {
    this._busy.globalBusyCount.update((v) => v + 1);
    try {
      await fetchData();
    } finally {
      this._busy.globalBusyCount.update((v) => v - 1);
    }
  }
}
```

**Signals:**

| Signal            | Type                                           | Description            |
| ----------------- | ---------------------------------------------- | ---------------------- |
| `type`            | `WritableSignal<"spinner" \| "bar" \| "cube">` | Global indicator type  |
| `globalBusyCount` | `WritableSignal<number>`                       | Active loading counter |

---

## SdDropdownControl

Dropdown trigger that shows/hides `SdDropdownPopupControl` on click or keyboard navigation. Positions the popup relative to the trigger element.

**Selector:** `sd-dropdown`

```html
<sd-dropdown>
  <sd-button>Options</sd-button>
  <sd-dropdown-popup>
    <sd-list>
      <sd-list-item (click)="onEdit()">Edit</sd-list-item>
      <sd-list-item (click)="onDelete()">Delete</sd-list-item>
    </sd-list>
  </sd-dropdown-popup>
</sd-dropdown>
```

**Inputs:**

| Input          | Type      | Description             |
| -------------- | --------- | ----------------------- |
| `open` (model) | `boolean` | Dropdown open state     |
| `disabled`     | `boolean` | Prevent opening         |
| `contentClass` | `string`  | Class for popup content |
| `contentStyle` | `string`  | Style for popup content |

**Keyboard behavior:** Arrow Down opens, Arrow Up / Escape closes.

---

## SdDropdownPopupControl

The popup panel inside `SdDropdownControl`. Renders as a fixed overlay positioned by the parent.

**Selector:** `sd-dropdown-popup`

No inputs. Must be a direct child of `SdDropdownControl`.

---

## ISdModalConfig

Persisted size and position state for a modal. Stored via `SdSystemConfigProvider` when a `key` is set on the modal.

```typescript
interface ISdModalConfig {
  position: string;
  left: string;
  top: string;
  right: string;
  bottom: string;
  width: string;
  height: string;
}
```

---

## SdModalControl

The modal dialog shell. Manages open/close animation, resize, move, header, and close button. Created internally by `SdModalProvider`.

**Selector:** `sd-modal`

**Inputs:**

| Input                 | Type      | Description                          |
| --------------------- | --------- | ------------------------------------ |
| `title`               | `string`  | Modal header title                   |
| `key`                 | `string`  | Persistence key for size/position    |
| `hideHeader`          | `boolean` | Hide the header                      |
| `hideCloseButton`     | `boolean` | Hide the X button                    |
| `useCloseByBackdrop`  | `boolean` | Click backdrop to close              |
| `useCloseByEscapeKey` | `boolean` | Press Escape to close                |
| `float`               | `boolean` | Floating (not centered) mode         |
| `fill`                | `boolean` | Full-width mode                      |
| `resizable`           | `boolean` | Show resize handles (default `true`) |
| `movable`             | `boolean` | Drag to move (default `true`)        |
| `minWidthPx`          | `number`  | Minimum width                        |
| `minHeightPx`         | `number`  | Minimum height                       |
| `headerStyle`         | `string`  | Style for header element             |

---

## SdModalProvider

Injectable service for opening modals imperatively.

**Usage:**

```typescript
import { inject } from "@angular/core";
import { SdModalProvider } from "@simplysm/sd-angular";

class MyComponent {
  private readonly _modal = inject(SdModalProvider);

  async openProductPicker() {
    const result = await this._modal.showAsync({
      title: "Select Product",
      type: ProductSelectModal,
      inputs: { filter: this.filter },
    });
    if (result != null) {
      this.selectedProduct.set(result);
    }
  }
}
```

**`showAsync` options:**

| Option                   | Type      | Description                       |
| ------------------------ | --------- | --------------------------------- |
| `key`                    | `string`  | Persistence key for size/position |
| `hideHeader`             | `boolean` | —                                 |
| `hideCloseButton`        | `boolean` | —                                 |
| `useCloseByBackdrop`     | `boolean` | —                                 |
| `useCloseByEscapeKey`    | `boolean` | —                                 |
| `float`                  | `boolean` | —                                 |
| `fill`                   | `boolean` | —                                 |
| `resizable`              | `boolean` | default `true`                    |
| `movable`                | `boolean` | default `true`                    |
| `minWidthPx`             | `number`  | —                                 |
| `minHeightPx`            | `number`  | —                                 |
| `headerStyle`            | `string`  | —                                 |
| `noFirstControlFocusing` | `boolean` | Skip auto-focus of first control  |

**Signals:** `modalCount: Signal<number>` — count of open modals.

---

## SdActivatedModalProvider

An injectable provided per-modal-instance. Allows modal content components to access their modal wrapper.

```typescript
import { inject } from "@angular/core";
import { SdActivatedModalProvider } from "@simplysm/sd-angular";

class MyModalContent {
  private readonly _activatedModal = inject(SdActivatedModalProvider);
}
```

**Signals:** `modalComponent: Signal<SdModalControl | undefined>`, `contentComponent: Signal<T | undefined>`

**Property:** `canDeactivefn: () => boolean` — guard called before close.

---

## ISdModal

Interface that modal content components must implement.

```typescript
interface ISdModal<O> {
  initialized: Signal<boolean>;
  close: OutputEmitterRef<O | undefined>;
  actionTplRef?: TemplateRef<any>; // optional header action buttons
}
```

---

## ISdModalInfo

Input to `SdModalProvider.showAsync` and `SdModalInstance`.

```typescript
interface ISdModalInfo<T extends ISdModal<any>, X extends keyof any = ""> {
  title: string;
  type: Type<T>;
  inputs: Omit<TDirectiveInputSignals<T>, X>;
}
```

---

## SdModalInstance

Class representing an open modal instance. Created by `SdModalProvider.showAsync`.

**Event:** `close: EventEmitter<any>` — emitted when the modal closes.

---

## SdToastContainerControl

The container element appended to `document.body` that holds all toasts. Created internally by `SdToastProvider`.

**Selector:** `sd-toast-container`

**Inputs:** `overlap: boolean` — when true, remove all existing toasts before showing a new one.

---

## SdToastControl

An individual toast notification element.

**Selector:** `sd-toast`

**Inputs:**

| Input         | Type                                                                                                | Description       |
| ------------- | --------------------------------------------------------------------------------------------------- | ----------------- |
| `open`        | `boolean`                                                                                           | Visible state     |
| `theme`       | `"primary" \| "secondary" \| "info" \| "success" \| "warning" \| "danger" \| "gray" \| "blue-gray"` | Color theme       |
| `message`     | `string`                                                                                            | Text message      |
| `useProgress` | `boolean`                                                                                           | Show progress bar |
| `progress`    | `number`                                                                                            | Progress 0–100    |

---

## SdToastProvider

Injectable service for showing toast notifications.

**Usage:**

```typescript
import { inject } from "@angular/core";
import { SdToastProvider } from "@simplysm/sd-angular";

class MyComponent {
  private readonly _toast = inject(SdToastProvider);

  async save() {
    await this._toast.try(async () => {
      await api.save(this.data);
      this._toast.success("Saved successfully");
    });
  }
}
```

**Methods:**

| Method                        | Returns                   | Description                                   |
| ----------------------------- | ------------------------- | --------------------------------------------- |
| `info(message, progress?)`    | bindings object           | Show info toast (auto-closes after 3s)        |
| `success(message, progress?)` | bindings object           | Show success toast                            |
| `warning(message, progress?)` | bindings object           | Show warning toast                            |
| `danger(message, progress?)`  | bindings object           | Show danger toast                             |
| `try(fn, messageFn?)`         | `Promise<R \| undefined>` | Run fn, catch errors and show danger toast    |
| `notify(toast)`               | bindings object           | Show a custom toast component (5s auto-close) |

**Progress toasts:** Pass `useProgress = true`. The returned bindings object has a `progress` signal you can set (0–100); the toast auto-closes 1s after progress reaches 100.

```typescript
const toast = this._toast.info("Uploading...", true);
// ... update progress:
toast.progress.set(50);
toast.progress.set(100); // closes after 1s
```

**Signals:**

| Signal        | Type                       | Description                                 |
| ------------- | -------------------------- | ------------------------------------------- |
| `alertThemes` | `WritableSignal<string[]>` | Themes shown as `alert()` instead of toast  |
| `overlap`     | `WritableSignal<boolean>`  | Remove previous toasts when showing new one |

**Hook:** `beforeShowFn?: (theme) => void` — called before each toast display.

---

## ISdToast

Interface that custom toast content components must implement to work with `SdToastProvider.notify`.

```typescript
interface ISdToast<O> {
  close: OutputEmitterRef<O | undefined>;
}
```

---

## ISdToastInput

Input descriptor for `SdToastProvider.notify`.

```typescript
interface ISdToastInput<T extends ISdToast<any>, X extends keyof any = ""> {
  type: Type<T>;
  inputs: Omit<TDirectiveInputSignals<T>, X>;
}
```

```typescript
import { SdToastProvider, ISdToast, ISdToastInput } from "@simplysm/sd-angular";

@Component({
  template: `
    <div>{{ message() }}</div>
  `,
})
class MyToastComponent implements ISdToast<void> {
  message = input.required<string>();
  close = output<void | undefined>();
}

const toast = inject(SdToastProvider);
toast.notify({ type: MyToastComponent, inputs: { message: "Hello!" } });
```
