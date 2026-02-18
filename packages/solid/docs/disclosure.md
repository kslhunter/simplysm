# Disclosure Components

## Tabs

Tab navigation component.

```tsx
import { Tabs } from "@simplysm/solid";

<Tabs value={activeTab()} onValueChange={setActiveTab}>
  <Tabs.Tab value="tab1">Tab 1</Tabs.Tab>
  <Tabs.Tab value="tab2">Tab 2</Tabs.Tab>
  <Tabs.Tab value="tab3" disabled>Tab 3</Tabs.Tab>
</Tabs>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | - | Selected tab value |
| `onValueChange` | `(value: string) => void` | - | Tab change callback |
| `size` | `"sm" \| "lg" \| "xl"` | - | Size |
| `class` | `string` | - | Additional CSS class |
| `style` | `JSX.CSSProperties` | - | Inline style |

**Sub-components:**
- `Tabs.Tab` -- Individual tab (`value: string`, `disabled?: boolean`, `class?: string`)

---

## Collapse

Content collapse/expand animation component. Uses `margin-top`-based transition for smooth open/close effects.

```tsx
import { Collapse, Button } from "@simplysm/solid";
import { createSignal } from "solid-js";

const [open, setOpen] = createSignal(false);

<Button
  aria-expanded={open()}
  aria-controls="content"
  onClick={() => setOpen(!open())}
>
  Toggle
</Button>
<Collapse id="content" open={open()}>
  <p>Collapsible content</p>
</Collapse>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | `false` | Open state |

Animation is automatically disabled when `prefers-reduced-motion` is set.

---

## Dropdown

Positioned dropdown popup. Position is determined relative to trigger element or absolute coordinates.

```tsx
import { Dropdown, Button } from "@simplysm/solid";
import { createSignal } from "solid-js";

const [open, setOpen] = createSignal(false);
let triggerRef!: HTMLButtonElement;

<Button ref={triggerRef} onClick={() => setOpen(!open())}>Open</Button>
<Dropdown triggerRef={() => triggerRef} open={open()} onOpenChange={setOpen}>
  <p class="p-3">Dropdown content</p>
</Dropdown>

// Context menu (absolute position)
<Dropdown position={{ x: 100, y: 200 }} open={menuOpen()} onOpenChange={setMenuOpen}>
  <List inset>
    <List.Item>Menu item 1</List.Item>
    <List.Item>Menu item 2</List.Item>
  </List>
</Dropdown>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `triggerRef` | `() => HTMLElement \| undefined` | - | Trigger element reference (mutually exclusive with position) |
| `position` | `{ x: number; y: number }` | - | Absolute position (mutually exclusive with triggerRef) |
| `open` | `boolean` | - | Open state |
| `onOpenChange` | `(open: boolean) => void` | - | State change callback |
| `maxHeight` | `number` | `300` | Maximum height (px) |
| `keyboardNav` | `boolean` | - | Enable keyboard navigation (used by Select, etc.) |

---

## Dialog

Modal dialog component. Supports drag movement, resize, floating mode, fullscreen mode, and programmatic opening via `useDialog`.

**Declarative usage:**

```tsx
import { Dialog, Button } from "@simplysm/solid";
import { createSignal } from "solid-js";

const [open, setOpen] = createSignal(false);

<Button onClick={() => setOpen(true)}>Open</Button>
<Dialog
  title="Dialog Title"
  open={open()}
  onOpenChange={setOpen}
  closeOnBackdrop
  width={600}
>
  <div class="p-4">
    Dialog content
  </div>
</Dialog>

// Floating mode (no backdrop)
<Dialog
  title="Notification"
  open={open()}
  onOpenChange={setOpen}
  float
  position="bottom-right"
>
  <div class="p-4">Floating dialog</div>
</Dialog>
```

**Programmatic usage with `useDialog`:**

```tsx
import { useDialog, useDialogInstance, Button, TextInput } from "@simplysm/solid";
import { createSignal } from "solid-js";

// Dialog content component
function EditDialog() {
  const dialogInstance = useDialogInstance<string>();
  const [name, setName] = createSignal("");

  return (
    <div class="p-4 space-y-4">
      <TextInput value={name()} onValueChange={setName} placeholder="Enter name" />
      <Button theme="primary" onClick={() => dialogInstance?.close(name())}>
        Save
      </Button>
    </div>
  );
}

// Opening dialog programmatically
function MyPage() {
  const dialog = useDialog();

  const handleOpen = async () => {
    const result = await dialog.show<string>(
      () => <EditDialog />,
      { title: "Edit Name", width: 400, closeOnBackdrop: true },
    );
    if (result != null) {
      // result is the value passed to dialogInstance.close()
      console.log("Saved:", result);
    }
  };

  return <Button onClick={handleOpen}>Open Editor</Button>;
}
```

**Dialog Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | - | Open state |
| `onOpenChange` | `(open: boolean) => void` | - | State change callback |
| `title` | `string` | **(required)** | Modal title |
| `hideHeader` | `boolean` | - | Hide header |
| `closable` | `boolean` | `true` | Show close button |
| `closeOnBackdrop` | `boolean` | - | Close on backdrop click |
| `closeOnEscape` | `boolean` | `true` | Close on Escape key |
| `resizable` | `boolean` | `false` | Resizable |
| `movable` | `boolean` | `true` | Draggable |
| `float` | `boolean` | - | Floating mode (no backdrop) |
| `fill` | `boolean` | - | Fullscreen mode |
| `width` | `number` | - | Width (px) |
| `height` | `number` | - | Height (px) |
| `minWidth` | `number` | - | Minimum width (px) |
| `minHeight` | `number` | - | Minimum height (px) |
| `position` | `"bottom-right" \| "top-right"` | - | Fixed position |
| `headerAction` | `JSX.Element` | - | Header action area |
| `headerStyle` | `JSX.CSSProperties \| string` | - | Header style |
| `canDeactivate` | `() => boolean` | - | Pre-close confirmation function |
| `onCloseComplete` | `() => void` | - | Post-close animation callback |
| `class` | `string` | - | Additional CSS class applied to the dialog element |

**useDialog API:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `show` | `<T>(factory: () => JSX.Element, options: DialogShowOptions) => Promise<T \| undefined>` | Open dialog, returns result on close |

`DialogShowOptions` accepts all Dialog props except `open`, `onOpenChange`, and `children`.

**useDialogInstance API:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `close` | `(result?: T) => void` | Close dialog with optional return value |

**DialogProvider:**

`DialogProvider` is the provider component that enables `useDialog`. It is automatically included by `InitializeProvider`. Use `DialogProvider` directly only when building a custom provider tree.

```tsx
import { DialogProvider } from "@simplysm/solid";

<DialogProvider closeOnEscape closeOnBackdrop>
  <App />
</DialogProvider>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `closeOnEscape` | `boolean` | - | Default `closeOnEscape` for all dialogs opened via `useDialog` |
| `closeOnBackdrop` | `boolean` | - | Default `closeOnBackdrop` for all dialogs opened via `useDialog` |
