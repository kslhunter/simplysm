# Helpers

## mergeStyles

```typescript
function mergeStyles(
  ...styles: (JSX.CSSProperties | string | undefined)[]
): JSX.CSSProperties;
```

Merges multiple style objects or CSS strings into a single `JSX.CSSProperties` object. Handles `undefined` values gracefully.

---

## createAppStructure

```typescript
function createAppStructure<TModule, const TItems extends AppStructureItem<TModule>[]>(
  getOpts: () => {
    items: TItems;
    usableModules?: Accessor<TModule[] | undefined>;
    permRecord?: Accessor<Record<string, boolean> | undefined>;
  },
): {
  AppStructureProvider: ParentComponent;
  useAppStructure(): AppStructure<TModule>;
};
```

Creates an application navigation/permission structure from a declarative item tree. Returns a provider and a hook.

### AppStructure types

```typescript
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

interface AppMenu {
  title: string;
  href?: string;
  icon?: Component<IconProps>;
  children?: AppMenu[];
}

interface AppStructure<TModule> {
  items: AppStructureItem<TModule>[];
  usableRoutes: Accessor<AppRoute[]>;
  usableMenus: Accessor<AppMenu[]>;
  usableFlatMenus: Accessor<AppFlatMenu[]>;
  usablePerms: Accessor<AppPerm<TModule>[]>;
  allFlatPerms: AppFlatPerm<TModule>[];
  getTitleChainByHref(href: string): string[];
}
```

The structure automatically derives routes, menus, and permissions from the item tree, filtering by `usableModules` and `permRecord`.

---

## createSlot

```typescript
function createSlot<TProps extends { children: JSX.Element }>():
  [Component<TProps>, () => [Accessor<TProps | undefined>, ParentComponent]];
```

Creates a slot pattern for compound components. Returns a slot component and a hook to access the slot content.

---

## createSlots

```typescript
interface SlotRegistrar<TItem> {
  add(item: TItem): void;
  remove(item: TItem): void;
}

function createSlots<TItem>():
  [Component, () => [Accessor<TItem[]>, ParentComponent]];
```

Like `createSlot` but for multiple items. Items are collected from all rendered slot components.

---

## ripple (Directive)

```typescript
function ripple(el: HTMLElement, accessor: Accessor<boolean>): void;
```

SolidJS directive that adds a Material-style ripple effect on click.

```typescript
import { ripple } from "@simplysm/solid";

// Register the directive (required for TypeScript)
void ripple;

<div use:ripple={true}>Click me</div>
```

---

## Style Constants

### base.styles

Background, border, and text color utilities mapped to the theme system:

- `bg.surface`, `bg.muted`, `bg.subtle` -- background colors
- `border.default`, `border.subtle` -- border colors
- `text.default`, `text.muted`, `text.placeholder` -- text colors

### control.styles

Component sizing and state utilities:

- `pad.xs`, `pad.sm`, `pad.md`, `pad.lg`, `pad.xl` -- padding by size
- `gap.xs` ... `gap.xl` -- gap by size
- `state.disabled` -- disabled state styling
- `ComponentSize` -- `"xs" | "sm" | "md" | "lg" | "xl"`

### theme.styles

Semantic theme tokens:

- `SemanticTheme` -- `"base" | "primary" | "info" | "success" | "warning" | "danger"`
- `themeTokens` -- maps each theme to `{ solid, solidHover, light, text, hoverBg, border }` Tailwind class sets

---

## Usage Examples

```typescript
import { createAppStructure, mergeStyles } from "@simplysm/solid";

// App structure
const { AppStructureProvider, useAppStructure } = createAppStructure(() => ({
  items: [
    { code: "home", title: "Home", component: HomePage },
    {
      code: "admin", title: "Admin", children: [
        { code: "users", title: "Users", component: UsersPage, perms: ["use", "edit"] },
      ],
    },
  ],
  usableModules: () => currentModules(),
  permRecord: () => userPerms(),
}));

// Merge styles
const style = mergeStyles(props.style, { padding: "8px" }, "color: red");
```
