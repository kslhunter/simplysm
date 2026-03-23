# Core - Utilities

## Signal Bindings

### $signal

Enhanced writable signal factory that adds a `$mark()` method for forcing change notification without changing the value.

```typescript
function $signal<T>(): SdWritableSignal<T | undefined>;
function $signal<T>(initialValue: T): SdWritableSignal<T>;
```

#### SdWritableSignal

```typescript
interface SdWritableSignal<T> extends WritableSignal<T> {
  $mark(): void;
}
```

---

### toSignal

Converts an existing `WritableSignal` to an `SdWritableSignal` by adding the `$mark()` method.

```typescript
function toSignal<T>(sig: WritableSignal<T>): SdWritableSignal<T>;
```

---

### $computed

Extended computed signal with optional async support. When signal dependencies are provided as an array, the computation runs untracked (supports async functions).

```typescript
// Synchronous
function $computed<R>(fn: () => R): Signal<R>;

// Synchronous with explicit dependencies
function $computed<R>(signals: Signal<any>[], fn: () => R): Signal<R>;

// Async with explicit dependencies
function $computed<R>(signals: Signal<any>[], fn: () => Promise<R>): Signal<R | undefined>;
function $computed<R>(
  signals: Signal<any>[],
  fn: () => Promise<R>,
  opt: { initialValue?: R },
): Signal<R>;
```

---

### $effect

Extended effect with optional condition signals. When condition signals are provided, only they are tracked; the callback runs untracked and may be async.

```typescript
// Standard effect
function $effect(
  fn: (onCleanup: EffectCleanupRegisterFn) => void,
  options?: CreateEffectOptions,
): EffectRef;

// Conditional effect (signals tracked, fn untracked)
function $effect(
  conditions: (() => unknown)[],
  fn: (onCleanup: EffectCleanupRegisterFn) => void | Promise<void>,
  options?: CreateEffectOptions,
): EffectRef;
```

---

### $resource

Extended resource with optional auto-save. When the resource status is `"local"` (user-modified), the `saver` function is called automatically.

```typescript
function $resource<T, R>(
  options: ResourceOptions<T, R> & {
    saver?: (param: T | undefined) => void | PromiseLike<void>;
    defaultValue?: NoInfer<T>;
  },
): ResourceRef<T | undefined>;
```

---

### $afterRenderEffect

After-render effect with optional signal dependencies. When signals are provided, only they are tracked; the callback runs untracked.

```typescript
function $afterRenderEffect(
  fn: (onCleanup: EffectCleanupRegisterFn) => void,
): EffectRef;

function $afterRenderEffect(
  signals: Signal<any>[],
  fn: (onCleanup: EffectCleanupRegisterFn) => void | Promise<void>,
): EffectRef;
```

---

### $afterRenderComputed

Computed signal that re-evaluates after each render cycle.

```typescript
function $afterRenderComputed<R>(
  fn: () => R,
  opt?: { initialValue?: R },
): Signal<R | undefined>;
```

---

### $mark

Forces a signal to notify its consumers without changing its value. Operates on Angular's internal signal primitives.

