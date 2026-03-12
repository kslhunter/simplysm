# Disclosure

## Collapse

```typescript
interface CollapseProps extends JSX.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
}
```

Collapsible content panel with CSS transition. Content is hidden when `open` is `false`.

---

## Dropdown

```typescript
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

Dropdown popup anchored to a trigger element. When `position` is provided instead of a trigger, the popup appears at the given absolute coordinates (useful for context menus). `keyboardNav` enables ArrowUp/Down navigation. Default `maxHeight` is 300px.

**Sub-components:**
- `Dropdown.Trigger` -- the element that opens the dropdown on click
- `Dropdown.Content` -- the popup content

---

## Dialog

```typescript
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

Modal dialog with overlay. Supports both declarative (template) and programmatic usage.

- `mode="float"` -- centered floating dialog (default)
- `mode="fill"` -- full-screen dialog
- `beforeClose` -- return `false` to prevent closing
- `resizable` / `draggable` -- enable resize handles / drag-to-move (draggable defaults to `true`)
- `withCloseButton` -- show close button (defaults to `true`)
- `closeOnEscape` -- close on Escape key (defaults to `true`)

**Sub-components:**
- `Dialog.Header` -- dialog title bar
- `Dialog.Action` -- dialog action buttons area

### Programmatic API

```typescript
interface DialogContextValue {
  show<P>(
    component: Component<P>,
    props: Omit<P, "close">,
    options?: DialogShowOptions,
  ): Promise<ExtractCloseResult<P> | undefined>;
}

interface DialogProviderProps {
  closeOnEscape?: boolean;
  closeOnInteractOutside?: boolean;
}
```

Use `DialogProvider` and `useDialog()` for programmatic dialog management. The shown component receives a `close(result?)` prop to close the dialog and return a value. `DialogProvider` accepts default options for `closeOnEscape` and `closeOnInteractOutside`.

```typescript
const dialog = useDialog();
const result = await dialog.show(MyDialogContent, { data }, {
  width: 600,
  withCloseButton: true,
});
```

---

## Tabs

```typescript
interface TabsProps {
  value?: string;
  onValueChange?: (value: string) => void;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}
```

Tab navigation. Content rendering is managed externally based on the selected `value`.

**Sub-component:** `Tabs.Tab` -- `{ value: string; disabled?: boolean; class?: string; children?: JSX.Element }`

---

## Usage Examples

```typescript
import { Dialog, Dropdown, Tabs, Collapse } from "@simplysm/solid";

// Declarative dialog
<Dialog open={isOpen()} onOpenChange={setIsOpen} width={500} withCloseButton>
  <Dialog.Header>Edit User</Dialog.Header>
  <form>...</form>
  <Dialog.Action>
    <Button onClick={() => setIsOpen(false)}>Cancel</Button>
    <Button theme="primary" onClick={save}>Save</Button>
  </Dialog.Action>
</Dialog>

// Tabs
<Tabs value={tab()} onValueChange={setTab}>
  <Tabs.Tab value="general">General</Tabs.Tab>
  <Tabs.Tab value="settings">Settings</Tabs.Tab>
</Tabs>
<Show when={tab() === "general"}>General content</Show>
<Show when={tab() === "settings"}>Settings content</Show>
```
