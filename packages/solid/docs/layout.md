# Layout Components

## Sidebar

Sidebar navigation with responsive support (mobile overlay below 520px). Open/closed state is in-memory only (resets on page refresh).

```tsx
import { Sidebar, Topbar } from "@simplysm/solid";
import { useNavigate } from "@solidjs/router";

const navigate = useNavigate();

<Sidebar.Container>
  <Sidebar>
    <Sidebar.User
      name="John Doe"
      description="john@example.com"
      menus={[
        { title: "Profile", onClick: () => navigate("/profile") },
        { title: "Logout", onClick: handleLogout },
      ]}
    />
    <Sidebar.Menu menus={menuItems} />
  </Sidebar>
  <div class="flex flex-1 flex-col">
    <Topbar>
      <h1>App Name</h1>
    </Topbar>
    <main class="flex-1 overflow-auto p-4">
      {/* main content */}
    </main>
  </div>
</Sidebar.Container>
```

**Sub-components:**
- `Sidebar.Container` -- Container wrapping sidebar and main area (required)
- `Sidebar.Menu` -- Menu items list (`menus: SidebarMenuItem[]`)
- `Sidebar.User` -- User info area with avatar and optional dropdown menu

**Sidebar.User Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | **(required)** | User name |
| `description` | `string` | - | Optional additional info (email, role, etc.). If omitted, only name is shown |
| `icon` | `Component<TablerIconProps>` | `IconUser` | Avatar icon (Tabler Icons component). Rendered in a circular badge |
| `menus` | `SidebarUserMenu[]` | - | Dropdown menu items. When present, component becomes clickable |

**SidebarUserMenu type:**

```typescript
interface SidebarUserMenu {
  title: string;
  onClick: () => void;
}
```

**SidebarMenuItem type:**

```typescript
interface SidebarMenuItem {
  title: string;
  href?: string;
  icon?: Component<IconProps>;
  children?: SidebarMenuItem[];
}
```

**useSidebarContext / useSidebarContextOptional hooks:**

```tsx
import { useSidebarContext, useSidebarContextOptional } from "@simplysm/solid";

// Throws if not inside Sidebar.Container
const sidebar = useSidebarContext();
sidebar.toggle();          // current open/closed state
sidebar.setToggle(false);  // programmatically close

// Returns undefined if not inside Sidebar.Container (no error)
const sidebarOpt = useSidebarContextOptional();
```

**SM_MEDIA_QUERY constant:**

Exported media query string matching the Tailwind `sm:` breakpoint (640px). Use this to align custom responsive logic with sidebar behavior.

```typescript
import { SM_MEDIA_QUERY } from "@simplysm/solid";

const mql = window.matchMedia(SM_MEDIA_QUERY); // "(min-width: 640px)"
```

---

## Topbar

Top navigation bar. When used inside `Sidebar.Container`, a sidebar toggle button appears automatically.

```tsx
import { Topbar } from "@simplysm/solid";
import { IconSettings, IconUser } from "@tabler/icons-solidjs";

const menuItems: TopbarMenuItem[] = [
  { title: "Settings", icon: IconSettings, href: "/settings" },
  {
    title: "Admin",
    icon: IconUser,
    children: [
      { title: "Users", href: "/admin/users" },
      { title: "Roles", href: "/admin/roles" },
    ],
  },
];

const userMenus: TopbarUserMenu[] = [
  { title: "Profile", onClick: () => navigate("/profile") },
  { title: "Logout", onClick: handleLogout },
];

<Topbar>
  <h1 class="text-lg font-bold">App Name</h1>
  <Topbar.Menu menus={menuItems} />
  <div class="flex-1" />
  <Topbar.User menus={userMenus}>User</Topbar.User>
</Topbar>
```

**Sub-components:**
- `Topbar.Container` -- Container wrapping topbar and main content, provides `TopbarContext`
- `Topbar.Actions` -- Slot outlet that renders actions registered via `createTopbarActions`
- `Topbar.Menu` -- Menu items list
- `Topbar.User` -- User menu (dropdown)

### Topbar Actions Slot

A slot pattern that lets child pages inject action buttons (save, delete, etc.) into the topbar. The parent layout defines **where** actions appear, child pages define **what** to show.

**Layout (define the slot):**

```tsx
import { Topbar } from "@simplysm/solid";

<Topbar.Container>
  <Topbar>
    <span>Title</span>
    <Topbar.Actions />
    <div class="flex-1" />
  </Topbar>
  <main class="flex-1 overflow-auto p-4">
    {props.children}
  </main>
</Topbar.Container>
```

**Child page (fill the slot):**

```tsx
import { createTopbarActions, Button } from "@simplysm/solid";

function UserPage() {
  createTopbarActions(() => (
    <>
      <Button theme="primary">Save</Button>
      <Button>Cancel</Button>
    </>
  ));

  return <div>...</div>;
}
```

When `UserPage` mounts, the buttons appear in the topbar. When it unmounts, the actions are automatically cleaned up via `onCleanup`.

**createTopbarActions(accessor: () => JSX.Element): void**

Registers actions in the nearest `Topbar.Container` scope. Automatically removes actions on component unmount. Must be called inside `Topbar.Container`.

**useTopbarActionsAccessor(): Accessor&lt;JSX.Element | undefined&gt;**

Returns the actions accessor directly. For advanced use cases such as building custom topbar components. Must be called inside `Topbar.Container`.

```tsx
import { useTopbarActionsAccessor } from "@simplysm/solid";

const actions = useTopbarActionsAccessor();
// actions() returns the currently registered JSX.Element or undefined
```

**TopbarContext:**

