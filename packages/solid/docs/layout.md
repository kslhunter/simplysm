# Layout

Source: `src/components/layout/**/*.tsx`

## FormGroup

Vertical or inline form field group.

```ts
interface FormGroupProps extends JSX.HTMLAttributes<HTMLDivElement> {
  inline?: boolean;  // horizontal layout with wrapping
}
```

### Sub-components

- **`FormGroup.Item`** -- Labeled form item.

```ts
interface FormGroupItemProps extends JSX.HTMLAttributes<HTMLDivElement> {
  label?: JSX.Element;
}
```

## FormTable

Table-based form layout using `<table>` elements.

```ts
interface FormTableProps extends JSX.HTMLAttributes<HTMLTableElement> {}
```

### Sub-components

- **`FormTable.Row`** -- Table row. Extends `JSX.HTMLAttributes<HTMLTableRowElement>`.
- **`FormTable.Item`** -- Labeled table cell. When `label` is omitted, the cell spans the label column.

```ts
interface FormTableItemProps extends JSX.TdHTMLAttributes<HTMLTableCellElement> {
  label?: JSX.Element;
}
```

## Sidebar

Collapsible sidebar panel. Must be used inside `Sidebar.Container`.

```ts
interface SidebarProps extends JSX.HTMLAttributes<HTMLElement> {
  children: JSX.Element;
}
```

### Sidebar.Container

Layout container that holds the Sidebar and content area. Provides `SidebarContext` for toggle state. Parent element must have height specified (use `h-full`).

```ts
interface SidebarContainerProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
}
```

- Desktop (640px+): uses `padding-left` transition to expand/collapse.
- Mobile (<640px): renders backdrop overlay. Auto-closes on navigation.

### Sidebar.Menu

Recursive sidebar menu with route-based selection.

```ts
interface SidebarMenuProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  menus: AppMenu[];
  defaultOpen?: boolean;  // expand all nested menus on initial render (default: false)
}
```

- Parent items of the selected route auto-expand on initial render.
- External links (containing `://`) open in a new tab.

### Sidebar.User

User information area with optional dropdown menu.

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

### useSidebar()

Hook to access sidebar toggle state. Throws if used outside `Sidebar.Container`.

```ts
function useSidebar(): {
  toggle: Accessor<boolean>;
  setToggle: Setter<boolean>;
};
// Also available: useSidebar.optional() returns undefined if no context
```

## Topbar

Top navigation bar. Automatically shows a sidebar toggle button if used inside `Sidebar.Container`.

```ts
interface TopbarProps extends JSX.HTMLAttributes<HTMLElement> {
  children: JSX.Element;
}
```

### Topbar.Container

Vertical layout container wrapping Topbar and content area. Provides `TopbarContext` for actions.

```ts
interface TopbarContainerProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
}
```

### Topbar.Menu

Dropdown navigation menu. Shows desktop buttons on 640px+ and a hamburger menu on mobile.

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

### Topbar.User

User information component with optional dropdown menu.

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

### Topbar.Actions

Renders action elements registered by `useTopbarActions()`.

### useTopbarActions()

Register action elements that appear in the Topbar. Automatically cleaned up on component unmount.

```ts
function useTopbarActions(accessor: () => JSX.Element): void;
```

### useTopbarActionsAccessor()

Read the current topbar actions signal.

```ts
function useTopbarActionsAccessor(): Accessor<JSX.Element | undefined>;
```
