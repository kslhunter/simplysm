# Helpers

Source: `src/helpers/*.ts`

## mergeStyles

Utility function that merges CSS styles from multiple sources (objects and strings).

```ts
function mergeStyles(
  ...styles: (JSX.CSSProperties | string | undefined)[]
): JSX.CSSProperties;
```

- Object styles are merged with later values taking precedence.
- String styles are parsed (semicolon-delimited, kebab-case converted to camelCase).
- `undefined` values are ignored.

## createAppStructure

Builds app menus, routes, permissions, and flat menu lists from a declarative structure definition. Supports module-based filtering and permission inference.

```ts
function createAppStructure<TModule, const TItems extends AppStructureItem<TModule>[]>(
  items: TItems,
  options: {
    basePath: string;
    enabledModules?: TModule[];
    enabledPerms?: string[];
    homeCode?: string;
  },
): AppStructure<TModule>;
```

### Input Types

```ts
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

type AppStructureItem<TModule> =
  | AppStructureGroupItem<TModule>
  | AppStructureLeafItem<TModule>;

interface AppStructureSubPerm<TModule> {
  code: string;
  title: string;
  modules?: TModule[];
  requiredModules?: TModule[];
  perms: ("use" | "edit")[];
}
```

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

interface AppMenu {
  title: string;
  href?: string;
  icon?: Component<IconProps>;
  children?: AppMenu[];
}

interface AppPerm<TModule = string> {
  title: string;
  href?: string;
  modules?: TModule[];
  perms?: string[];
  children?: AppPerm<TModule>[];
}

interface AppRoute {
  path: string;
  component: Component;
}

interface AppFlatMenu {
  titleChain: string[];
  href: string;
}

interface AppFlatPerm<TModule = string> {
  titleChain: string[];
  code: string;
  modulesChain: TModule[][];
  requiredModulesChain: TModule[][];
}
```

## createSlot

Single-item slot pattern for parent-child communication. Used for patterns like `Dialog.Header`, `Select.Header`.

```ts
function createSlot<TItem>(): [
  SlotComponent: (props: TItem) => null,
  createSlotAccessor: () => [Accessor<TItem | undefined>, ParentComponent],
];
```

Usage pattern:

```tsx
// 1. Create slot at module level
const [HeaderSlot, createHeaderAccessor] = createSlot<{ children: JSX.Element }>();

// 2. In parent component
const [header, HeaderProvider] = createHeaderAccessor();

return (
  <HeaderProvider>
    {props.children}
    <Show when={header()}>{header()!.children}</Show>
  </HeaderProvider>
);

// 3. In child usage
<Parent>
  <HeaderSlot>My Header Content</HeaderSlot>
  {/* other content */}
</Parent>
```

## createSlots

Multi-item slot pattern. Like `createSlot` but collects an array of items.

```ts
interface SlotRegistrar<TItem> {
  add: (item: TItem) => void;
  remove: (item: TItem) => void;
}

function createSlots<TItem>(): [
  SlotComponent: (props: TItem) => null,
  createSlotsAccessor: () => [Accessor<TItem[]>, ParentComponent],
];
```

Items are collected in order of registration and removed on cleanup.
