# Disclosure

Components for showing and hiding content, including collapsible panels, dropdowns, dialogs, and tabs.

---

## `Collapse`

Animated height-collapse panel.

```tsx
import { Collapse } from "@simplysm/solid";

<Collapse open={isOpen}>
  <div>Collapsible content</div>
</Collapse>
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `open` | `boolean` | Expanded state |

---

## `Dropdown`

Popup dropdown with trigger/content slot pattern. Auto-positions relative to trigger and closes on outside click, scroll, or resize.

```tsx
import { Dropdown } from "@simplysm/solid";

<Dropdown>
  <Dropdown.Trigger>
    <Button>Open</Button>
  </Dropdown.Trigger>
  <Dropdown.Content>
    <div>Dropdown content</div>
  </Dropdown.Content>
</Dropdown>
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `position` | `{ x: number; y: number }` | Absolute position (context menu mode) |
| `open` | `boolean` | Controlled open state |
| `onOpenChange` | `(open: boolean) => void` | Open state change callback |
| `maxHeight` | `number` | Maximum popup height in px (default: 300) |
| `disabled` | `boolean` | Disable trigger click |
| `keyboardNav` | `boolean` | Enable arrow key navigation |
| `class` | `string` | Custom class for popup |
| `style` | `JSX.CSSProperties` | Custom style for popup |

Sub-components: `Dropdown.Trigger`, `Dropdown.Content`

---

## `Dialog`

Dialog with header, actions slot, resize/move support, and animation.

```tsx
import { Dialog } from "@simplysm/solid";

<Dialog open={open} onOpenChange={setOpen} closable>
  <Dialog.Header>Title</Dialog.Header>
  <div>Dialog body</div>
  <Dialog.Action>
    <Button onClick={() => setOpen(false)}>Close</Button>
  </Dialog.Action>
</Dialog>
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `open` | `boolean` | Controlled open state |
| `onOpenChange` | `(open: boolean) => void` | Open state change callback |
| `closable` | `boolean` | Show close button |
| `closeOnInteractOutside` | `boolean` | Close on backdrop click |
| `closeOnEscape` | `boolean` | Close on Escape key |
| `resizable` | `boolean` | Allow resize |
| `draggable` | `boolean` | Allow drag to move |
| `mode` | `"float" \| "fill"` | Dialog display mode (default: modal) |
| `width` | `number` | Dialog width (px) |
| `height` | `number` | Dialog height (px) |
| `minWidth` | `number` | Minimum width (px) |
| `minHeight` | `number` | Minimum height (px) |
| `position` | `"bottom-right" \| "top-right"` | Fixed position |
| `headerStyle` | `JSX.CSSProperties \| string` | Header style |
| `beforeClose` | `() => boolean` | Guard function before close |
| `onCloseComplete` | `() => void` | Callback after close animation |
| `class` | `string` | Additional CSS class |

Sub-components: `Dialog.Header`, `Dialog.Action`

---

## `DialogContext`

Context and hook for programmatic dialog management.

```tsx
import { useDialog } from "@simplysm/solid";

const dialog = useDialog();
const result = await dialog.show(MyDialog, props, { header: "Confirm" });
```

**`DialogDefaults`**

| Property | Type | Description |
|----------|------|-------------|
| `closeOnEscape?` | `boolean` | Allow closing via ESC key |
| `closeOnInteractOutside?` | `boolean` | Allow closing via backdrop click |

**`DialogDefaultsContext`** — Context holding `Accessor<DialogDefaults>`, used internally by `DialogProvider`.

```tsx
import { DialogDefaultsContext } from "@simplysm/solid";
```

**`DialogShowOptions`**

| Property | Type | Description |
|----------|------|-------------|
| `header?` | `JSX.Element` | Dialog header |
| `closable?` | `boolean` | Show close button |
| `closeOnInteractOutside?` | `boolean` | Close on backdrop click |
| `closeOnEscape?` | `boolean` | Close on ESC key |
| `resizable?` | `boolean` | Resizable |
| `draggable?` | `boolean` | Draggable |
| `mode?` | `"float" \| "fill"` | Dialog display mode (default: modal) |
| `width?` | `number` | Initial width (px) |
| `height?` | `number` | Initial height (px) |
| `minWidth?` | `number` | Minimum width (px) |
| `minHeight?` | `number` | Minimum height (px) |
| `position?` | `"bottom-right" \| "top-right"` | Floating position |
| `headerStyle?` | `JSX.CSSProperties \| string` | Custom header style |
| `beforeClose?` | `() => boolean` | Guard function before close |

**`DialogContextValue`**

| Member | Type | Description |
|--------|------|-------------|
| `show<TResult>` | `(component, props, options?) => Promise<TResult \| undefined>` | Opens a dialog component and awaits its result |

---

## `DialogProvider`

Provider that enables programmatic dialog creation via `useDialog()`.

```tsx
import { DialogProvider } from "@simplysm/solid";

<DialogProvider closeOnEscape closeOnInteractOutside>
  <App />
</DialogProvider>
```

**`DialogProviderProps`** extends `DialogDefaults`

| Prop | Type | Description |
|------|------|-------------|
| `closeOnEscape?` | `boolean` | Default ESC close behavior for all dialogs |
| `closeOnInteractOutside?` | `boolean` | Default backdrop close behavior for all dialogs |

---

## `Tabs`

Tab navigation component.

```tsx
import { Tabs } from "@simplysm/solid";

<Tabs value={tab} onValueChange={setTab}>
  <Tabs.Tab value="a">Tab A</Tabs.Tab>
  <Tabs.Tab value="b">Tab B</Tabs.Tab>
</Tabs>
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `value` | `string \| undefined` | Active tab value |
| `onValueChange` | `(value: string) => void` | Tab change callback |
| `size` | `ComponentSize` | Tab size |

Sub-components: `Tabs.Tab` (props: `value: string`, `disabled?: boolean`)