```typescript
function $mark(sig: WritableSignal<any>, clone?: boolean): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `sig` | `WritableSignal<any>` | The signal to mark |
| `clone` | `boolean` | If true, shallow-clones the value instead of using internal notification |

---

## Signal Wrappers

### $arr

Immutable array operations wrapper for writable signals. All operations create a new array reference.

```typescript
function $arr<T>(sig: Signal<T[]> | WritableSignal<T[]>): {
  insert(i: number, item: T): void;
  remove(itemOrFn: T | ((item: T, i: number) => boolean)): void;
  toggle(value: T): void;
  snapshot(keyPropNameOrFn: keyof T | ((item: T) => any)): void;
  changed(item: T): boolean;
  diffs(options?: { includeSame?; excludes?; includes? }): TArrayDiffs2Result<T>[];
  origin: Map<any, T>;  // readonly
};
```

| Method | Description |
|--------|-------------|
| `insert` | Insert item at index |
| `remove` | Remove item by value or predicate |
| `toggle` | Add if absent, remove if present |
| `snapshot` | Take a snapshot for change tracking |
| `changed` | Check if a single item changed since snapshot |
| `diffs` | Get all differences since snapshot |
| `origin` | Get the snapshot map |

---

### $map

Immutable Map operations wrapper for writable signals.

```typescript
function $map<K, T>(sig: WritableSignal<Map<K, T>>): {
  set(key: K, value: T): void;
  update(key: K, value: (val: T | undefined) => T): void;
};
```

---

### $obj

Object wrapper with snapshot-based change tracking for writable signals.

```typescript
function $obj<T extends object | undefined>(sig: Signal<T> | WritableSignal<T>): {
  snapshot(): void;
  changed(): boolean;
  origin: T | undefined;  // readonly
  updateField<K extends keyof T>(key: K, val: T[K]): void;
  deleteField<K extends keyof T>(key: K): void;
};
```

---

### $set

Immutable Set operations wrapper for writable signals.

```typescript
function $set<T>(sig: WritableSignal<Set<T>>): {
  add(value: T): void;
  adds(...values: T[]): void;
  delete(value: T): void;
  deletes(...values: T[]): void;
  toggle(value: T, addOrDel?: "add" | "del"): void;
};
```

---

## Injection Utilities

### injectElementRef

Typed `ElementRef` injection shorthand.

```typescript
function injectElementRef<T = HTMLElement>(): ElementRef<T>;
```

---

### injectParent

Injects the nearest parent component by type, walking up the view injector tree.

```typescript
function injectParent<T = any>(type?: AbstractType<T>): T;
function injectParent<T = any>(
  type: AbstractType<T>,
  options: { optional: true },
): T | undefined;
```

---

## Managers

### SdExpandingManager

Manages tree expand/collapse state for hierarchical data display.

```typescript
class SdExpandingManager<T> {
  constructor(options: {
    items: Signal<T[]>;
    expandedItems: WritableSignal<T[]>;
    getChildrenFn: Signal<((item: T, index: number) => T[] | undefined) | undefined>;
    sort: (items: T[]) => T[];
  });

  flattedItems: Signal<T[]>;
  hasExpandable: Signal<boolean>;
  isAllExpanded: Signal<boolean>;

  toggleAll(): void;
  toggle(item: T): void;
  getIsVisible(item: T): boolean;
  getDef(item: T): ISdExpandItemDef<T>;
}
```

#### ISdExpandItemDef

```typescript
interface ISdExpandItemDef<T> {
  item: T;
  parentDef: ISdExpandItemDef<T> | undefined;
  hasChildren: boolean;
  depth: number;
}
```

---

### SdSelectionManager

Manages single/multi selection state.

```typescript
class SdSelectionManager<T> {
  constructor(options: {
    displayItems: Signal<T[]>;
    selectedItems: WritableSignal<T[]>;
    selectMode: Signal<"single" | "multi" | "none" | undefined>;
    getItemSelectableFn: Signal<((item: T) => boolean | string) | undefined>;
  });

  hasSelectable: Signal<boolean>;
  isAllSelected: Signal<boolean>;

  toggleAll(): void;
  select(item: T): void;
  deselect(item: T): void;
  toggle(item: T): void;
  getIsSelected(item: T): boolean;
  getSelectable(item: T): true | string | undefined;
  getCanChangeFn(item: T): () => boolean;
}
```

---

### SdSortingManager

Manages multi-column sort state with toggle cycling (asc -> desc -> remove).

```typescript
class SdSortingManager {
  constructor(options: { sorts: WritableSignal<ISdSortingDef[]> });

  defMap: Signal<Map<string, { indexText: string | undefined; desc: boolean }>>;

