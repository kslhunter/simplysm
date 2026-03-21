# Disclosure Components

Source: `src/components/disclosure/**/*.tsx`

## Collapse

Animated expand/collapse container using margin-top transition.

```ts
interface CollapseProps extends JSX.HTMLAttributes<HTMLDivElement> {
  open?: boolean;  // default: false
}
```

- Uses `ResizeObserver` to track content height.
- Disables transition on initial render to prevent flicker.
- Sets `visibility: hidden` when closed to prevent focusable element access.

## Dropdown

Positioned popup with trigger element. Uses Portal for rendering.

```ts
interface DropdownProps {
  position?: { x: number; y: number };  // absolute position (for context menus)
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  maxHeight?: number;            // default: 300
  disabled?: boolean;
  keyboardNav?: boolean;         // arrow key navigation
  class?: string;
  style?: JSX.CSSProperties;
  children: JSX.Element;
}
```

- Auto-positions above or below trigger based on available viewport space.
- Closes on outside click, Escape key, scroll, and resize.
- `keyboardNav`: ArrowDown/Up navigates between tabbable items in popup.

### Sub-components

- **`Dropdown.Trigger`** -- Click target that toggles the dropdown. Slot component.
- **`Dropdown.Content`** -- Popup content. Slot component.

## Dialog

Modal or floating dialog with drag, resize, z-index management, and animation.

```ts
interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  withCloseButton?: boolean;           // default: true
  closeOnInteractOutside?: boolean;    // default: false (uses DialogDefaults)
  closeOnEscape?: boolean;             // default: true (uses DialogDefaults)
  resizable?: boolean;                 // default: false
  draggable?: boolean;                 // default: true
  mode?: "float" | "fill";
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  position?: "bottom-right" | "top-right";
  headerStyle?: JSX.CSSProperties | string;
  beforeClose?: () => boolean;         // return false to prevent close
  onCloseComplete?: () => void;
  class?: string;
}
```

- `mode="float"`: no backdrop, pointer-events pass through.
- `mode="fill"`: full-screen dialog.
- 8-direction resize handles when `resizable=true`.
- Automatic z-index stacking across multiple open dialogs.

### Sub-components

- **`Dialog.Header`** -- Dialog title bar. Enables drag when `draggable=true`.
- **`Dialog.Action`** -- Action buttons rendered in the header next to the close button.

## DialogProvider

Programmatic dialog provider. Enables `useDialog().show()` to open dialogs as Promises.

```ts
interface DialogProviderProps extends DialogDefaults {}

interface DialogDefaults {
  closeOnEscape?: boolean;
  closeOnInteractOutside?: boolean;
}
```

### useDialog()

Hook to open dialogs programmatically.

```ts
function useDialog(): DialogContextValue;

interface DialogContextValue {
  show<P extends Record<string, any>>(
    component: Component<P>,
    props: Omit<P, "close">,
    options?: DialogShowOptions,
  ): Promise<ExtractCloseResult<P> | undefined>;
}

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

The dialog component receives a `close` prop. Call `close(result)` to resolve the Promise.

### DialogDefaultsContext

Context providing default dialog configuration. Used by `Dialog` when per-instance props are not set.

```ts
const DialogDefaultsContext: Context<Accessor<DialogDefaults>>;
```

## Tabs

Tab bar with value-based selection.

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

### Sub-components

- **`Tabs.Tab`** -- Individual tab button.

```ts
interface TabsTabProps {
  value: string;
  disabled?: boolean;
  class?: string;
  children?: JSX.Element;
}
```
