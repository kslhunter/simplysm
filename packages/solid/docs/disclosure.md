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
| `width` | `string` | Dialog width |
| `height` | `string` | Dialog height |
| `minWidth` | `string` | Minimum width |
| `minHeight` | `string` | Minimum height |
| `position` | `{ top?: string; left?: string; ... }` | Initial position |
| `headerStyle` | `JSX.CSSProperties` | Header style |
| `canDeactivate` | `() => boolean \| Promise<boolean>` | Guard function before close |
| `onCloseComplete` | `() => void` | Callback after close animation |

Sub-components: `Dialog.Header`, `Dialog.Action`

---

## `DialogContext`

Context and hook for programmatic dialog management.

```tsx
import { DialogContext, useDialog } from "@simplysm/solid";

const dialog = useDialog();
const result = await dialog.show(() => <MyDialog />, { title: "Confirm" });
```

**`DialogContextValue`**

| Member | Type | Description |
|--------|------|-------------|
| `show<TResult>` | `(factory, options?) => Promise<TResult \| undefined>` | Opens a dialog and awaits its result |

---

## `DialogProvider`

Provider that enables programmatic dialog creation via `useDialog()`.

```tsx
import { DialogProvider } from "@simplysm/solid";

<DialogProvider>
  <App />
</DialogProvider>
```

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
