# UI Overlay

Overlay components: dropdowns, modals, toasts, and busy indicators.

## `SdDropdownControl`

Toggleable dropdown trigger that manages popup positioning, mobile bottom-sheet, and focus lifecycle.

```typescript
@Component({ selector: "sd-dropdown" })
class SdDropdownControl {
  open = model(false);
  disabled = input(false, { transform: booleanAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `open` | `boolean` | `false` | Two-way open state |
| `disabled` | `boolean` | `false` | Disables toggle |

Keyboard: ArrowDown opens, ArrowUp/Escape closes, Space toggles.

## `SdDropdownPopupControl`

Container for dropdown popup content. Auto-caps height at 300px.

```typescript
@Component({ selector: "sd-dropdown-popup" })
class SdDropdownPopupControl { }
```

## `SdModalControl`

Modal dialog shell with drag, resize, focus-trap, z-index management, and config persistence.

```typescript
@Component({ selector: "sd-modal" })
class SdModalControl {
  open = model(false);
  key = input<string>();
  title = input("");
  hideHeader = input(false, { transform: booleanAttribute });
  hideCloseButton = input(false, { transform: booleanAttribute });
  useCloseByBackdrop = input(true, { transform: booleanAttribute });
  useCloseByEscapeKey = input(true, { transform: booleanAttribute });
  float = input(false, { transform: booleanAttribute });
  fill = input(false, { transform: booleanAttribute });
  resizable = input(false, { transform: booleanAttribute });
  movable = input(false, { transform: booleanAttribute });
  position = input<"bottom-right" | "top-right">();
  minHeightPx = input<number>();
  minWidthPx = input<number>();
  heightPx = input<number>();
  widthPx = input<number>();
  headerStyle = input<string>();
  noFirstControlFocusing = input(false, { transform: booleanAttribute });
  actionTplRef = input<TemplateRef<any>>();
  closeRequest = output<void>();
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `open` | `boolean` | `false` | Two-way open state |
| `key` | `string \| undefined` | — | Persistence key for size/position |
| `title` | `string` | `""` | Modal title |
| `hideHeader` | `boolean` | `false` | Hides the header bar |
| `hideCloseButton` | `boolean` | `false` | Hides the X button |
| `useCloseByBackdrop` | `boolean` | `true` | Close on backdrop click |
| `useCloseByEscapeKey` | `boolean` | `true` | Close on Escape key |
| `float` | `boolean` | `false` | Floating (non-centered) modal |
| `fill` | `boolean` | `false` | Full-screen modal |
| `resizable` | `boolean` | `false` | Enable resize handles |
| `movable` | `boolean` | `false` | Enable header drag-to-move |
| `position` | `"bottom-right" \| "top-right" \| undefined` | — | Fixed position variant |
| `minHeightPx` | `number \| undefined` | — | Minimum height |
| `minWidthPx` | `number \| undefined` | — | Minimum width |
| `heightPx` | `number \| undefined` | — | Initial height |
| `widthPx` | `number \| undefined` | — | Initial width |
| `headerStyle` | `string \| undefined` | — | Inline style for header |
| `noFirstControlFocusing` | `boolean` | `false` | Skip auto-focus on first control |

## `SdModalProvider`

Programmatically creates and displays modals.

```typescript
@Injectable({ providedIn: "root" })
class SdModalProvider {
  modalCount: WritableSignal<number>;
  async showAsync<T extends ISdModal<any>>(modal: ISdModalInfo<T>, options?: ISdModalOptions): Promise</* output type */>;
}
```

## `SdActivatedModalProvider`

Injected inside a modal component tree to access the modal shell and content.

```typescript
@Injectable()
class SdActivatedModalProvider<T> {
  modalComponent: WritableSignal<any>;
  contentComponent: WritableSignal<T | undefined>;
  canDeactiveFn: () => boolean;
}
```

## `ISdModal`

Contract that modal content components must implement.

```typescript
interface ISdModal<O> {
  initialized: Signal<boolean>;
  close: OutputEmitterRef<O | undefined>;
  actionTplRef?: TemplateRef<any>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `initialized` | `Signal<boolean>` | Signals when component is ready |
| `close` | `OutputEmitterRef<O \| undefined>` | Emits result on close |
| `actionTplRef` | `TemplateRef<any> \| undefined` | Optional action bar template |

## `ISdModalInfo`

Input descriptor for `SdModalProvider.showAsync`.

```typescript
interface ISdModalInfo<T> {
  title: string;
  type: Type<T>;
  inputs: Omit<TDirectiveInputSignals<T>, "initialized" | "close" | "actionTplRef">;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Modal title |
| `type` | `Type<T>` | Component class |
| `inputs` | `Omit<TDirectiveInputSignals<T>, ...>` | Input values (excluding modal internals) |

## `ISdModalOptions`

Display and behavior options for `showAsync`.

```typescript
interface ISdModalOptions {
  key?: string;
  hideHeader?: boolean;
  hideCloseButton?: boolean;
  useCloseByBackdrop?: boolean;
  useCloseByEscapeKey?: boolean;
  float?: boolean;
  fill?: boolean;
  resizable?: boolean;
  movable?: boolean;
  position?: "bottom-right" | "top-right";
  minHeightPx?: number;
  minWidthPx?: number;
  heightPx?: number;
  widthPx?: number;
  headerStyle?: string;
  noFirstControlFocusing?: boolean;
}
```

## `SdPromptModalControl`

Built-in modal with a text input. Implements `ISdModal<string>`.

```typescript
@Component({ selector: "sd-prompt-modal" })
class SdPromptModalControl implements ISdModal<string> {
  message = input.required<string>();
  close = output<string | undefined>();
  initialized = signal(true);
}
```

Confirm emits the entered string; cancel emits `undefined`.

## `SdConfirmModalControl`

Built-in confirm/cancel modal. Implements `ISdModal<boolean>`.

```typescript
@Component({ selector: "sd-confirm-modal" })
class SdConfirmModalControl implements ISdModal<boolean> {
  message = input.required<string>();
  close = output<boolean | undefined>();
  initialized = signal(true);
}
```

Confirm emits `true`; cancel emits `undefined`.

## `SdToastControl`

Single toast notification with optional progress bar and slide/fade animation.

```typescript
@Component({ selector: "sd-toast" })
class SdToastControl {
  open = model(false);
  progress = model(0);
  message = model<string>();
  useProgress = input(false, { transform: booleanAttribute });
  theme = input<TSdToastTheme>("info");
}
```

## `SdToastContainerControl`

Fixed-position container for `sd-toast` elements. Stacks vertically at top of viewport.

```typescript
@Component({ selector: "sd-toast-container" })
class SdToastContainerControl {
  overlap = input(false, { transform: booleanAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `overlap` | `boolean` | `false` | Single toast as full-bottom overlay |

## `SdToastProvider`

Programmatic toast creation and display.

```typescript
@Injectable({ providedIn: "root" })
class SdToastProvider {
  alertThemes: WritableSignal<TSdToastSeverity[]>;
  overlap: WritableSignal<boolean>;
  beforeShowFn?: (theme: TSdToastSeverity) => void;