`TopbarContext` is exported for building custom topbar layouts. `Topbar.Container` wraps children with `TopbarContext.Provider`, sharing `actions` accessor and `setActions` setter.

```typescript
import { TopbarContext } from "@simplysm/solid";

interface TopbarContextValue {
  actions: Accessor<JSX.Element | undefined>;
  setActions: Setter<JSX.Element | undefined>;
}
```

**TopbarMenuItem type:**

```typescript
interface TopbarMenuItem {
  title: string;
  href?: string;
  icon?: Component<IconProps>;
  children?: TopbarMenuItem[];  // supports unlimited nesting
}
```

**TopbarUserMenu type:**

```typescript
interface TopbarUserMenu {
  title: string;
  onClick: () => void;
}
```

---

## FormGroup

Layout component for arranging form fields with labels vertically or inline.

```tsx
import { FormGroup, TextInput } from "@simplysm/solid";

// Vertical layout (default)
<FormGroup>
  <FormGroup.Item label="Name">
    <TextInput value={name()} onValueChange={setName} />
  </FormGroup.Item>
  <FormGroup.Item label="Email">
    <TextInput type="email" value={email()} onValueChange={setEmail} />
  </FormGroup.Item>
</FormGroup>

// Inline layout
<FormGroup inline>
  <FormGroup.Item label="Search">
    <TextInput value={query()} onValueChange={setQuery} />
  </FormGroup.Item>
  <FormGroup.Item>
    <Button theme="primary">Search</Button>
  </FormGroup.Item>
</FormGroup>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `inline` | `boolean` | `false` | Inline layout mode |

**Sub-components:**
- `FormGroup.Item` -- Form item (`label?: JSX.Element`)

---

## FormTable

`<table>`-based form layout. Labels go in `<th>`, input fields in `<td>`.

```tsx
import { FormTable, TextInput, NumberInput } from "@simplysm/solid";

<FormTable>
  <tbody>
    <tr>
      <th>Name</th>
      <td><TextInput value={name()} onValueChange={setName} /></td>
      <th>Age</th>
      <td><NumberInput value={age()} onValueChange={setAge} /></td>
    </tr>
    <tr>
      <th>Email</th>
      <td colSpan={3}><TextInput type="email" value={email()} onValueChange={setEmail} /></td>
    </tr>
  </tbody>
</FormTable>
```

---

## Kanban

Kanban board layout component with drag-and-drop cards, lane collapse, multi-select, and busy states.

```tsx
import { createSignal, For } from "solid-js";
import { Button, Icon, Kanban, type KanbanDropInfo } from "@simplysm/solid";
import { IconPlus } from "@tabler/icons-solidjs";

const [selected, setSelected] = createSignal<unknown[]>([]);

const handleDrop = (info: KanbanDropInfo) => {
  // info.sourceValue: dragged card value
  // info.targetLaneValue: target lane value
  // info.targetCardValue: target card value (undefined if dropped on empty area)
  // info.position: "before" | "after" | undefined
  moveCard(info);
};

<div class="h-[500px]">
  <Kanban
    selectedValues={selected()}
    onSelectedValuesChange={setSelected}
    onDrop={handleDrop}
  >
    <For each={lanes()}>
      {(lane) => (
        <Kanban.Lane value={lane.id} collapsible busy={lane.busy}>
          <Kanban.LaneTitle>
            {lane.title} ({lane.cards.length})
          </Kanban.LaneTitle>
          <Kanban.LaneTools>
            <Button size="sm" variant="ghost">
              <Icon icon={IconPlus} />
            </Button>
          </Kanban.LaneTools>
          <For each={lane.cards}>
            {(card) => (
              <Kanban.Card value={card.id} selectable draggable contentClass="p-2">
                {card.title}
              </Kanban.Card>
            )}
          </For>
        </Kanban.Lane>
      )}
    </For>
  </Kanban>
</div>
```

**Kanban Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onDrop` | `(info: KanbanDropInfo) => void` | - | Drop event handler |
| `selectedValues` | `unknown[]` | - | Selected card values |
| `onSelectedValuesChange` | `(values: unknown[]) => void` | - | Selection change callback |

`KanbanDropInfo`: `{ sourceValue?: unknown; targetLaneValue?: unknown; targetCardValue?: unknown; position?: "before" | "after" }`

**Kanban.Lane Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `unknown` | - | Lane identifier |
| `busy` | `boolean` | - | Show busy bar |
| `collapsible` | `boolean` | - | Allow collapse/expand |
| `collapsed` | `boolean` | - | Collapsed state (controlled) |
| `onCollapsedChange` | `(collapsed: boolean) => void` | - | Collapse state callback |

**Kanban.Card Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `unknown` | - | Card identifier |
| `draggable` | `boolean` | `true` | Enable drag |
| `selectable` | `boolean` | `false` | Enable selection |
| `contentClass` | `string` | - | Card content class |

**Sub-components:**
- `Kanban.Lane` -- Board lane/column
- `Kanban.LaneTitle` -- Lane header title area
- `Kanban.LaneTools` -- Lane header action buttons
- `Kanban.Card` -- Draggable card

**Selection:** Shift+Click for multi-select, long press for single select. Lane header checkbox toggles all cards in the lane.

**KanbanContext:**

`KanbanContext` and `useKanbanContext` are exported for building custom Kanban card/lane sub-components. `useKanbanLaneContext` provides lane-scoped context. These are low-level APIs for advanced customization.

```typescript
import { useKanbanContext, useKanbanLaneContext } from "@simplysm/solid";

// inside a custom card component
const kanban = useKanbanContext();
const lane = useKanbanLaneContext();
```
