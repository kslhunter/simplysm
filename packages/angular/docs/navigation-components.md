# Navigation Components

## `SdCollapseControl`

Animated collapsible content using negative margin-top transition.

Selector: `sd-collapse`

| Input | Type | Description |
|-------|------|-------------|
| `open` | `boolean` (booleanAttribute) | Whether content is visible (default: `false`) |

## `SdCollapseIconControl`

Rotating chevron icon that indicates collapse/expand state.

Selector: `sd-collapse-icon`

| Input | Type | Description |
|-------|------|-------------|
| `open` | `boolean` (booleanAttribute) | Whether in open state (default: `false`) |
| `openRotate` | `number` (numberAttribute) | Rotation angle in degrees when open (default: `90`) |

## `SdTabControl`

Tab header container. Manages the active tab value.

Selector: `sd-tab`

| Input/Model | Type | Description |
|-------------|------|-------------|
| `value` (model) | `any` | Currently active tab value |

## `SdTabItemControl`

Individual tab header item inside `SdTabControl`.

Selector: `sd-tab-item`

| Input | Type | Description |
|-------|------|-------------|
| `value` | `any` | Tab value (matched against parent's value) |

## `SdTabviewControl`

Combined tab header and content view. Automatically renders tab headers from `SdTabviewItemControl` children.

Selector: `sd-tabview`

| Input/Model | Type | Description |
|-------------|------|-------------|
| `value` (model) | `T` | Currently active tabview value |

## `SdTabviewItemControl`

Tab content panel inside `SdTabviewControl`. Shown when its value matches the parent's value.

Selector: `sd-tabview-item`

| Input | Type | Description |
|-------|------|-------------|
| `value` | `T` (required) | Panel value |
| `header` | `string` | Tab header text (falls back to value if not set) |

## `SdPaginationControl`

Page navigation with first/prev-group/next-group/last buttons.

Selector: `sd-pagination`

| Input/Model | Type | Description |
|-------------|------|-------------|
| `currentPage` (model) | `number` | Current page index, 0-based (default: `0`) |
| `totalPageCount` | `number` (numberAttribute) | Total number of pages (default: `0`) |
| `visiblePageCount` | `number` (numberAttribute) | Pages shown per group (default: `10`) |

Public methods:

```typescript
goToPage(page: number): void;
goToNextGroup(): void;
goToPrevGroup(): void;
goToFirst(): void;
goToLast(): void;
```

## `SdSidebarContainerControl`

Layout container with sidebar toggle support. Handles backdrop click and auto-close on navigation.

Selector: `sd-sidebar-container`

Public properties:

| Property | Type | Description |
|----------|------|-------------|
| `toggle` | `WritableSignal<boolean>` | Sidebar toggle state |

## `SdSidebarControl`

Sidebar panel that slides in/out. Positioned absolutely on the left side. Responsive: slides from left on mobile.

Selector: `sd-sidebar`

No inputs. Toggle state is derived from parent `SdSidebarContainerControl`.

## `SdSidebarMenuControl`

Menu renderer for sidebar. Displays hierarchical menus with router links. Supports accordion and flat layouts.

Selector: `sd-sidebar-menu`

| Input | Type | Description |
|-------|------|-------------|
| `menus` | `ISdSidebarMenu[]` | Menu items (default: `[]`) |
| `layout` | `"accordion" \| "flat"` | Root layout mode (auto-selected based on menu count) |
| `getMenuIsSelectedFn` | `(menu: ISdSidebarMenu) => boolean` | Custom selection check function |

### `ISdSidebarMenu`

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Display title |
| `codeChain` | `string[]` | Code path chain for route generation |
| `url` | `string` | Optional external URL (opens in new tab) |
| `icon` | `string` | Optional icon SVG |
| `children` | `ISdSidebarMenu[]` | Optional child menus |

## `SdSidebarUserControl`

User info section in the sidebar with expandable user menu.

Selector: `sd-sidebar-user`

| Input | Type | Description |
|-------|------|-------------|
| `userMenu` | `ISidebarUserMenu` | User menu configuration |

### `ISidebarUserMenu`

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Menu header title |
| `menus` | `{ title: string; onClick: () => void }[]` | Menu items |

## `SdTopbarContainerControl`

Layout container for the top navigation bar. Renders as a flex column filling height.

Selector: `sd-topbar-container`

No inputs.

## `SdTopbarControl`

Top navigation bar. Includes optional sidebar toggle button.

Selector: `sd-topbar`

| Input | Type | Description |
|-------|------|-------------|
| `sidebarContainer` | `SdSidebarContainerControl` | Optional explicit sidebar container reference |

## `SdTopbarMenuControl`

Menu renderer for topbar using dropdown menus. Displays hierarchical menus with router links.

Selector: `sd-topbar-menu`

| Input | Type | Description |
|-------|------|-------------|
| `menus` | `ISdTopbarMenu[]` | Menu items (default: `[]`) |
| `getMenuIsSelectedFn` | `(menu: ISdTopbarMenu) => boolean` | Custom selection check function |

### `ISdTopbarMenu`

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Display title |
| `codeChain` | `string[]` | Code path chain for route generation |
| `url` | `string` | Optional external URL (opens in new tab) |
| `icon` | `string` | Optional icon SVG |
| `children` | `ISdTopbarMenu[]` | Optional child menus |

## `SdTopbarUserControl`

User dropdown in topbar. Displays user content as trigger and menu items in dropdown.

Selector: `sd-topbar-user`

| Input | Type | Description |
|-------|------|-------------|
| `menus` | `ISdTopbarUserMenu[]` (required) | User menu items |

### `ISdTopbarUserMenu`

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Menu item title |
| `onClick` | `() => void` | Click handler |
