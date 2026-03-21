# Disclosure Components

Source: `src/components/disclosure/**`

## `Collapse`

Animated collapsible container using CSS margin-top transition.

```typescript
export interface CollapseProps extends JSX.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `open` | `boolean` | Whether content is visible. Default: `false` |

---

## `Dropdown`

Popup dropdown component with trigger/content slot pattern. Supports auto-positioning, keyboard navigation, and context menu mode.

```typescript
export interface DropdownProps {
  position?: { x: number; y: number };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  maxHeight?: number;
  disabled?: boolean;
  keyboardNav?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children: JSX.Element;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `position` | `{ x: number; y: number }` | Absolute position for context menu mode |
| `open` | `boolean` | Popup open state |
| `onOpenChange` | `(open: boolean) => void` | Open state change callback |
| `maxHeight` | `number` | Popup max height in px. Default: `300` |
| `disabled` | `boolean` | Disable trigger click |
| `keyboardNav` | `boolean` | Enable ArrowUp/ArrowDown keyboard navigation |

### Sub-components

- **`Dropdown.Trigger`** -- Trigger element slot (click toggles popup)
- **`Dropdown.Content`** -- Popup content slot

---

## `Dialog`

Modal/float dialog with dragging, 8-directional resizing, automatic z-index management, and slot-based header/action areas.

```typescript
export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  withCloseButton?: boolean;
  closeOnInteractOutside?: boolean;
  closeOnEscape?: boolean;
  resizable?: boolean;
  draggable?: boolean;
  mode?: "float" | "fill";
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  position?: "bottom-right" | "top-right";
  headerStyle?: JSX.CSSProperties | string;
  beforeClose?: () => boolean;
  onCloseComplete?: () => void;
  class?: string;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `open` | `boolean` | Dialog open state |
| `onOpenChange` | `(open: boolean) => void` | Open state change callback |
| `withCloseButton` | `boolean` | Show close button. Default: `true` |
| `closeOnInteractOutside` | `boolean` | Close on backdrop click. Default: `false` |
| `closeOnEscape` | `boolean` | Close on ESC key. Default: `true` |
| `resizable` | `boolean` | Enable 8-directional resizing. Default: `false` |
| `draggable` | `boolean` | Enable header dragging. Default: `true` |
| `mode` | `"float" \| "fill"` | Display mode |
| `width` / `height` | `number` | Initial dimensions in px |
| `minWidth` / `minHeight` | `number` | Minimum dimensions in px |
| `position` | `"bottom-right" \| "top-right"` | Absolute position mode |
| `beforeClose` | `() => boolean` | Close guard (return `false` to cancel) |
| `onCloseComplete` | `() => void` | Callback after close animation completes |

### Sub-components

- **`Dialog.Header`** -- Header slot (enables dragging)
- **`Dialog.Action`** -- Action slot in header area (before close button)

### `DialogProvider`

Provider for programmatic dialog management via `useDialog().show()`.

```typescript
export interface DialogProviderProps extends DialogDefaults {}

export interface DialogDefaults {
  closeOnEscape?: boolean;
  closeOnInteractOutside?: boolean;
}
```

### `useDialog`

```typescript
export function useDialog(): DialogContextValue;

export interface DialogContextValue {
  show<P extends Record<string, any>>(
    component: Component<P>,
    props: Omit<P, "close">,
    options?: DialogShowOptions,
  ): Promise<ExtractCloseResult<P> | undefined>;
}
```

### `DialogShowOptions`

```typescript
export interface DialogShowOptions {
  header?: JSX.Element;
  withCloseButton?: boolean;
  closeOnInteractOutside?: boolean;
  closeOnEscape?: boolean;
  resizable?: boolean;
  draggable?: boolean;
  mode?: "float" | "fill";
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  position?: "bottom-right" | "top-right";
  headerStyle?: JSX.CSSProperties | string;
  beforeClose?: () => boolean;
}
```

### `DialogDefaultsContext`

Context for setting default dialog options across the app.

---

## `Tabs`

Tab bar component with underline indicator and keyboard support.

```typescript
interface TabsProps {
  value?: string;
  onValueChange?: (value: string) => void;
  size?: ComponentSize;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `value` | `string` | Currently selected tab value |
| `onValueChange` | `(value: string) => void` | Tab change callback |
| `size` | `ComponentSize` | Tab size |

### Sub-components

- **`Tabs.Tab`** -- Individual tab button

```typescript
interface TabsTabProps {
  value: string;
  disabled?: boolean;
  class?: string;
  children?: JSX.Element;
}
```
