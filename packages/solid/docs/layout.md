# Layout Components

Source: `src/components/layout/**`

## `FormGroup`

Vertical or inline form field grouping component.

```typescript
export interface FormGroupProps extends JSX.HTMLAttributes<HTMLDivElement> {
  inline?: boolean;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `inline` | `boolean` | Display items horizontally in a row |

### Sub-components

- **`FormGroup.Item`** -- Individual form field with optional label

```typescript
export interface FormGroupItemProps extends JSX.HTMLAttributes<HTMLDivElement> {
  label?: JSX.Element;
}
```

---

## `FormTable`

Table-based form layout with label-value pairs.

```typescript
export interface FormTableProps extends JSX.HTMLAttributes<HTMLTableElement> {}
```

### Sub-components

- **`FormTable.Row`** -- Table row wrapper
- **`FormTable.Item`** -- Table cell with optional label (`th` + `td`)

```typescript
export interface FormTableItemProps extends JSX.TdHTMLAttributes<HTMLTableCellElement> {
  label?: JSX.Element;
}
```

---

## `Sidebar`

Responsive sidebar navigation with user info and menu sections. Collapses on mobile with overlay backdrop.

```typescript
export interface SidebarProps extends JSX.HTMLAttributes<HTMLElement> {
  children: JSX.Element;
}
```

### Sub-components

- **`Sidebar.Container`** -- Root container providing sidebar context and responsive padding
- **`Sidebar.Menu`** -- Recursive menu list with pathname-based selection
- **`Sidebar.User`** -- User info section with optional dropdown menus

### `Sidebar.Container`

```typescript
export interface SidebarContainerProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
}
```

### `Sidebar.Menu`

```typescript
export interface SidebarMenuProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  menus: AppMenu[];
  defaultOpen?: boolean;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `menus` | `AppMenu[]` | Menu items array |
| `defaultOpen` | `boolean` | Expand all nested menus initially. Default: `false` |

### `Sidebar.User`

```typescript
export interface SidebarUserProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onClick"> {
  name: string;
  icon?: Component<TablerIconProps>;
  description?: string;
  menus?: SidebarUserMenu[];
}
```

| Prop | Type | Description |
|------|------|-------------|
| `name` | `string` | User name (required) |
| `icon` | `Component<TablerIconProps>` | Avatar icon. Default: user icon |
| `description` | `string` | Additional info (email, etc.) |
| `menus` | `SidebarUserMenu[]` | Dropdown menu items |

### `SidebarUserMenu`

```typescript
export interface SidebarUserMenu {
  title: string;
  onClick: () => void;
}
```

### `SidebarContextValue`

```typescript
export interface SidebarContextValue {
  toggle: Accessor<boolean>;
  setToggle: Setter<boolean>;
}
```

### `useSidebar`

Hook to access sidebar toggle state. Also has `useSidebar.optional()` variant.

### `SM_MEDIA_QUERY`

```typescript
export const SM_MEDIA_QUERY = "(min-width: 640px)";
```

---

## `Topbar`

Top navigation bar with sidebar toggle integration, dropdown menus, user section, and dynamic actions.

```typescript
export interface TopbarProps extends JSX.HTMLAttributes<HTMLElement> {
  children: JSX.Element;
}
```

### Sub-components

- **`Topbar.Container`** -- Layout container wrapping Topbar and content, provides actions context
- **`Topbar.Menu`** -- Dropdown navigation menu (responsive: desktop buttons / mobile hamburger)
- **`Topbar.User`** -- User information section with optional dropdown
- **`Topbar.Actions`** -- Renders actions set via `useTopbarActions()`

### `Topbar.Container`

```typescript
export interface TopbarContainerProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
}
```

### `Topbar.Menu`

```typescript
export interface TopbarMenuProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children"> {
  menus: TopbarMenuItem[];
}
```

### `TopbarMenuItem`

```typescript
export interface TopbarMenuItem {
  title: string;
  href?: string;
  icon?: Component<IconProps>;
  children?: TopbarMenuItem[];
}
```

### `Topbar.User`

```typescript
export interface TopbarUserProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onClick"> {
  menus?: TopbarUserMenu[];
  children: JSX.Element;
}
```

### `TopbarUserMenu`

```typescript
export interface TopbarUserMenu {
  title: string;
  onClick: () => void;
}
```

### `TopbarContextValue`

```typescript
export interface TopbarContextValue {
  actions: Accessor<JSX.Element | undefined>;
  setActions: Setter<JSX.Element | undefined>;
}
```

### Hooks

- **`useTopbarActions(accessor: () => JSX.Element)`** -- Register dynamic actions for display in Topbar
- **`useTopbarActionsAccessor()`** -- Read registered actions
