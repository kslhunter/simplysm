# UI Navigation

Navigation components: collapse, tabs, pagination, sidebar, and topbar.

## `SdCollapseControl`

Animated collapse/expand container using height-based margin transition.

```typescript
@Component({ selector: "sd-collapse" })
class SdCollapseControl {
  open = input(false, { transform: booleanAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `open` | `boolean` | `false` | Whether content is expanded |

## `SdCollapseIconControl`

Animated chevron icon that rotates when the associated collapse is open.

```typescript
@Component({ selector: "sd-collapse-icon" })
class SdCollapseIconControl {
  open = input(false, { transform: booleanAttribute });
  openRotate = input(90, { transform: numberAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `open` | `boolean` | `false` | Rotation active state |
| `openRotate` | `number` | `90` | Degrees to rotate when open |

## `SdTabControl`

Tab bar container. Manages the selected tab value.

```typescript
@Component({ selector: "sd-tab" })
class SdTabControl {
  value = model<any>();
}
```

## `SdTabItemControl`

Individual tab button. Must be a child of `SdTabControl`.

```typescript
@Component({ selector: "sd-tab-item" })
class SdTabItemControl {
  value = input<any>();
  isSelected = computed(/* parent.value() === this.value() */);
}
```

## `SdTabviewControl`

Combined tab bar + content panel container. Builds tabs from projected `SdTabviewItemControl` children.

```typescript
@Component({ selector: "sd-tabview" })
class SdTabviewControl<T> {
  value = model<T | undefined>();
}
```

## `SdTabviewItemControl`

Content panel for a single tab within `SdTabviewControl`. Hidden unless selected.

```typescript
@Component({ selector: "sd-tabview-item" })
class SdTabviewItemControl<T> {
  value = input.required<T>();
  header = input<string>();
  isSelected = computed(/* parent.value() === this.value() */);
}
```

| Input | Type | Description |
|-------|------|-------------|
| `value` | `T` | Tab identity value (required) |
| `header` | `string \| undefined` | Tab bar label (falls back to `value`) |

## `SdPaginationControl`

Pagination bar with first/last/prev-group/next-group navigation.

```typescript
@Component({ selector: "sd-pagination" })
class SdPaginationControl {
  currentPage = model(0);
  totalPageCount = input(0, { transform: numberAttribute });
  visiblePageCount = input(10, { transform: numberAttribute });

  hasPrev: Signal<boolean>;
  hasNext: Signal<boolean>;
  displayPages: Signal<number[]>;

  goToPage(page: number): void;
  goToNextGroup(): void;
  goToPrevGroup(): void;
  goToFirst(): void;
  goToLast(): void;
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `currentPage` | `number` | `0` | Zero-based current page (two-way) |
| `totalPageCount` | `number` | `0` | Total number of pages |
| `visiblePageCount` | `number` | `10` | Max page buttons per group |

## `SdSidebarContainerControl`

Layout wrapper for sidebar + main content. Manages sidebar toggle state; auto-closes on router `NavigationStart`.

```typescript
@Component({ selector: "sd-sidebar-container" })
class SdSidebarContainerControl {
  toggle: WritableSignal<boolean>;
}
```

## `SdSidebarControl`

The sidebar panel. Must be a child of `SdSidebarContainerControl`.

```typescript
@Component({ selector: "sd-sidebar" })
class SdSidebarControl {
  toggle: Signal<boolean>; // mirrors parent
}
```

## `SdSidebarMenuControl`

Recursive sidebar navigation menu. Supports accordion and flat layouts, router links, and icons.

```typescript
@Component({ selector: "sd-sidebar-menu" })
class SdSidebarMenuControl {
  menus = input<ISdMenu[]>([]);
  layout = input<"accordion" | "flat">();
  getMenuIsSelectedFn = input<(menu: ISdMenu) => boolean>();
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `menus` | `ISdMenu[]` | `[]` | Menu items (from `SdAppStructureProvider.usableMenus`) |
| `layout` | `"accordion" \| "flat" \| undefined` | auto | Flat when ≤3 root menus |
| `getMenuIsSelectedFn` | `((menu: ISdMenu) => boolean) \| undefined` | — | Custom selection predicate |

Uses `ISdMenu` from `@simplysm/angular` (exported via `SdAppStructureProvider`).

## `SdSidebarUserControl`

Sidebar user section with a collapsible dropdown menu.

```typescript
@Component({ selector: "sd-sidebar-user" })
class SdSidebarUserControl {
  userMenu = input<ISidebarUserMenu>();
}
```

## `ISidebarUserMenu`

```typescript
interface ISidebarUserMenu {
  title: string;
  menus: { title: string; onClick: () => void }[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | User display name |
| `menus` | `{ title: string; onClick: () => void }[]` | Dropdown action items |

## `SdTopbarContainerControl`

Simple flex column layout shell for topbar + content area.

```typescript
@Component({ selector: "sd-topbar-container" })
class SdTopbarContainerControl { }
```

## `SdTopbarControl`

Top navigation bar. Optionally renders a hamburger button to toggle an associated sidebar.

```typescript
@Component({ selector: "sd-topbar" })
class SdTopbarControl {
  sidebarContainer = input<SdSidebarContainerControl>();
}
```

## `SdTopbarMenuControl`

Horizontal topbar navigation menu with dropdown sub-menus.

```typescript
@Component({ selector: "sd-topbar-menu" })
class SdTopbarMenuControl {
  menus = input<ISdMenu[]>([]);
  getMenuIsSelectedFn = input<(menu: ISdMenu) => boolean>();
}
```

Uses `ISdMenu` from `@simplysm/angular` (exported via `SdAppStructureProvider`).

## `SdTopbarUserControl`

Topbar user button with a dropdown menu.

```typescript
@Component({ selector: "sd-topbar-user" })
class SdTopbarUserControl {
  menus = input.required<ISdTopbarUserMenu[]>();
}
```

## `ISdTopbarUserMenu`

```typescript
interface ISdTopbarUserMenu {
  title: string;
  onClick: () => void;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Menu item label |
| `onClick` | `() => void` | Click handler |
