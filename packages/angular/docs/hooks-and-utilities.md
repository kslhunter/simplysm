# Hooks & Utilities

Hook functions (prefixed with `use`) must be called within Angular injection context (constructor or `runInInjectionContext`).

## `usePermsSignal`

Returns a signal of permitted keys for the given view codes. Filters `permKeys` by checking the app structure's permission record.

```typescript
function usePermsSignal<K extends string>(viewCodes: string[], keys: K[]): Signal<K[]>;
```

## `useSdSystemConfigResource`

Creates a resource for reading and writing system configuration values, scoped by the host element's tag name.

```typescript
function useSdSystemConfigResource<T>(options: {
  key: Signal<string | undefined>;
}): {
  value: Signal<T | undefined>;
  isLoading: Signal<boolean>;
  status: Signal<ResourceStatus>;
  hasValue(): boolean;
  reload(): void;
  set(value: T | undefined): void;
  update(fn: (prev: T | undefined) => T | undefined): void;
};
```

## `useCurrentPageCodeSignal`

Returns a signal of the current page code derived from the activated route's URL segments (joined by `.`). Returns `undefined` if no ActivatedRoute is available.

```typescript
function useCurrentPageCodeSignal(): Signal<string> | undefined;
```

## `useFullPageCodeSignal`

Returns a signal of the full page code derived from the router's current URL. Updated on every `NavigationEnd`.

```typescript
function useFullPageCodeSignal(): Signal<string>;
```

## `useViewTitleSignal`

Returns a signal of the current view's title. Uses modal title if inside a modal, otherwise derives from app structure using the page code.

```typescript
function useViewTitleSignal(): Signal<string>;
```

## `useViewTypeSignal`

Returns a signal indicating whether the current view is displayed as a page, modal, or embedded control.

```typescript
function useViewTypeSignal(getComp: () => object): Signal<TSdViewType>;
```

### `TSdViewType`

```typescript
type TSdViewType = "page" | "modal" | "control";
```

## `useExpandingManager`

Manages tree expand/collapse state for hierarchical data. Computes flattened display items, tracks expanded items, and provides toggle/visibility methods.

```typescript
function useExpandingManager<T>(binding: {
  items: Signal<T[]>;
  expandedItems: WritableSignal<T[]>;
  getChildrenFn: Signal<((item: T, index: number) => T[] | undefined) | undefined>;
  sort: (items: T[]) => T[];
}): {
  displayItems: Signal<T[]>;
  hasExpandable: Signal<boolean>;
  isAllExpanded: Signal<boolean>;
  toggle(item: T): void;
  toggleAll(): void;
  isVisible(item: T): boolean;
  def(item: T): IExpandItemDef<T>;
};
```

### `IExpandItemDef`

| Field | Type | Description |
|-------|------|-------------|
| `item` | `T` | The data item |
| `parentDef` | `IExpandItemDef<T> \| undefined` | Parent definition (for tree traversal) |
| `hasChildren` | `boolean` | Whether item has children |
| `depth` | `number` | Nesting depth (0-based) |

## `useSelectionManager`

Manages item selection state (single or multi mode). Provides select/deselect/toggle operations and computed selection state.

```typescript
function useSelectionManager<T>(options: {
  displayItems: Signal<T[]>;
  selectedItems: WritableSignal<T[]>;
  selectMode: Signal<"single" | "multi" | undefined>;
  getItemSelectableFn: Signal<((item: T) => boolean | string) | undefined>;
}): {
  hasSelectable: Signal<boolean>;
  isAllSelected: Signal<boolean>;
  getSelectable(item: T): true | string | undefined;
  getCanChangeFn(item: T): () => boolean;
  select(item: T): void;
  deselect(item: T): void;
  toggle(item: T): void;
  toggleAll(): void;
  isSelected(item: T): boolean;
};
```

## `useSortingManager`

Manages column sorting state with single and multi-column support. Toggle cycles through: ascending, descending, removed.

```typescript
function useSortingManager(options: {
  sorts: WritableSignal<ISortingDef[]>;
}): {
  defMap: Signal<Map<string, { indexText?: string; desc: boolean }>>;
  toggle(key: string, multiple: boolean): void;
  sort<T>(items: T[]): T[];
};
```

### `ISortingDef`

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Column/property key to sort by |
| `desc` | `boolean` | Whether sort is descending |

## `setSafeStyle`

Safely sets multiple CSS style properties on an element via Renderer2.

```typescript
function setSafeStyle(
  renderer: Renderer2,
  el: HTMLElement,
  style: Partial<CSSStyleDeclaration>,
): void;
```

## `TDirectiveInputSignals`

Utility type that extracts `InputSignal` value types from a component/directive. Non-InputSignal properties are excluded. Properties with `undefined` in their type become optional.

```typescript
type TDirectiveInputSignals<T> = TUndefToOptional<{
  [P in keyof T as T[P] extends InputSignal<any> ? P : never]: T[P] extends InputSignal<infer V> ? V : never;
}>;
```

## `TUndefToOptional`

Utility type that converts properties containing `undefined` in their type to optional properties.

```typescript
type TUndefToOptional<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
} & {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<T[K], undefined>;
};
```