  toggle(key: string, multiple: boolean): void;
  sort<T>(items: T[]): T[];
}
```

#### ISdSortingDef

```typescript
interface ISdSortingDef {
  key: string;
  desc: boolean;
}
```

---

## Styling

### setSafeStyle

Applies multiple CSS style properties via Angular's `Renderer2`.

```typescript
function setSafeStyle(
  renderer: Renderer2,
  el: HTMLElement,
  style: Partial<CSSStyleDeclaration>,
): void;
```

---

### TDirectiveInputSignals

Utility type that extracts all `InputSignal` properties from a component/directive class and maps them to their value types.

```typescript
type TDirectiveInputSignals<T> = TUndefToOptional<{
  [P in keyof T as T[P] extends InputSignal<any> ? P : never]:
    T[P] extends InputSignal<any> ? ReturnType<T[P]> : never;
}>;
```

---

## Transforms

### transformBoolean

Input transform that converts `boolean | "" | undefined` to `boolean`. Used with `input(..., { transform: transformBoolean })`.

```typescript
function transformBoolean(value: boolean | "" | undefined): boolean;
```

Returns `true` when value is not `null`, not `undefined`, and not `false`. Empty string `""` returns `true` (for attribute-style usage like `<div disabled>`).

---

### transformNullableBoolean

Input transform that preserves `undefined` as a distinct state.

```typescript
function transformNullableBoolean(value: boolean | "" | undefined): boolean | undefined;
```

Returns `undefined` when value is `null` or `undefined`. Otherwise returns `value !== false`.

---

## Setup Functions

### setupBgTheme

Sets the page background color via CSS custom property `--background-color`. Cleans up on destroy.

```typescript
function setupBgTheme(options?: {
  theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray";
  lightness?: "lightest" | "lighter";
}): void;
```

---

### setupCanDeactivate

Registers a deactivation guard for routes or modals. Supports both `ActivatedRoute` (route guard) and `SdActivatedModalProvider` (modal close guard).

```typescript
function setupCanDeactivate(fn: () => boolean): void;
```

---

### setupCloserWhenSingleSelectionChange

Automatically closes a select modal when a single selection changes. Used internally by data select components.

```typescript
function setupCloserWhenSingleSelectionChange<TKey, TItem>(bindings: {
  selectedItemKeys: Signal<TKey[]>;
  selectedItems: Signal<TItem[]>;
  selectMode: () => "single" | "multi" | undefined;
  close: OutputEmitterRef<ISelectModalOutputResult<TItem>>;
}): void;
```

---

### setupCumulateSelectedKeys

Two-way synchronization between `selectedItems` and `selectedItemKeys` signals. Handles cumulative selection across data loads.

```typescript
function setupCumulateSelectedKeys<T, K>(options: {
  items: Signal<T[]>;
  selectedItems: WritableSignal<T[]>;
  selectedItemKeys: WritableSignal<K[]>;
  selectMode: () => "single" | "multi" | undefined;
  keySelectorFn: (item: T, index: number) => K;
}): void;
```

---

### setupInvalid

Adds a visual validation indicator (colored dot) and a hidden form input for native form validation. Automatically updates validity state.

```typescript
function setupInvalid(getInvalidMessage: () => string): void;
```

---

### setupModelHook

Hooks into a model signal's `set` method to add a guard function. The guard can be sync (`boolean`) or async (`Promise<boolean>`).

```typescript
function setupModelHook<T, S extends WritableSignal<T>>(
  model: S,
  canFn: Signal<(item: T) => boolean | Promise<boolean>>,
): void;
```

---

### setupRevealOnShow

Applies a reveal animation (opacity + translate) when the element enters the viewport via `IntersectionObserver`.

```typescript
function setupRevealOnShow(optFn?: () => {
  type?: "l2r" | "t2b";
  enabled?: boolean;
}): void;
```

---

### setupRipple

Adds a Material Design ripple effect to the host element. Listens for pointer events and creates an animated overlay.

```typescript
function setupRipple(enableFn?: () => boolean): void;
```

---

## Signal Hooks

### useCurrentPageCodeSignal

Returns a signal of the current page's dot-separated code derived from the activated route path.

```typescript
function useCurrentPageCodeSignal(): Signal<string> | undefined;
```

---

### useFullPageCodeSignal

Returns a signal of the full page code derived from the router URL (not the activated route).

```typescript
function useFullPageCodeSignal(): Signal<string>;
```

---

### useParamMapSignal

Returns the route `paramMap` as a signal.

```typescript
function useParamMapSignal(): Signal<ParamMap> | undefined;
```

---

### useQueryParamMapSignal

Returns the route `queryParamMap` as a signal.

```typescript
function useQueryParamMapSignal(): Signal<ParamMap> | undefined;
```

---

### useSdSystemConfigResource

Creates a resource that auto-loads and auto-saves system config values keyed by `{elementTag}.{key}`.

```typescript
function useSdSystemConfigResource<T>(options: {
  key: Signal<string | undefined>;
}): ResourceRef<T | undefined>;
```

---

### useViewTitleSignal

Returns a signal with the current view's title, derived from the modal title or app structure.

```typescript
function useViewTitleSignal(): Signal<string>;
```

---

### useViewTypeSignal

Returns a signal indicating the current view type: `"page"` (route component), `"modal"` (inside a modal), or `"control"` (embedded).

```typescript
function useViewTypeSignal(getComp: () => any): Signal<TSdViewType>;

type TSdViewType = "page" | "modal" | "control";
```
