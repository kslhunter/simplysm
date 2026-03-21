# Disclosure Components

Source: `src/components/disclosure/**`

## `Collapse`

Animated collapse component with smooth height transitions. Prevents FOUC.

```ts
interface CollapseProps extends JSX.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `open` | `boolean` | Whether content is visible (default: false) |

Use with `aria-expanded` and `aria-controls` for accessibility.

## `Dropdown`

Auto-toggling popup with keyboard navigation and outside-click handling. Uses slot pattern with Trigger and Content.

```ts
interface DropdownProps {
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

| Field | Type | Description |
|-------|------|-------------|
| `position` | `{ x: number; y: number }` | Absolute positioning for context menus |
| `open` | `boolean` | Popup open state |
| `onOpenChange` | `(open: boolean) => void` | State change callback |
| `maxHeight` | `number` | Max popup height in px (default: 300) |
| `disabled` | `boolean` | Disable trigger click |
| `keyboardNav` | `boolean` | Enable ArrowUp/ArrowDown navigation |

### Sub-components

- **`Dropdown.Trigger`** -- Click target that toggles the popup.
- **`Dropdown.Content`** -- Popup content rendered in a portal.

## `Dialog`

Draggable, resizable dialog with float/fill modes and auto-stacking. Compound with Header and Action sub-components.

```ts
interface DialogProps {
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

| Field | Type | Description |
|-------|------|-------------|
| `open` | `boolean` | Dialog visibility |
| `onOpenChange` | `(open: boolean) => void` | Visibility change callback |
| `withCloseButton` | `boolean` | Show close button in header |
| `closeOnInteractOutside` | `boolean` | Close on backdrop click |
| `closeOnEscape` | `boolean` | Close on Escape key |
| `resizable` | `boolean` | Enable resize handles |
| `draggable` | `boolean` | Enable title bar drag |
| `mode` | `"float" \| "fill"` | Float (centered) or fill (full-size) mode |
| `width` | `number` | Initial width in px |
| `height` | `number` | Initial height in px |
| `minWidth` | `number` | Minimum width |
| `minHeight` | `number` | Minimum height |
| `position` | `"bottom-right" \| "top-right"` | Anchored position |
| `headerStyle` | `JSX.CSSProperties \| string` | Header custom style |
| `beforeClose` | `() => boolean` | Guard function; return false to prevent close |
| `onCloseComplete` | `() => void` | Called after close animation completes |

### Sub-components

- **`Dialog.Header`** -- Dialog title bar content.
- **`Dialog.Action`** -- Header action buttons (right side of title bar).

### `DialogShowOptions`

Options for programmatic dialog invocation via `useDialog().show()`.

```ts
interface DialogShowOptions {
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

## `DialogProvider`

Programmatic dialog manager with Promise-based API.

```ts
interface DialogProviderProps extends DialogDefaults {}

interface DialogDefaults {
  closeOnEscape?: boolean;
  closeOnInteractOutside?: boolean;
}
```

### `DialogDefaultsContext`

```ts
const DialogDefaultsContext: Context<Accessor<DialogDefaults>>;
```

### `useDialog()`

```ts
interface DialogContextValue {
  show<P>(
    component: Component<P>,
    props: Omit<P, "close">,
    options?: DialogShowOptions,
  ): Promise<ExtractCloseResult<P> | undefined>;
}

type ExtractCloseResult<P> = /* extracts result type from component's close prop */;

const DialogContext: Context<DialogContextValue>;
function useDialog(): DialogContextValue;
```

The `show()` method renders the component in a dialog and returns a Promise that resolves when the dialog closes. The component receives a `close` prop to close the dialog with an optional result value.

## `Tabs`

Tabbed navigation with keyboard support.

```ts
interface TabsProps {
  value?: string;
  onValueChange?: (value: string) => void;
  size?: ComponentSize;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `value` | `string` | Currently active tab value |
| `onValueChange` | `(value: string) => void` | Tab change callback |
| `size` | `ComponentSize` | Size scale |

### `Tabs.Tab`

```ts
interface TabsTabProps {
  value: string;
  disabled?: boolean;
  class?: string;
  children?: JSX.Element;
}
```
