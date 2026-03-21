# Helpers

Source: `src/helpers/**`

## `mergeStyles`

Merge CSS style objects and/or strings into a single JSX.CSSProperties object.

```ts
function mergeStyles(...styles: (JSX.CSSProperties | string | undefined)[]): JSX.CSSProperties;
```

Accepts any combination of style objects and CSS strings. Undefined values are ignored.

## `createAppStructure`

Create typed app structure with routes, menus, and permissions. Returns a provider component and a hook.

```ts
function createAppStructure<TModule, const TItems extends AppStructureItem<TModule>[]>(
  getOpts: () => {
    items: TItems;
    hasPermission: (code: string, perm: string) => boolean;
  },
): {
  AppStructureProvider: ParentComponent;
  useAppStructure: () => AppStructure<TModule> & { perms: InferPerms<TItems> };
};
```

### Input Types

```ts
type AppStructureItem<TModule> = AppStructureGroupItem<TModule> | AppStructureLeafItem<TModule>;

interface AppStructureGroupItem<TModule> {
  code: string;
  title: string;
  icon?: Component<IconProps>;
  modules?: TModule[];
  requiredModules?: TModule[];
  children: AppStructureItem<TModule>[];
}

interface AppStructureLeafItem<TModule> {
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

interface AppStructureSubPerm<TModule> {
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
| `modules` | `TModule[]` | Required modules for visibility |
| `requiredModules` | `TModule[]` | Strictly required modules |
| `children` | `AppStructureItem[]` | Child items (group only) |
| `component` | `Component` | Page component (leaf only) |
| `perms` | `("use" \| "edit")[]` | Permission types (leaf only) |
| `subPerms` | `AppStructureSubPerm[]` | Sub-permission definitions (leaf only) |
| `isNotMenu` | `boolean` | Exclude from menu (leaf only) |

Discriminated union: items with `children` are groups; items without are leaves.

### Output Types

```ts
interface AppStructure<TModule> {
  items: AppStructureItem<TModule>[];
  usableRoutes: Accessor<AppRoute[]>;
  usableMenus: Accessor<AppMenu[]>;
  usableFlatMenus: Accessor<AppFlatMenu[]>;
  usablePerms: Accessor<AppPerm<TModule>[]>;
  allFlatPerms: AppFlatPerm<TModule>[];
  getTitleChainByHref(href: string): string[];
}

interface AppRoute {
  path: string;
  component: Component;
}

interface AppMenu {
  title: string;
  href?: string;
  icon?: Component<IconProps>;
  children?: AppMenu[];
}

interface AppFlatMenu {
  titleChain: string[];
  href: string;
}

interface AppPerm<TModule = string> {
  title: string;
  href?: string;
  modules?: TModule[];
  perms?: string[];
  children?: AppPerm<TModule>[];
}

interface AppFlatPerm<TModule = string> {
  titleChain: string[];
  code: string;
  modulesChain: TModule[][];
  requiredModulesChain: TModule[][];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `usableRoutes` | `Accessor<AppRoute[]>` | Routes filtered by permission |
| `usableMenus` | `Accessor<AppMenu[]>` | Menu tree filtered by permission |
| `usableFlatMenus` | `Accessor<AppFlatMenu[]>` | Flat menu list with title chains |
| `usablePerms` | `Accessor<AppPerm[]>` | Permission tree filtered by permission |
| `allFlatPerms` | `AppFlatPerm[]` | All permissions flattened |
| `getTitleChainByHref` | `(href) => string[]` | Get breadcrumb title chain for URL |

## `createSlot`

Create a single-item slot for compound component patterns.

```ts
function createSlot<TItem>(): [SlotComponent, createSlotAccessor];
```

Returns a tuple of:
1. **SlotComponent** -- Component that children use to register slot content.
2. **createSlotAccessor** -- Function to access the registered slot content.

## `createSlots`

Create multi-item slots for compound component patterns (e.g., multiple columns).

```ts
interface SlotRegistrar<TItem> {
  add: (item: TItem) => void;
  remove: (item: TItem) => void;
}

function createSlots<TItem>(): [SlotComponent, createSlotsAccessor];
```

Returns a tuple of:
1. **SlotComponent** -- Component that children use to register multiple slot items.
2. **createSlotsAccessor** -- Function to access an array of registered slot items.
