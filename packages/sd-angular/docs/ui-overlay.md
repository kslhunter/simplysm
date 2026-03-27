# UI - Overlay Components

## Busy

### SdBusyContainerControl

**Type:** `@Component` | **Selector:** `sd-busy-container`

Container that shows a loading indicator overlay when busy. Blocks keyboard events while active. Supports multiple animation types.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `busy` | `boolean \| ""` | No | `false` | Show loading overlay |
| `message` | `string` | No | -- | Loading message text |
| `type` | `"spinner" \| "bar" \| "cube"` | No | -- | Animation type |
| `progressPercent` | `number` | No | -- | Progress bar percentage (0-100) |

---

### SdBusyProvider

**Type:** `@Injectable({ providedIn: "root" })`

Global busy state manager. Manages a global overlay and busy count.

| Signal | Type | Description |
|--------|------|-------------|
| `type` | `SdWritableSignal<"spinner" \| "bar" \| "cube">` | Animation type (default: `"bar"`) |
| `globalBusyCount` | `SdWritableSignal<number>` | Active busy count (overlay shown when > 0) |

| Property | Type | Description |
|----------|------|-------------|
| `containerRef` | `ComponentRef<SdBusyContainerControl>` | Lazy-created global container |

---

## Dropdown

### SdDropdownControl

**Type:** `@Component` | **Selector:** `sd-dropdown`

Dropdown toggle container. Contains a trigger element and a popup content area.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `disabled` | `boolean \| ""` | No | `false` | Disable dropdown toggle |
| `contentClass` | `string` | No | -- | CSS class for popup |
| `contentStyle` | `string` | No | -- | CSS style for popup |

#### Models

| Model | Type | Default | Description |
|-------|------|---------|-------------|
| `open` | `boolean` | `false` | Dropdown open state |

---

### SdDropdownPopupControl

**Type:** `@Component` | **Selector:** `sd-dropdown-popup`

The popup content area for a dropdown. Positioned relative to the trigger element.

No inputs.

---

## Modal

### SdModalControl

**Type:** `@Component` | **Selector:** `sd-modal`

Modal dialog with backdrop, title bar, resize/move handles, and configurable close behavior.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `title` | `string` | Yes | -- | Modal title |
| `key` | `string` | No | -- | Persistence key for position/size |
| `hideHeader` | `boolean \| ""` | No | `false` | Hide the title bar |
| `hideCloseButton` | `boolean \| ""` | No | `false` | Hide the X close button |
| `useCloseByBackdrop` | `boolean \| ""` | No | `false` | Close on backdrop click |
| `useCloseByEscapeKey` | `boolean \| ""` | No | `false` | Close on Escape key |
| `resizable` | `boolean \| ""` | No | `false` | Enable resize handles |
| `movable` | `boolean \| ""` | No | `true` | Enable drag-to-move |
| `float` | `boolean \| ""` | No | `false` | Float mode (no backdrop) |
| `fill` | `boolean \| ""` | No | `false` | Fill entire viewport |
| `actionTplRef` | `TemplateRef<any>` | No | -- | Template for header action buttons |
| `heightPx` | `number` | No | -- | Initial height in pixels |
| `widthPx` | `number` | No | -- | Initial width in pixels |
| `minHeightPx` | `number` | No | -- | Minimum height |
| `minWidthPx` | `number` | No | -- | Minimum width |
| `position` | `"bottom-right" \| "top-right"` | No | -- | Position preset |
| `headerStyle` | `string` | No | -- | CSS style for header |

#### Models

| Model | Type | Default | Description |
|-------|------|---------|-------------|
| `open` | `boolean` | `false` | Modal open state |

#### ISdModalConfig

Configuration persisted per modal key for position and size.

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

### SdModalProvider

**Type:** `@Injectable({ providedIn: "root" })`

Programmatic modal management. Creates modals dynamically from component types.

| Signal | Type | Description |
|--------|------|-------------|
| `modalCount` | `SdWritableSignal<number>` | Number of currently open modals |

