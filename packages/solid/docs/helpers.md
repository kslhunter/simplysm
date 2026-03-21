# Helpers

Source: `src/helpers/**`

## `mergeStyles`

Utility function that merges CSS styles. Supports string, object, and mixed formats. Converts kebab-case CSS strings to camelCase object properties. Later values take precedence.

```typescript
export function mergeStyles(
  ...styles: (JSX.CSSProperties | string | undefined)[]
): JSX.CSSProperties;
```

---

## `createAppStructure`

Factory function for defining app navigation structure with type-safe permission inference. Generates routes, menus, and permission trees from a declarative item definition.

```typescript
export function createAppStructure<TModule, const TItems extends AppStructureItem<TModule>[]>(
  getOpts: () => {
    items: TItems;
    usableModules?: Accessor<TModule[] | undefined>;
    permRecord?: Accessor<Record<string, boolean> | undefined>;
  },
): {
  AppStructureProvider: ParentComponent;
  useAppStructure: () => AppStructure<TModule> & { perms: InferPerms<TItems> };
};
```

### `AppStructure`

```typescript
export interface AppStructure<TModule> {
  items: AppStructureItem<TModule>[];
  usableRoutes: Accessor<AppRoute[]>;
  usableMenus: Accessor<AppMenu[]>;
  usableFlatMenus: Accessor<AppFlatMenu[]>;
  usablePerms: Accessor<AppPerm<TModule>[]>;
  allFlatPerms: AppFlatPerm<TModule>[];
  getTitleChainByHref(href: string): string[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `usableRoutes` | `Accessor<AppRoute[]>` | Routes filtered by module and permission |
| `usableMenus` | `Accessor<AppMenu[]>` | Menu tree filtered by module and permission |
| `usableFlatMenus` | `Accessor<AppFlatMenu[]>` | Flat menu list with title chains |
| `usablePerms` | `Accessor<AppPerm[]>` | Permission tree filtered by module |
| `allFlatPerms` | `AppFlatPerm[]` | All permissions flattened (static) |
| `getTitleChainByHref` | `(href) => string[]` | Get breadcrumb title chain for URL |

### Input Types

```typescript
export type AppStructureItem<TModule> =
  | AppStructureGroupItem<TModule>
  | AppStructureLeafItem<TModule>;

export interface AppStructureGroupItem<TModule> {
  code: string;
  title: string;
  icon?: Component<IconProps>;
  modules?: TModule[];
  requiredModules?: TModule[];
  children: AppStructureItem<TModule>[];
}

export interface AppStructureLeafItem<TModule> {
  code: string;
  title: string;
  icon?: Component<IconProps>;
  modules?: TModule[];
  requiredModules?: TModule[];
  component?: Component;
  perms?: ("use" | "edit")[];
  subPerms?: AppStructureSubPerm<TModule>[];
  isNotMenu?: boolean;
}

export interface AppStructureSubPerm<TModule> {
  code: string;
  title: string;
  modules?: TModule[];
  requiredModules?: TModule[];
  perms: ("use" | "edit")[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `code` | `string` | Unique item identifier |
| `title` | `string` | Display title |
| `icon` | `Component<IconProps>` | Navigation icon |
| `modules` | `TModule[]` | Required modules (any match) |
| `requiredModules` | `TModule[]` | Strictly required modules (all match) |
| `children` | `AppStructureItem[]` | Child items (group only) |
| `component` | `Component` | Page component (leaf only) |
| `perms` | `("use" \| "edit")[]` | Permission types (leaf only) |
| `subPerms` | `AppStructureSubPerm[]` | Sub-permission definitions (leaf only) |
| `isNotMenu` | `boolean` | Exclude from menu (leaf only) |

Discriminated union: items with `children` are groups; items without are leaves.

### Output Types

```typescript
export interface AppMenu {
  title: string;
  href?: string;
  icon?: Component<IconProps>;
  children?: AppMenu[];
}

export interface AppRoute {
  path: string;
  component: Component;
}

export interface AppPerm<TModule = string> {
  title: string;
  href?: string;
  modules?: TModule[];
  perms?: string[];
  children?: AppPerm<TModule>[];
}

export interface AppFlatPerm<TModule = string> {
  titleChain: string[];
  code: string;
  modulesChain: TModule[][];
  requiredModulesChain: TModule[][];
}

export interface AppFlatMenu {
  titleChain: string[];
  href: string;
}
```

---

## `createSlot`

Creates a single-occupancy slot pattern for compound components.

```typescript
export function createSlot<TItem>(): [
  SlotComponent: (props: TItem) => null,
  createSlotAccessor: () => [Accessor<TItem | undefined>, ParentComponent],
];
```

Returns a tuple of `[SlotComponent, createSlotAccessor]`:
- **`SlotComponent`** -- Rendered inside provider to register slot content (throws if slot already occupied)
- **`createSlotAccessor`** -- Returns `[accessor, Provider]` for reading and providing the slot

---

## `createSlots`

Creates a multi-occupancy slot pattern for compound components (multiple items).

```typescript
export function createSlots<TItem>(): [
  SlotComponent: (props: TItem) => null,
  createSlotsAccessor: () => [Accessor<TItem[]>, ParentComponent],
];
```

### `SlotRegistrar`

```typescript
export interface SlotRegistrar<TItem> {
  add: (item: TItem) => void;
  remove: (item: TItem) => void;
}
```

---

## `startPointerDrag`

Sets up pointer capture and manages pointermove/pointerup lifecycle for drag operations.

```typescript
export function startPointerDrag(
  target: HTMLElement,
  pointerId: number,
  options: {
    onMove: (e: PointerEvent) => void;
    onEnd: (e: PointerEvent) => void;
  },
): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `target` | `HTMLElement` | Element to capture pointer on |
| `pointerId` | `number` | Pointer ID from the initiating PointerEvent |
| `options.onMove` | `(e: PointerEvent) => void` | Called on each pointermove |
| `options.onEnd` | `(e: PointerEvent) => void` | Called on pointerup or pointercancel |
