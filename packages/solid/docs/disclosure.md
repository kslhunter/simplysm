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
| `size` | `"xs" \| "sm" \| "lg" \| "xl"` | - | Size |
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

Positioned dropdown popup using compound components. Trigger click auto-toggles open state.

```tsx
import { Dropdown, Button, List } from "@simplysm/solid";

// Trigger/Content compound components
<Dropdown>
  <Dropdown.Trigger>
    <Button>Open</Button>
  </Dropdown.Trigger>
  <Dropdown.Content>
    <p class="p-3">Dropdown content</p>
  </Dropdown.Content>
</Dropdown>

// Controlled open state
<Dropdown open={open()} onOpenChange={setOpen}>
  <Dropdown.Trigger>
    <Button>Open</Button>
  </Dropdown.Trigger>
  <Dropdown.Content>
    <p class="p-3">Dropdown content</p>
  </Dropdown.Content>
</Dropdown>

// Context menu (absolute position, no Trigger)
<Dropdown position={{ x: 100, y: 200 }} open={menuOpen()} onOpenChange={setMenuOpen}>
  <Dropdown.Content>
    <List inset>
      <List.Item>Menu item 1</List.Item>
      <List.Item>Menu item 2</List.Item>
    </List>
  </Dropdown.Content>
</Dropdown>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `position` | `{ x: number; y: number }` | - | Absolute position (context menu mode, no Trigger needed) |
| `open` | `boolean` | - | Open state |
| `onOpenChange` | `(open: boolean) => void` | - | State change callback |
| `maxHeight` | `number` | `300` | Maximum height (px) |
| `disabled` | `boolean` | - | Disabled state (Trigger click ignored) |
| `keyboardNav` | `boolean` | - | Enable keyboard navigation (used by Select, etc.) |
| `class` | `string` | - | Additional CSS class for popup |
| `style` | `JSX.CSSProperties` | - | Inline style for popup |

**Sub-components:**
- `Dropdown.Trigger` -- Trigger element wrapper (click to toggle)
- `Dropdown.Content` -- Dropdown popup content

---

## Dialog

Modal dialog component. Supports drag movement, resize, floating mode, fullscreen mode, and programmatic opening via `useDialog`.

**Declarative usage:**

```tsx
import { Dialog, Button } from "@simplysm/solid";
import { createSignal } from "solid-js";

const [open, setOpen] = createSignal(false);

<Button onClick={() => setOpen(true)}>Open</Button>
<Dialog open={open()} onOpenChange={setOpen} closeOnBackdrop width={600}>
  <Dialog.Header>Dialog Title</Dialog.Header>
  <div class="p-4">
    Dialog content
  </div>
</Dialog>

// With header action buttons
<Dialog open={open()} onOpenChange={setOpen}>
  <Dialog.Header>My Dialog</Dialog.Header>
  <Dialog.Action>
    <Button size="sm" variant="ghost">Help</Button>
  </Dialog.Action>
  <div class="p-4">Dialog content</div>
</Dialog>

// Floating mode (no backdrop)
<Dialog open={open()} onOpenChange={setOpen} float position="bottom-right">
  <Dialog.Header>Notification</Dialog.Header>
  <div class="p-4">Floating dialog</div>
</Dialog>

// No header (content only)
<Dialog open={open()} onOpenChange={setOpen}>
  <div class="p-4">Dialog without header</div>
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
      { header: "Edit Name", width: 400, closeOnBackdrop: true },
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
| `headerStyle` | `JSX.CSSProperties \| string` | - | Header style |
| `canDeactivate` | `() => boolean` | - | Pre-close confirmation function |
| `onCloseComplete` | `() => void` | - | Post-close animation callback |
| `class` | `string` | - | Additional CSS class applied to the dialog element |

**Sub-components:**
- `Dialog.Header` -- Dialog title (renders as `<h5>`, sets `aria-labelledby` on the dialog)
- `Dialog.Action` -- Header action area (rendered between header text and close button)

> The header bar (including close button) is only rendered when `Dialog.Header` is present. If no `Dialog.Header` is provided, the dialog renders content only with no header bar.

**useDialog API:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `show` | `<T>(factory: () => JSX.Element, options: DialogShowOptions) => Promise<T \| undefined>` | Open dialog, returns result on close |

`DialogShowOptions` accepts all Dialog props except `open`, `onOpenChange`, `onCloseComplete`, and `children`, plus:

| Option | Type | Description |
|--------|------|-------------|
| `header` | `JSX.Element` | Dialog header content (renders inside `Dialog.Header`) |

**useDialogInstance API:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `close` | `(result?: T) => void` | Close dialog with optional return value |

**Dialog Defaults:**

`DialogDefaultsContext` and `DialogDefaults` are exported for advanced use cases such as providing default dialog options to a subtree. Add `<DialogProvider>` to your provider tree to enable `useDialog()`. See [Provider Placement Guide](providers.md#provider-placement-guide).

```typescript
import { DialogDefaultsContext, type DialogDefaults } from "@simplysm/solid";
```

| Export | Kind | Description |
|--------|------|-------------|
| `DialogDefaultsContext` | context | Context for providing default dialog options |
| `DialogDefaults` | interface | `{ closeOnEscape?: boolean; closeOnBackdrop?: boolean }` |
