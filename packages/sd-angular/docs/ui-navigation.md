# UI - Navigation Components

## Collapse

### SdCollapseControl

**Type:** `@Component` | **Selector:** `sd-collapse`

Animates content expanding/collapsing using `margin-top` transition. Content is hidden by shifting upward when collapsed.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `open` | `boolean \| ""` | No | `false` | Whether content is expanded |

---

### SdCollapseIconControl

**Type:** `@Component` | **Selector:** `sd-collapse-icon`

Animated icon that rotates to indicate expand/collapse state.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `icon` | `string` | No | `tablerChevronDown` | Icon SVG string |
| `open` | `boolean \| ""` | No | `false` | Whether the icon shows "open" state |
| `openRotate` | `number` | No | `90` | Rotation angle in degrees when open |

---

## Pagination

### SdPaginationControl

**Type:** `@Component` | **Selector:** `sd-pagination`

Page navigation with first/prev/next/last buttons and numbered page links.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `totalPageCount` | `number` | No | `0` | Total number of pages |
| `visiblePageCount` | `number` | No | `10` | Number of page buttons to show at once |

#### Models

| Model | Type | Default | Description |
|-------|------|---------|-------------|
| `currentPage` | `number` | `0` | Current page index (0-based) |

---

## Sidebar

### SdSidebarContainerControl

**Type:** `@Component` | **Selector:** `sd-sidebar-container`

Layout container that positions a sidebar alongside the main content area. The sidebar slides in/out and the content area adjusts.

No inputs.

---

### SdSidebarControl

**Type:** `@Component` | **Selector:** `sd-sidebar`

The sidebar panel within `SdSidebarContainerControl`. Contains user info, menus, and additional content.

No inputs.

---

### SdSidebarMenuControl

**Type:** `@Component` | **Selector:** `sd-sidebar-menu`

Hierarchical menu tree for sidebar navigation. Supports accordion and flat layouts.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `menus` | `ISdSidebarMenu[]` | No | `[]` | Menu tree items |
| `layout` | `"accordion" \| "flat"` | No | -- | Display layout |
| `getMenuIsSelectedFn` | `(menu: ISdSidebarMenu) => boolean` | No | -- | Selection check function |

#### ISdSidebarMenu

```typescript
interface ISdSidebarMenu {
  title: string;
  codeChain: string[];
  url?: string;
  icon?: string;
  children?: ISdSidebarMenu[];
}
```

---

### SdSidebarUserControl

**Type:** `@Component` | **Selector:** `sd-sidebar-user`

User info section in the sidebar with avatar area and dropdown menu.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `userMenu` | `ISidebarUserMenu` | No | -- | User menu configuration |
| `menuTitle` | `string` | No | -- | Menu section title |

#### ISidebarUserMenu

```typescript
interface ISidebarUserMenu {
  title: string;
  menus: {
    title: string;
    onClick: () => void;
  }[];
}
```

---

## Tab

### SdTabControl

**Type:** `@Component` | **Selector:** `sd-tab`

Tab bar that manages active tab selection.

#### Models

| Model | Type | Description |
|-------|------|-------------|
| `value` | `any` | Currently active tab value |

---

### SdTabItemControl

**Type:** `@Component` | **Selector:** `sd-tab-item`

Individual tab button within a `SdTabControl`.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `value` | `any` | No | -- | Tab value (matched against parent) |

---

### SdTabviewControl

**Type:** `@Component` | **Selector:** `sd-tabview`

Tabbed view container with integrated tab bar and content switching.

#### Models

| Model | Type | Description |
|-------|------|-------------|
| `value` | `T` | Currently active tabview value |

---

### SdTabviewItemControl

**Type:** `@Component` | **Selector:** `sd-tabview-item`

Content panel within `SdTabviewControl`. Displays when its value matches the parent's value.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `value` | `T` | Yes | -- | Tabview item value |
| `header` | `string` | No | -- | Tab header text |

---

## Topbar

### SdTopbarContainerControl

**Type:** `@Component` | **Selector:** `sd-topbar-container`

Layout container that positions a topbar above the main content area.

No inputs.

---

### SdTopbarControl

**Type:** `@Component` | **Selector:** `sd-topbar`

Top navigation bar. Includes a toggle button for sidebars.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sidebarContainer` | `SdSidebarContainerControl` | No | -- | Reference to sidebar container for toggle button |

---

### SdTopbarMenuControl

**Type:** `@Component` | **Selector:** `sd-topbar-menu`

Horizontal menu tree for topbar navigation.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `menus` | `ISdTopbarMenu[]` | No | `[]` | Menu tree items |
| `getMenuIsSelectedFn` | `(menu: ISdTopbarMenu) => boolean` | No | -- | Selection check function |

#### ISdTopbarMenu

```typescript
interface ISdTopbarMenu {
  title: string;
  codeChain: string[];
  url?: string;
  icon?: string;
  children?: ISdTopbarMenu[];
}
```

---

### SdTopbarUserControl

**Type:** `@Component` | **Selector:** `sd-topbar-user`

User dropdown in the topbar with avatar and menu items.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `menus` | `{ title: string; onClick: () => void }[]` | Yes | -- | User menu items |