  info(message: string, useProgress?: boolean): void | WritableSignal<number>;
  success(message: string, useProgress?: boolean): void | WritableSignal<number>;
  warning(message: string, useProgress?: boolean): void | WritableSignal<number>;
  danger(message: string, useProgress?: boolean): void | WritableSignal<number>;
  async notify<T>(input: ISdToastInput<T>): Promise<any>;
  async try<R>(fn: () => Promise<R>, messageFn?: (err: Error) => string): Promise<R | undefined>;
}
```

- When `useProgress` is `true`, returns a `WritableSignal<number>` to update progress (0–100).
- `try`: runs async function; shows `danger` toast on error and logs via `SdSystemLogProvider`.

## `TSdToastSeverity`

```typescript
type TSdToastSeverity = "info" | "success" | "warning" | "danger";
```

## `TSdToastTheme`

```typescript
type TSdToastTheme = "primary" | "secondary" | TSdToastSeverity | "gray" | "blue-gray";
```

## `ISdToast`

Contract for custom toast content components.

```typescript
interface ISdToast<O> {
  close: OutputEmitterRef<O | undefined>;
}
```

## `ISdToastInput`

Input for `SdToastProvider.notify`.

```typescript
interface ISdToastInput<T> {
  type: Type<T>;
  inputs: Omit<TDirectiveInputSignals<T>, "close">;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `Type<T>` | Toast component class |
| `inputs` | `Omit<TDirectiveInputSignals<T>, "close">` | Input values |

## `SdBusyContainerControl`

Overlay that blocks interaction and shows an animated indicator while busy.

```typescript
@Component({ selector: "sd-busy-container" })
class SdBusyContainerControl {
  busy = input(false, { transform: booleanAttribute });
  message = input<string>();
  type = input<TSdBusyType>();
  progressPercent = input<number>();
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `busy` | `boolean` | `false` | Shows overlay when true |
| `message` | `string \| undefined` | — | Message shown during busy |
| `type` | `TSdBusyType \| undefined` | provider default | Animation type |
| `progressPercent` | `number \| undefined` | — | Shows progress bar when set |

## `SdBusyProvider`

Global busy state manager. Creates a full-screen overlay on `document.body`.

```typescript
@Injectable({ providedIn: "root" })
class SdBusyProvider {
  type: WritableSignal<TSdBusyType>; // default: "bar"
  globalBusyCount: WritableSignal<number>;
}
```

Increment `globalBusyCount` to show the overlay; decrement to hide.

## `TSdBusyType`

```typescript
type TSdBusyType = "spinner" | "bar" | "cube";
```
