# Overlay Components

## `SdDropdownControl`

Dropdown trigger container. Opens a popup on click/Enter. Handles positioning and backdrop on mobile.

Selector: `sd-dropdown`

| Input/Model | Type | Description |
|-------------|------|-------------|
| `open` (model) | `boolean` | Dropdown open state (default: `false`) |
| `disabled` | `boolean` (booleanAttribute) | Disabled state (default: `false`) |

## `SdDropdownPopupControl`

Dropdown popup content panel. Positioned fixed relative to the trigger. Handles resize and keyboard navigation.

Selector: `sd-dropdown-popup`

No public inputs. Used as a content child of `SdDropdownControl`.

## `SdModalControl`

Modal dialog component with header, close button, backdrop, resize handles, and drag-to-move support. Created programmatically by `SdModalProvider`.

Selector: `sd-modal`

| Input/Model | Type | Description |
|-------------|------|-------------|
| `open` (model) | `boolean` | Open state (default: `false`) |
| `key` | `string` | Config key for position/size persistence |
| `title` | `string` | Modal title (default: `""`) |
| `hideHeader` | `boolean` | Hide header bar (default: `false`) |
| `hideCloseButton` | `boolean` | Hide close button (default: `false`) |
| `useCloseByBackdrop` | `boolean` | Close on backdrop click (default: `true`) |
| `useCloseByEscapeKey` | `boolean` | Close on Escape key (default: `true`) |
| `float` | `boolean` | Float mode (default: `false`) |
| `fill` | `boolean` | Fill mode (default: `false`) |
| `resizable` | `boolean` | Enable resize handles (default: `false`) |
| `movable` | `boolean` | Enable header drag-to-move (default: `false`) |
| `position` | `"bottom-right" \| "top-right"` | Position preset |
| `minHeightPx` | `number` | Minimum height in pixels |
| `minWidthPx` | `number` | Minimum width in pixels |
| `heightPx` | `number` | Initial height in pixels |
| `widthPx` | `number` | Initial width in pixels |
| `headerStyle` | `string` | Custom header inline style |
| `noFirstControlFocusing` | `boolean` | Skip auto-focusing first control (default: `false`) |
| `actionTplRef` | `TemplateRef<any>` | Optional action template for header |

| Output | Type | Description |
|--------|------|-------------|
| `closeRequest` | `void` | Emitted when backdrop click, Escape, or close button triggers close |

## `SdPromptModalControl`

Built-in prompt modal. Displays a message and text input. Implements `ISdModal<string>`.

Selector: `sd-prompt-modal`

| Input | Type | Description |
|-------|------|-------------|
| `message` | `string` (required) | Prompt message text |

| Output | Type | Description |
|--------|------|-------------|
| `close` | `string \| undefined` | Emits input value on confirm, undefined on cancel |

## `SdConfirmModalControl`

Built-in confirm modal. Displays a message with confirm/cancel buttons. Implements `ISdModal<boolean>`.

Selector: `sd-confirm-modal`

| Input | Type | Description |
|-------|------|-------------|
| `message` | `string` (required) | Confirmation message text |

| Output | Type | Description |
|--------|------|-------------|
| `close` | `boolean \| undefined` | Emits `true` on confirm, `undefined` on cancel |

## `SdToastControl`

Individual toast notification component. Supports themes, progress bar, and ARIA roles.

Selector: `sd-toast`

| Input/Model | Type | Description |
|-------------|------|-------------|
| `open` (model) | `boolean` | Open state with transition (default: `false`) |
| `useProgress` | `boolean` (booleanAttribute) | Show progress bar (default: `false`) |
| `theme` | `TSdToastTheme` | Toast theme (default: `"info"`) |
| `progress` (model) | `number` | Progress percentage 0-100 (default: `0`) |
| `message` (model) | `string \| undefined` | Toast message text |

## `SdToastContainerControl`

Fixed-position container for toast notifications.

Selector: `sd-toast-container`

| Input | Type | Description |
|-------|------|-------------|
| `overlap` | `boolean` (booleanAttribute) | Overlap mode (single toast, bottom-left positioned, default: `false`) |

## `SdBusyContainerControl`

Busy/loading overlay container. Shows a loading indicator over its content.

Selector: `sd-busy-container`

| Input | Type | Description |
|-------|------|-------------|
| `busy` | `boolean` (booleanAttribute) | Whether to show busy overlay (default: `false`) |
| `message` | `string \| undefined` | Loading message text |
| `type` | `TSdBusyType \| undefined` | Indicator type (falls back to `SdBusyProvider.type()`) |
| `progressPercent` | `number \| undefined` | Optional progress percentage |

### `TSdBusyType`

```typescript
type TSdBusyType = "spinner" | "bar" | "cube";
```

## Toast Types

### `TSdToastSeverity`

```typescript
type TSdToastSeverity = "info" | "success" | "warning" | "danger";
```

### `TSdToastTheme`

```typescript
type TSdToastTheme = "primary" | "secondary" | TSdToastSeverity | "gray" | "blue-gray";
```

### `ISdToast`

Interface for custom toast content components.

| Field | Type | Description |
|-------|------|-------------|
| `close` | `OutputEmitterRef<O \| undefined>` | Output to emit close result |

### `ISdToastInput`

| Field | Type | Description |
|-------|------|-------------|
| `type` | `Type<T>` | Component type |
| `inputs` | `Omit<TDirectiveInputSignals<T>, "close">` | Component inputs |

## Modal Types

### `ISdModal`

Interface for modal content components.

| Field | Type | Description |
|-------|------|-------------|
| `initialized` | `Signal<boolean>` | Whether content is initialized |
| `close` | `OutputEmitterRef<O \| undefined>` | Output to emit close result |
| `actionTplRef` | `TemplateRef<any>` | Optional action template for modal header |

### `ISdModalInfo`

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Modal title |
| `type` | `Type<T>` | Component type |
| `inputs` | `Omit<TDirectiveInputSignals<T>, "initialized" \| "close" \| "actionTplRef">` | Component inputs |

### `ISdModalOptions`

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Config persistence key |
| `hideHeader` | `boolean` | Hide header |
| `hideCloseButton` | `boolean` | Hide close button |
| `useCloseByBackdrop` | `boolean` | Close on backdrop click |
| `useCloseByEscapeKey` | `boolean` | Close on Escape |
| `float` | `boolean` | Float mode |
| `fill` | `boolean` | Fill mode |
| `resizable` | `boolean` | Enable resizing |
| `movable` | `boolean` | Enable moving |
| `position` | `"bottom-right" \| "top-right"` | Position preset |
| `minHeightPx` | `number` | Minimum height |
| `minWidthPx` | `number` | Minimum width |
| `heightPx` | `number` | Initial height |
| `widthPx` | `number` | Initial width |
| `headerStyle` | `string` | Header inline style |
| `noFirstControlFocusing` | `boolean` | Skip auto-focus |
