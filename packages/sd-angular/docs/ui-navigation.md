# UI: Navigation Components

## SdCollapseControl

Animates content expanding/collapsing by adjusting `margin-top`.

**Selector:** `sd-collapse`

```html
<sd-collapse [open]="isOpen()">
  <div>Collapsible content</div>
</sd-collapse>
```

**Inputs:** `open: boolean` (default `false`)

---

## SdCollapseIconControl

An icon that rotates when `open` is true (typically a chevron used alongside `SdCollapseControl`).

**Selector:** `sd-collapse-icon`

```html
<sd-collapse-icon [open]="isOpen()" />
```

**Inputs:**

| Input        | Type      | Default             | Description                |
| ------------ | --------- | ------------------- | -------------------------- |
| `open`       | `boolean` | `false`             | Rotated state              |
| `icon`       | `string`  | `tablerChevronDown` | SVG icon                   |
| `openRotate` | `number`  | `90`                | Rotation degrees when open |

---

## SdPaginationControl

Pagination bar with first/prev/page/next/last navigation.

**Selector:** `sd-pagination`

```html
<sd-pagination [(currentPage)]="page" [totalPageCount]="totalPages()" [visiblePageCount]="10" />
```

**Inputs:**

| Input              | Type             | Default | Description                      |
| ------------------ | ---------------- | ------- | -------------------------------- |
| `currentPage`      | `number` (model) | `0`     | Zero-based current page          |
| `totalPageCount`   | `number`         | `0`     | Total number of pages            |
| `visiblePageCount` | `number`         | `10`    | How many page numbers to display |

---

## SdSidebarContainerControl

Container for sidebar + main content layout. Tracks `toggle` state and auto-collapses on navigation.

**Selector:** `sd-sidebar-container`

```html
<sd-sidebar-container>
  <sd-sidebar>
    <sd-sidebar-menu [menus]="menus()" />
  </sd-sidebar>
  <sd-topbar-container>
    <sd-topbar>Title</sd-topbar>
    <sd-pane>Main content</sd-pane>
  </sd-topbar-container>
</sd-sidebar-container>
```

**Signals:** `toggle: WritableSignal<boolean>` — controls sidebar visibility.

---

## SdSidebarControl

The sidebar panel inside `SdSidebarContainerControl`. Reads `toggle` from parent and applies CSS transforms.

**Selector:** `sd-sidebar`

No inputs. Inherits toggle state from `SdSidebarContainerControl`.

---

## SdSidebarMenuControl

Renders a hierarchical menu inside the sidebar. Menus are rendered as `SdListItemControl` items with router navigation.

**Selector:** `sd-sidebar-menu`

```html
<sd-sidebar-menu [menus]="appMenus()" [layout]="'accordion'" />
```

**Inputs:**

| Input                 | Type                                | Description                         |
| --------------------- | ----------------------------------- | ----------------------------------- |
| `menus`               | `ISdSidebarMenu[]`                  | Menu hierarchy                      |
| `layout`              | `"accordion" \| "flat"`             | Root-level layout (auto if not set) |
| `getMenuIsSelectedFn` | `(menu: ISdSidebarMenu) => boolean` | Custom selection check              |

**`ISdSidebarMenu`:**

```typescript
interface ISdSidebarMenu {
  title: string;
  codeChain: string[]; // Route segments: ['orders', 'list']
  url?: string; // External URL (opens in new tab)
  icon?: string; // SVG icon
  children?: ISdSidebarMenu[];
}
```

---

## SdSidebarUserControl

User info panel inside the sidebar with an optional collapsible menu.

**Selector:** `sd-sidebar-user`

```html
<sd-sidebar-user [userMenu]="userMenu()">
  <div>John Doe</div>
  <small>Administrator</small>
</sd-sidebar-user>
```

**Inputs:** `userMenu: ISidebarUserMenu`

```typescript
interface ISidebarUserMenu {
  title: string;
  menus: { title: string; onClick: () => void }[];
}
```

---

## SdTabControl

Tab bar that controls which tab is active via `value` model.

**Selector:** `sd-tab`

```html
<sd-tab [(value)]="activeTab">
  <sd-tab-item [value]="'info'">Info</sd-tab-item>
  <sd-tab-item [value]="'history'">History</sd-tab-item>
</sd-tab>
```

**Model:** `value: any`

---

## SdTabItemControl

An individual tab button inside `SdTabControl`.

**Selector:** `sd-tab-item`

**Inputs:** `value: any`

---

## SdTabviewControl

Combined tab bar + content view. Automatically reads `SdTabviewItemControl` children to build tab headers.

**Selector:** `sd-tabview`

```html
<sd-tabview [(value)]="activeTab">
  <sd-tabview-item [value]="'summary'" [header]="'Summary'">Summary content</sd-tabview-item>
  <sd-tabview-item [value]="'details'" [header]="'Details'">Details content</sd-tabview-item>
</sd-tabview>
```

**Model:** `value: T`

---

## SdTabviewItemControl

A tab panel inside `SdTabviewControl`. Visible only when selected.

**Selector:** `sd-tabview-item`

**Inputs:** `value: T` (required), `header: string`

---

## SdTopbarContainerControl

Flex column container for topbar + main content layout.

**Selector:** `sd-topbar-container`

```html
<sd-topbar-container>
  <sd-topbar>...</sd-topbar>
  <sd-pane>Main content</sd-pane>
</sd-topbar-container>
```

No inputs.

---

## SdTopbarControl

Application topbar. Shows a menu toggle button when a `SdSidebarContainerControl` is detected.

**Selector:** `sd-topbar`

```html
<sd-topbar>
  <h4>Page Title</h4>
  <sd-button>Action</sd-button>
</sd-topbar>
```

**Inputs:** `sidebarContainer: SdSidebarContainerControl` — explicit sidebar reference (optional; auto-detected from parent hierarchy).

---

## SdTopbarMenuControl

Renders a dropdown navigation menu in the topbar.

**Selector:** `sd-topbar-menu`

```html
<sd-topbar-menu [menus]="topbarMenus()" />
```

**Inputs:**

| Input                 | Type                               | Description            |
| --------------------- | ---------------------------------- | ---------------------- |
| `menus`               | `ISdTopbarMenu[]`                  | Menu hierarchy         |
| `getMenuIsSelectedFn` | `(menu: ISdTopbarMenu) => boolean` | Custom selection check |

**`ISdTopbarMenu`:**

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

## SdTopbarUserControl

User dropdown button in the topbar.

**Selector:** `sd-topbar-user`

```html
<sd-topbar-user [menus]="userMenus()">{{ currentUser().name }}</sd-topbar-user>
```

**Inputs:** `menus: { title: string; onClick: () => void }[]` (required)