| Method | Signature | Description |
|--------|-----------|-------------|
| `showAsync` | `<T extends ISdModal<any>>(modal: ISdModalInfo<T>, options?) => Promise<O \| undefined>` | Show a modal and wait for result |

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `key` | `string` | -- | Persistence key |
| `hideHeader` | `boolean` | `false` | Hide title bar |
| `hideCloseButton` | `boolean` | `false` | Hide close button |
| `useCloseByBackdrop` | `boolean` | `false` | Close on backdrop click |
| `useCloseByEscapeKey` | `boolean` | `false` | Close on Escape |
| `float` | `boolean` | `false` | Float mode |
| `minHeightPx` | `number` | -- | Minimum height |
| `minWidthPx` | `number` | -- | Minimum width |
| `resizable` | `boolean` | `true` | Enable resize |
| `movable` | `boolean` | `true` | Enable drag-to-move |
| `headerStyle` | `string` | -- | Header CSS style |
| `fill` | `boolean` | `false` | Fill viewport |
| `noFirstControlFocusing` | `boolean` | `false` | Skip auto-focus first control |

---

### SdModalInstance

Class that wraps a programmatically created modal component.

| Property | Type | Description |
|----------|------|-------------|
| `close` | `EventEmitter<any>` | Emitted when the modal closes |

---

### ISdModal

```typescript
interface ISdModal<O> {
  initialized: Signal<boolean>;
  close: OutputEmitterRef<O | undefined>;
  actionTplRef?: TemplateRef<any>;
}
```

Interface that modal content components must implement.

---

### SdActivatedModalProvider

**Type:** `@Injectable()`

Injected into modal content components. Provides access to the modal wrapper and deactivation control.

| Signal | Type | Description |
|--------|------|-------------|
| `modalComponent` | `SdWritableSignal<SdModalControl>` | The modal control reference |
| `contentComponent` | `SdWritableSignal<T>` | The content component reference |

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `canDeactivefn` | `() => boolean` | `() => true` | Deactivation guard |

---

### ISdModalInfo

```typescript
interface ISdModalInfo<T extends ISdModal<any>, X extends keyof any = ""> {
  title: string;
  type: Type<T>;
  inputs: Omit<TDirectiveInputSignals<T>, X>;
}
```

Configuration object for `SdModalProvider.showAsync()`.

---

## Toast

### SdToastContainerControl

**Type:** `@Component` | **Selector:** `sd-toast-container`

Container for toast notifications. Positioned fixed at the top of the viewport.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `overlap` | `boolean \| ""` | No | `false` | Replace existing toasts instead of stacking |

---

### SdToastControl

**Type:** `@Component` | **Selector:** `sd-toast`

Individual toast notification with theme, progress bar, and auto-close.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `open` | `boolean \| ""` | No | `false` | Toast visibility |
| `useProgress` | `boolean \| ""` | No | `false` | Show progress bar |
| `theme` | `"info" \| "success" \| "warning" \| "danger"` | No | -- | Color theme |
| `progress` | `number` | No | `0` | Progress percentage (0-100) |
| `message` | `string` | No | -- | Toast message text |

---

### SdToastProvider

**Type:** `@Injectable({ providedIn: "root" })`

Manages toast notifications programmatically. Provides convenience methods for common themes.

| Signal | Type | Description |
|--------|------|-------------|
| `alertThemes` | `SdWritableSignal<("info" \| "success" \| "warning" \| "danger")[]>` | Themes that show `alert()` instead of toast |
| `overlap` | `SdWritableSignal<boolean>` | Replace mode |

| Field | Type | Description |
|-------|------|-------------|
| `beforeShowFn` | `(theme) => void` | Hook called before showing |

| Method | Signature | Description |
|--------|-----------|-------------|
| `info` | `(message: string, useProgress?: boolean) => bindings` | Show info toast |
| `success` | `(message: string, useProgress?: boolean) => bindings` | Show success toast |
| `warning` | `(message: string, useProgress?: boolean) => bindings` | Show warning toast |
| `danger` | `(message: string, useProgress?: boolean) => bindings` | Show danger toast |
| `notify` | `(toast: ISdToastInput<T>) => bindings` | Show custom toast component |
| `try` | `<R>(fn, messageFn?) => R \| undefined` | Execute with error toast on failure |

**Return bindings:**

| Binding | Type | Description |
|---------|------|-------------|
| `progress` | `WritableSignal<number>` | Progress percentage |
| `message` | `WritableSignal<string>` | Toast message |
| `open` | `WritableSignal<boolean>` | Toast visibility |

---

### ISdToast

```typescript
interface ISdToast<O> {
  close: OutputEmitterRef<O | undefined>;
}
```

### ISdToastInput

```typescript
interface ISdToastInput<T extends ISdToast<any>, X extends keyof any = ""> {
  type: Type<T>;
  inputs: Omit<TDirectiveInputSignals<T>, X>;
}
```
