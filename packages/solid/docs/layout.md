# Layout Components

Source: `src/components/layout/**`

## `FormGroup`

Vertical or horizontal form field group. Compound with Item sub-component.

```ts
interface FormGroupProps extends JSX.HTMLAttributes<HTMLDivElement> {
  inline?: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `inline` | `boolean` | Horizontal layout instead of vertical |

### Sub-components

- **`FormGroup.Item`** -- Labeled form group entry.

```ts
interface FormGroupItemProps {
  label?: JSX.Element;
}
```

## `FormTable`

Table-based form layout. Compound with Row and Item sub-components.

```ts
interface FormTableProps extends JSX.HTMLAttributes<HTMLTableElement> {}
```

### Sub-components

- **`FormTable.Row`** -- Table row.
- **`FormTable.Item`** -- Labeled table cell.

```ts
interface FormTableItemProps extends JSX.TdHTMLAttributes<HTMLTableCellElement> {
  label?: JSX.Element;
}
```

## `Sidebar`

Collapsible sidebar navigation panel. Compound with Container, Menu, User sub-components.

```ts
interface SidebarProps extends JSX.HTMLAttributes<HTMLElement> {
  children: JSX.Element;
}
```

### `Sidebar.Container`

Layout container wrapping Sidebar and content area with position: relative.

```ts
interface SidebarContainerProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
}
```

### `Sidebar.Menu`

Recursive menu rendering with List/ListItem components. Supports route matching for active state.

```ts
interface SidebarMenuProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  menus: AppMenu[];
  defaultOpen?: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `menus` | `AppMenu[]` | Menu tree structure |
| `defaultOpen` | `boolean` | Expand all menus by default |

### `Sidebar.User`

User information component with avatar and dropdown menu.

```ts
interface SidebarUserProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onClick"> {
  name: string;
  icon?: Component<TablerIconProps>;
  description?: string;
  menus?: SidebarUserMenu[];
}

interface SidebarUserMenu {
  title: string;
  onClick: () => void;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | User display name |
| `icon` | `Component<TablerIconProps>` | User avatar icon |
| `description` | `string` | User description text |
| `menus` | `SidebarUserMenu[]` | Dropdown menu items |

### `useSidebar()`

```ts
interface SidebarContextValue {
  toggle: Accessor<boolean>;
  setToggle: Setter<boolean>;
}

function useSidebar(): SidebarContextValue;
function useSidebar.optional(): SidebarContextValue | undefined;
```

Access sidebar toggle state. The `.optional()` variant returns undefined when not inside a Sidebar.

### `SM_MEDIA_QUERY`

```ts
const SM_MEDIA_QUERY: string;  // "(min-width: 640px)"
```

Media query corresponding to Tailwind `sm:` breakpoint (640px).

## `Topbar`

Top navigation bar. Automatically shows sidebar toggle button if SidebarContext exists. Compound with Container, Menu, User, Actions sub-components.

```ts
interface TopbarProps extends JSX.HTMLAttributes<HTMLElement> {
  children: JSX.Element;
}
```

### `Topbar.Container`

Layout container wrapping Topbar and content area.

```ts
interface TopbarContainerProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
}
```

### `Topbar.Menu`

Dropdown navigation menu. Items with children show dropdown on click.

```ts
interface TopbarMenuProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children"> {
  menus: TopbarMenuItem[];
}

interface TopbarMenuItem {
  title: string;
  href?: string;
  icon?: Component<IconProps>;
  children?: TopbarMenuItem[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Menu item text |
| `href` | `string` | Navigation URL |
| `icon` | `Component<IconProps>` | Menu item icon |
| `children` | `TopbarMenuItem[]` | Submenu items (renders dropdown) |

### `Topbar.User`

User information with dropdown menu.

```ts
interface TopbarUserProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onClick"> {
  menus?: TopbarUserMenu[];
  children: JSX.Element;
}

interface TopbarUserMenu {
  title: string;
  onClick: () => void;
}
```

### `Topbar.Actions`

Displays action elements registered via `useTopbarActions()`.

### `useTopbarActions()`

```ts
function useTopbarActions(accessor: () => JSX.Element): void;
```

Register topbar action elements. Must be used inside `Topbar.Container`.

### `useTopbarActionsAccessor()`

```ts
function useTopbarActionsAccessor(): Accessor<JSX.Element | undefined>;
```

Read the current topbar actions signal.

### `TopbarContext`

```ts
interface TopbarContextValue {
  actions: Accessor<JSX.Element | undefined>;
  setActions: Setter<JSX.Element | undefined>;
}

const TopbarContext: Context<TopbarContextValue>;
```
