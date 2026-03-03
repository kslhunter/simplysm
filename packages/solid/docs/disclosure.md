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
| `closeOnBackdrop` | `boolean` | Close on backdrop click |
| `closeOnEscape` | `boolean` | Close on Escape key |
| `resizable` | `boolean` | Allow resize |
| `movable` | `boolean` | Allow drag to move |
| `float` | `boolean` | Floating (no backdrop) |
| `fill` | `boolean` | Fill viewport |
| `width` | `number` | Dialog width (px) |
| `height` | `number` | Dialog height (px) |
| `minWidth` | `number` | Minimum width (px) |
| `minHeight` | `number` | Minimum height (px) |
| `position` | `"bottom-right" \| "top-right"` | Fixed position |
| `headerStyle` | `JSX.CSSProperties \| string` | Header style |
| `canDeactivate` | `() => boolean` | Guard function before close |
| `onCloseComplete` | `() => void` | Callback after close animation |
| `class` | `string` | Additional CSS class |

Sub-components: `Dialog.Header`, `Dialog.Action`

---

## `DialogContext`

Context and hook for programmatic dialog management.

```tsx
import { useDialog } from "@simplysm/solid";

const dialog = useDialog();
const result = await dialog.show<MyResult>(() => <MyDialog />, { header: "Confirm" });
```

**`DialogDefaults`**

| Property | Type | Description |
|----------|------|-------------|
| `closeOnEscape?` | `boolean` | Allow closing via ESC key |
| `closeOnBackdrop?` | `boolean` | Allow closing via backdrop click |

**`DialogDefaultsContext`** — Context holding `Accessor<DialogDefaults>`, used internally by `DialogProvider`.

```tsx
import { DialogDefaultsContext } from "@simplysm/solid";
```

**`DialogShowOptions`**

| Property | Type | Description |
|----------|------|-------------|
| `header?` | `JSX.Element` | Dialog header |
| `closable?` | `boolean` | Show close button |
| `closeOnBackdrop?` | `boolean` | Close on backdrop click |
| `closeOnEscape?` | `boolean` | Close on ESC key |
| `resizable?` | `boolean` | Resizable |
| `movable?` | `boolean` | Draggable |
| `float?` | `boolean` | Floating mode (no backdrop) |
| `fill?` | `boolean` | Fill full screen |
| `width?` | `number` | Initial width (px) |
| `height?` | `number` | Initial height (px) |
| `minWidth?` | `number` | Minimum width (px) |
| `minHeight?` | `number` | Minimum height (px) |
| `position?` | `"bottom-right" \| "top-right"` | Floating position |
| `headerStyle?` | `JSX.CSSProperties \| string` | Custom header style |
| `canDeactivate?` | `() => boolean` | Guard function before close |

**`DialogContextValue`**

| Member | Type | Description |
|--------|------|-------------|
| `show<TResult>` | `(factory, options) => Promise<TResult \| undefined>` | Opens a dialog and awaits its result |

---

## `DialogProvider`

Provider that enables programmatic dialog creation via `useDialog()`.

```tsx
import { DialogProvider } from "@simplysm/solid";

<DialogProvider closeOnEscape closeOnBackdrop>
  <App />
</DialogProvider>
```

**`DialogProviderProps`** extends `DialogDefaults`

| Prop | Type | Description |
|------|------|-------------|
| `closeOnEscape?` | `boolean` | Default ESC close behavior for all dialogs |
| `closeOnBackdrop?` | `boolean` | Default backdrop close behavior for all dialogs |

---

## `DialogInstanceContext`

Context for dialogs to communicate their result back to the caller.

```tsx
import { DialogInstanceContext, useDialogInstance } from "@simplysm/solid";

// Inside a dialog component:
const instance = useDialogInstance<MyResult>();
instance.close({ success: true });
```

**`DialogInstance<TResult>`**

| Member | Description |
|--------|-------------|
| `close(result?)` | Closes the dialog and resolves the promise with the result |

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
