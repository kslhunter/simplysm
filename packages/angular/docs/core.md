# Core

Providers, plugins, directives, pipes, and utility functions that form the foundation of the `@simplysm/angular` framework.

## `TXT_CHANGE_IGNORE_CONFIRM`

Korean string constant used for "ignore unsaved changes?" confirmation dialogs.

```typescript
const TXT_CHANGE_IGNORE_CONFIRM: string;
```

## `provideSdAngular`

Bootstraps all core Angular providers for a Simplysm application.

```typescript
function provideSdAngular(opt: { clientName: string }): EnvironmentProviders;
```

Registers: `IMAGE_CONFIG`, NgIcons, theme/local-storage initialization, global error handler, 6 event/command plugins, zoneless change detection, service worker update poller (5 min interval), and router navigation busy counter.

## `SdAngularConfigProvider`

Global configuration holder for the application client name.

```typescript
@Injectable({ providedIn: "root" })
class SdAngularConfigProvider {
  clientName: string;
}
```

## `SdThemeProvider`

Dark/light theme toggle. When `dark` is `true`, the `sd-theme-dark` class is applied to `<body>`.

```typescript
@Injectable({ providedIn: "root" })
class SdThemeProvider {
  dark: WritableSignal<boolean>;
}
```

## `SdSystemLogProvider`

Centralized logging service.

```typescript
@Injectable({ providedIn: "root" })
class SdSystemLogProvider {
  writeFn?: (severity: "error" | "warn" | "log", ...data: any[]) => Promise<void> | void;
  async writeAsync(severity: "error" | "warn" | "log", ...data: any[]): Promise<void>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `writeFn` | `((severity, ...data) => Promise<void> \| void) \| undefined` | Optional external log handler |

## `SdAppStructureProvider`

Abstract provider that maps application structure (menus, permissions) from a declarative item tree.

```typescript
@Injectable({ providedIn: "root" })
abstract class SdAppStructureProvider<TModule> {
  abstract items: TSdAppStructureItem<TModule>[];
  abstract usableModules: Signal<TModule[] | undefined>;
  abstract permRecord: Signal<Record<string, boolean> | undefined>;

  usableMenus: Signal<ISdMenu<TModule>[]>;
  usableFlatMenus: Signal<ISdFlatMenu<TModule>[]>;
  getPermissionsByStructure(items: TSdAppStructureItem<TModule>[], codeChain?: string[]): ISdPermission<TModule>[];
  getTitleByFullCode(fullCode: string): string;
  getItemChainByFullCode(fullCode: string): TSdAppStructureItem<TModule>[];
  getPermsByFullCode<K extends string>(fullCodes: string[], permKeys: K[]): K[];
}
```

## `SdAppStructureUtils`

Static utility class for app structure operations without provider injection.

```typescript
abstract class SdAppStructureUtils {
  static getTitleByFullCode<TModule>(items: TSdAppStructureItem<TModule>[], fullCode: string): string;
  static getPermsByFullCode<TModule, K extends string>(items: TSdAppStructureItem<TModule>[], fullCodes: string[], permKeys: K[], permRecord: Record<string, boolean>): K[];
  static getItemChainByFullCode<TModule>(items: TSdAppStructureItem<TModule>[], fullCode: string): TSdAppStructureItem<TModule>[];
  static getMenus<TModule>(items: TSdAppStructureItem<TModule>[], codeChain: string[], usableModules: TModule[] | undefined, permRecord: Record<string, boolean> | undefined): ISdMenu<TModule>[];
  static getFlatMenus<TModule>(items: TSdAppStructureItem<TModule>[], usableModules: TModule[] | undefined, permRecord: Record<string, boolean> | undefined): ISdFlatMenu<TModule>[];
  static getPermissions<TModule>(items: TSdAppStructureItem<TModule>[], codeChain: string[], usableModules: TModule[] | undefined): ISdPermission<TModule>[];
  static getFlatPermissions<TModule>(items: TSdAppStructureItem<TModule>[], usableModules: TModule[] | undefined): ISdFlatPermission<TModule>[];
}
```

## `TSdAppStructureItem`

Discriminated union for app structure tree nodes.

```typescript
type TSdAppStructureItem<TModule> = ISdAppStructureGroupItem<TModule> | ISdAppStructureLeafItem<TModule>;
```

## `ISdMenu`

```typescript
interface ISdMenu<TModule> {
  title: string;
  codeChain: string[];
  icon: string | undefined;
  modules: TModule[] | undefined;
  children: ISdMenu<TModule>[] | undefined;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Menu display text |
| `codeChain` | `string[]` | Hierarchical code path |
| `icon` | `string \| undefined` | Icon SVG string |
| `modules` | `TModule[] \| undefined` | Required modules for visibility |
| `children` | `ISdMenu<TModule>[] \| undefined` | Sub-menus |

## `ISdFlatMenu`

```typescript
interface ISdFlatMenu<TModule> {
  titleChain: string[];
  codeChain: string[];
  modulesChain: TModule[][];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `titleChain` | `string[]` | Flattened title breadcrumb |
| `codeChain` | `string[]` | Flattened code path |
| `modulesChain` | `TModule[][]` | Module requirements per level |

## `ISdPermission`

```typescript
interface ISdPermission<TModule> {
  title: string;
  codeChain: string[];
  modules: TModule[] | undefined;
  perms: ("use" | "edit")[] | undefined;
  children: ISdPermission<TModule>[] | undefined;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Permission display text |
| `codeChain` | `string[]` | Hierarchical code path |
| `modules` | `TModule[] \| undefined` | Required modules |
| `perms` | `("use" \| "edit")[] \| undefined` | Permission keys |
| `children` | `ISdPermission<TModule>[] \| undefined` | Sub-permissions |

## `ISdFlatPermission`

```typescript
interface ISdFlatPermission<TModule> {
  titleChain: string[];
  codeChain: string[];
  modulesChain: TModule[][];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `titleChain` | `string[]` | Flattened title breadcrumb |
| `codeChain` | `string[]` | Flattened code path |
| `modulesChain` | `TModule[][]` | Module requirements per level |

## `usePermsSignal`

Reactive permission checker as a computed signal.

```typescript
function usePermsSignal<K extends string>(viewCodes: string[], keys: K[]): Signal<K[]>;
```

Returns a signal containing the subset of `keys` the current user has permission for across the given `viewCodes`.

## `SdFileDialogProvider`

Opens a native file picker dialog via a hidden `<input type="file">`.

```typescript
@Injectable({ providedIn: "root" })
class SdFileDialogProvider {
  async showAsync(multiple?: false, accept?: string): Promise<File | undefined>;
  async showAsync(multiple: true, accept?: string): Promise<File[] | undefined>;
}
```

## `SdLocalStorageProvider`

Typed wrapper around `localStorage` with `clientName`-prefixed keys and JSON serialization.

```typescript
@Injectable({ providedIn: "root" })
class SdLocalStorageProvider<T> {
  set<K extends keyof T & string>(key: K, value: T[K]): void;
  get<K extends keyof T & string>(key: K): T[K] | undefined;
  remove(key: keyof T & string): void;
}
```

## `SdSystemConfigProvider`

Async config storage abstraction. Falls back to local storage when no external handler is set.

```typescript
@Injectable({ providedIn: "root" })
class SdSystemConfigProvider<T> {
  fn?: {
    set<K extends keyof T & string>(key: K, data: T[K]): Promise<void> | void;
    get(key: keyof T & string): PromiseLike<any>;
  };
  async setAsync<K extends keyof T & string>(key: K, data: T[K]): Promise<void>;
  async getAsync(key: keyof T & string): Promise<any>;
}
```

## `SdServiceClientFactoryProvider`

Manages `ServiceClient` connections by key.

```typescript
@Injectable({ providedIn: "root" })
class SdServiceClientFactoryProvider {
  async connectAsync(key: string, options?: Partial<ServiceConnectionOptions>): Promise<void>;
  async closeAsync(key: string): Promise<void>;
  get(key: string): ServiceClient;
}
```

## `SdSharedDataProvider`

Abstract provider for shared (cached, event-driven) data. Subclass and register data sources.

```typescript
@Injectable()
abstract class SdSharedDataProvider<T extends Record<string, ISharedDataBase<string | number>>> {
  loadingCount: WritableSignal<number>;
  abstract initialize(): void;
  register<K extends string & keyof T>(name: K, info: ISharedDataInfo<T[K]>): void;
  getHandle<K extends string & keyof T>(name: K): SharedDataHandle<T[K]>;
  async emitAsync<K extends string & keyof T>(name: K, changeKeys?: (string | number)[]): Promise<void>;
  async wait(): Promise<void>;
}
```

## `SdSharedDataChangeEvent`

Event definition for shared data change notifications across service connections.

```typescript
const SdSharedDataChangeEvent: EventDef<{ name: string; filter: unknown }, (string | number)[] | undefined>;
```

## `ISharedDataBase`

Base interface for shared data items.

```typescript
interface ISharedDataBase<TKey extends string | number> {
  __valueKey: TKey;
  __searchText: string;
  __isHidden: boolean;
  __parentKey?: TKey;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `__valueKey` | `TKey` | Unique identifier |
| `__searchText` | `string` | Text used for search filtering |
| `__isHidden` | `boolean` | Whether the item is hidden from display |
| `__parentKey` | `TKey \| undefined` | Parent key for tree hierarchy |

## `ISharedDataInfo`

Registration descriptor for a shared data source.

```typescript
interface ISharedDataInfo<T extends ISharedDataBase<string | number>> {
  serviceKey: string;
  getter: (changeKeys?: (string | number)[]) => Promise<T[]>;
  filter?: unknown;
  orderBy?: (a: T, b: T) => number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `serviceKey` | `string` | Service connection key |
| `getter` | `(changeKeys?) => Promise<T[]>` | Data fetch function; receives changed keys for incremental update |
| `filter` | `unknown` | Optional filter passed to the service event |
| `orderBy` | `((a, b) => number) \| undefined` | Optional sort comparator |

## `SharedDataHandle`

Read handle returned by `SdSharedDataProvider.getHandle()`.

```typescript
interface SharedDataHandle<T extends ISharedDataBase<string | number>> {
  items: Signal<T[]>;
  get(key: T["__valueKey"] | undefined): T | undefined;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `items` | `Signal<T[]>` | Reactive list of all items |
| `get` | `(key) => T \| undefined` | Lookup a single item by key |

## `SdNavigateWindowProvider`

Manages new-window navigation with auto-close on parent `beforeunload`.

```typescript
@Injectable({ providedIn: "root" })
class SdNavigateWindowProvider {
  get isWindow(): boolean;
  open(navigate: string, params?: Record<string, string>, features?: string): void;
}
```

## `SdPrintProvider`

Dynamically renders a component for printing or PDF generation.

```typescript
@Injectable({ providedIn: "root" })
class SdPrintProvider {
  async printAsync<T extends ISdPrint>(template: ISdPrintInput<T>, options?: { size?: string; margin?: string }): Promise<void>;
  async getPdfBufferAsync<T extends ISdPrint>(template: ISdPrintInput<T>, options?: { orientation?: "portrait" | "landscape"; pageSize?: string }): Promise<Uint8Array>;
}
```

## `ISdPrint`

Contract for printable components.

```typescript
interface ISdPrint {
  initialized: Signal<boolean>;
}
```

## `ISdPrintInput`

Input descriptor for `SdPrintProvider`.

```typescript
interface ISdPrintInput<T, X extends keyof any = ""> {
  type: Type<T>;
  inputs: Omit<TDirectiveInputSignals<T>, X>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `Type<T>` | Component class to render |
| `inputs` | `Omit<TDirectiveInputSignals<T>, X>` | Input values to set on the component |

## `SdGlobalErrorHandlerPlugin`

Global error handler that logs via `SdSystemLogProvider`, shows a full-screen error overlay, and reloads on click.

```typescript
@Injectable({ providedIn: null })
class SdGlobalErrorHandlerPlugin implements ErrorHandler {
  handleError(event: any): void;
}
```

## `SdOptionEventPlugin`

Event plugin that adds `.capture`, `.passive`, `.once` suffix support to native DOM events.

```typescript
@Injectable({ providedIn: null })
class SdOptionEventPlugin extends EventManagerPlugin {
  supports(eventName: string): boolean;
  addEventListener(element: HTMLElement, eventName: string, handler: Function): () => void;
}
```

## `SdResizeEventPlugin`

Event plugin for the `sdResize` custom event using `ResizeObserver`.

```typescript
@Injectable({ providedIn: null })
class SdResizeEventPlugin extends EventManagerPlugin {
  supports(eventName: string): boolean;
  addEventListener(element: HTMLElement, eventName: string, handler: Function): () => void;
}
```

## `ISdResizeEvent`

```typescript
interface ISdResizeEvent {
  heightChanged: boolean;
  widthChanged: boolean;
  target: Element;
  contentRect: DOMRectReadOnly;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `heightChanged` | `boolean` | Whether height changed |
| `widthChanged` | `boolean` | Whether width changed |
| `target` | `Element` | Observed element |
| `contentRect` | `DOMRectReadOnly` | New content rect |

## `SdIntersectionEventPlugin`

Event plugin for the `sdIntersection` custom event using `IntersectionObserver`.

```typescript
@Injectable({ providedIn: null })
class SdIntersectionEventPlugin extends EventManagerPlugin {
  supports(eventName: string): boolean;
  addEventListener(element: HTMLElement, eventName: string, handler: Function): () => void;
}
```

## `ISdIntersectionEvent`

```typescript
interface ISdIntersectionEvent {
  entry: IntersectionObserverEntry;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `entry` | `IntersectionObserverEntry` | Intersection observer entry |

## `SdSaveCommandEventPlugin`

Event plugin for `sdSaveCommand` — fires on `Ctrl+S` (no Alt/Shift). Scoped to the topmost open modal.

```typescript
@Injectable({ providedIn: null })
class SdSaveCommandEventPlugin extends EventManagerPlugin { }
```

## `SdRefreshCommandEventPlugin`

Event plugin for `sdRefreshCommand` — fires on `Ctrl+Alt+L`.

```typescript
@Injectable({ providedIn: null })
class SdRefreshCommandEventPlugin extends EventManagerPlugin { }
```

## `SdInsertCommandEventPlugin`

Event plugin for `sdInsertCommand` — fires on `Ctrl+Insert`.

```typescript
@Injectable({ providedIn: null })
class SdInsertCommandEventPlugin extends EventManagerPlugin { }
```

## `SdEventsDirective`

Directive that exposes captured/passive/once event variants and custom events as Angular outputs.

```typescript
@Directive({ standalone: true })
class SdEventsDirective {
  // Outputs include:
  // "click.capture", "click.once", "click.capture.once",
  // "mousedown.capture", "mouseup.capture", "mouseover.capture", "mouseout.capture",
  // "keydown.capture", "keyup.capture", "focus.capture", "blur.capture",
  // "invalid.capture", "scroll.capture", "scroll.passive", "scroll.capture.passive",
  // "wheel.passive", "wheel.capture.passive",
  // "touchstart.passive", "touchstart.capture.passive",
  // "touchmove.passive", "touchmove.capture.passive",
  // "touchend.passive", "dragover.capture", "dragenter.capture",
  // "dragleave.capture", "drop.capture",
  // "transitionend.once", "animationend.once",
  // "sdResize", "sdRefreshCommand", "sdSaveCommand", "sdInsertCommand"
}
```

## `SdRippleDirective`

Applies a material-style ripple effect to the host element.

```typescript
@Directive({ standalone: true, selector: "[sd-ripple]" })
class SdRippleDirective {
  enabled: InputSignal<boolean>; // alias: "sd-ripple"
}
```

## `SdShowEffectDirective`

Applies an entrance animation (fade + slide) when the host element enters the viewport.

```typescript
@Directive({ standalone: true, selector: "[sd-show-effect]" })
class SdShowEffectDirective {
  enabled: InputSignal<boolean>; // alias: "sd-show-effect"
  sdShowEffectType: InputSignal<"l2r" | "t2b">; // default: "t2b"
}
```

## `SdInvalidDirective`

Adds a validation indicator dot and hidden `<input>` with `setCustomValidity` to the host element.

```typescript
@Directive({ standalone: true, selector: "[sd-invalid]" })
class SdInvalidDirective {
  invalidMessage: InputSignal<string>; // alias: "sd-invalid"
}
```

## `SdTypedTemplateDirective`

Provides type-safe template context via Angular's `ngTemplateContextGuard`.

```typescript
@Directive({ standalone: true, selector: "ng-template[typed]" })
class SdTypedTemplateDirective<T> {
  typed: InputSignal<T>;
  static ngTemplateContextGuard<TypeToken>(dir: SdTypedTemplateDirective<TypeToken>, ctx: unknown): ctx is TypeToken;
}
```

## `SdItemOfTemplateDirective`

Template directive for typed item iteration with context.

```typescript
@Directive({ standalone: true, selector: "ng-template[itemOf]" })
class SdItemOfTemplateDirective<TItem> {
  itemOf: InputSignal<TItem[]>;
  static ngTemplateContextGuard<TContextItem>(dir: SdItemOfTemplateDirective<TContextItem>, ctx: unknown): ctx is SdItemOfTemplateContext<TContextItem>;
}
```

## `SdItemOfTemplateContext`

```typescript
interface SdItemOfTemplateContext<TItem> {
  $implicit: TItem;
  item: TItem;
  index: number;
  depth: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `$implicit` | `TItem` | Current item (default template variable) |
| `item` | `TItem` | Current item (named) |
| `index` | `number` | Item index |
| `depth` | `number` | Nesting depth (for tree structures) |

## `SdRouterLinkDirective`

Enhanced router link with support for Ctrl/Shift-click (new tab), window popup mode, and outlet navigation.

```typescript
@Directive({ standalone: true, selector: "[sd-router-link]" })
class SdRouterLinkDirective {
  option: InputSignal<{
    link: string;
    params?: Record<string, string>;
    window?: { width?: number; height?: number };
    outletName?: string;
    queryParams?: Record<string, string>;
  } | undefined>; // alias: "sd-router-link"
}
```

## `FormatPipe`

Pipe that formats `DateTime`, `DateOnly`, or `string` values.

```typescript
@Pipe({ name: "format", standalone: true })
class FormatPipe implements PipeTransform {
  transform(value: string | DateTime | DateOnly | undefined, format: string): string;
}
```

- `DateTime`/`DateOnly`: calls `toFormatString(format)`
- `string`: applies `X`-placeholder pattern matching (patterns separated by `|`)
- `undefined`: returns `""`

## `setSafeStyle`

Applies multiple CSS style properties at once via `Renderer2.setStyle`.

```typescript
function setSafeStyle(renderer: Renderer2, el: HTMLElement, style: Partial<CSSStyleDeclaration>): void;
```

## `setupBgTheme`

Sets the body `--background-color` CSS variable to a theme token during component lifetime.

```typescript
function setupBgTheme(options?: {
  theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray";
  lightness?: "lightest" | "lighter";
}): void;
```

## `setupRipple`

Attaches ripple effect event handlers to the current component's host element.

```typescript
function setupRipple(enableFn?: () => boolean): void;
```

## `setupRevealOnShow`

Applies an IntersectionObserver-driven entrance animation to the component host.

```typescript
function setupRevealOnShow(optFn?: () => { type?: "l2r" | "t2b"; enabled?: boolean }): void;
```

## `setupInvalid`

Injects a validation indicator and hidden input with custom validity into the host element.

```typescript
function setupInvalid(getInvalidMessage: () => string): void;
```

## `setupModelHook`

Intercepts `WritableSignal.set` to guard value changes with a sync or async predicate.

```typescript
function setupModelHook<T, S extends WritableSignal<T>>(model: S, canFn: Signal<(item: T) => boolean | Promise<boolean>>): void;
```

## `setupCanDeactivate`

Registers a deactivation guard on the current modal or route.

```typescript
function setupCanDeactivate(fn: () => boolean): void;
```

## `setupCumulateSelectedKeys`

Keeps `selectedItems` and `selectedItemKeys` in sync as the `items` list changes.

```typescript
function setupCumulateSelectedKeys<TItem, TKey>(options: {
  items: Signal<TItem[]>;
  selectedItems: WritableSignal<TItem[]>;
  selectedItemKeys: WritableSignal<TKey[]>;
  selectMode: () => "single" | "multi" | undefined;
  keySelectorFn: (item: TItem) => TKey | undefined;
}): void;
```

## `setupCloserWhenSingleSelectionChange`

Auto-emits `close` when selection changes in single-select mode.

```typescript
function setupCloserWhenSingleSelectionChange<TItem, TKey>(options: {
  selectedItemKeys: Signal<TKey[]>;
  selectedItems: Signal<TItem[]>;
  selectMode: () => "single" | "multi" | undefined;
  close: OutputEmitterRef<{ selectedItemKeys: TKey[]; selectedItems: TItem[] }>;
}): void;
```

## `useSdSystemConfigResource`

Angular `resource` wrapper backed by `SdSystemConfigProvider`.

```typescript
function useSdSystemConfigResource<T>(options: {
  key: Signal<string | undefined>;
}): {
  value: Signal<T | undefined>;
  isLoading: Signal<boolean>;
  status: Signal<ResourceStatus>;
  hasValue(): boolean;
  reload(): void;
  set(value: T): void;
  update(fn: (prev: T | undefined) => T): void;
};
```

## `useCurrentPageCodeSignal`

Returns a signal with the current route's page code (dot-separated path segments).

```typescript
function useCurrentPageCodeSignal(): Signal<string> | undefined;
```

## `useFullPageCodeSignal`

Returns a signal with the full URL path converted to dot-separated page code. Updates on `NavigationEnd`.

```typescript
function useFullPageCodeSignal(): Signal<string>;
```

## `useViewTitleSignal`

Returns the current view title from modal or app structure.

```typescript
function useViewTitleSignal(): Signal<string>;
```

## `useViewTypeSignal`

Returns the current view context type.

```typescript
function useViewTypeSignal(getComp: () => object): Signal<TSdViewType>;
```

## `TSdViewType`

```typescript
type TSdViewType = "page" | "modal" | "control";
```

## `useExpandingManager`

Manages tree expand/collapse state for hierarchical item lists.

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

## `IExpandItemDef`

```typescript
interface IExpandItemDef<T> {
  item: T;
  parentDef: IExpandItemDef<T> | undefined;
  hasChildren: boolean;
  depth: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `item` | `T` | The data item |
| `parentDef` | `IExpandItemDef<T> \| undefined` | Parent node definition |
| `hasChildren` | `boolean` | Whether this node has children |
| `depth` | `number` | Nesting depth (0-based) |

## `useSelectionManager`

Manages item selection state with single/multi mode support.

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

Manages multi-column sorting state with toggle behavior.

```typescript
function useSortingManager(options: {
  sorts: WritableSignal<ISortingDef[]>;
}): {
  defMap: Signal<Map<string, { indexText?: string; desc: boolean }>>;
  toggle(key: string, multiple: boolean): void;
  sort<T>(items: T[]): T[];
};
```

- `toggle`: cycles none → asc → desc → remove. `multiple` preserves existing sorts.
- `sort`: sorts items by current `sorts` definitions. Strings use `localeCompare`; nulls sort first.

## `ISortingDef`

```typescript
interface ISortingDef {
  key: string;
  desc: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Property name to sort by |
| `desc` | `boolean` | Descending order when `true` |

## `injectParent`

Traverses the Angular component tree to find a parent component instance.

```typescript
function injectParent(): unknown;
function injectParent<T>(type: AbstractType<T>): T;
function injectParent<T>(type: AbstractType<T>, options: { optional: true }): T | undefined;
```

## `TDirectiveInputSignals`

Extracts input signal value types from a component/directive class, converting `undefined`-accepting inputs to optional properties.

```typescript
type TDirectiveInputSignals<T> = /* mapped type extracting InputSignal value types with TUndefToOptional */;
```

Example: `{ name = input.required<string>(); age = input(0) }` → `{ name: string; age: number }`

## `TUndefToOptional`

Converts properties whose type includes `undefined` to optional properties.

```typescript
type TUndefToOptional<T> = /* { a: string; b: number | undefined } → { a: string; b?: number } */;
```

## `TWithOptional`

Converts specified keys of a type to optional.

```typescript
type TWithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
```

## `withBusy`

Wraps an async function with a busy signal increment/decrement. Increments `busyCount` before execution and decrements in `finally`.

```typescript
async function withBusy(
  busyCount: WritableSignal<number>,
  fn: () => Promise<void>,
): Promise<void>;
```

## `mark`

Manually notifies signal consumers of a change. Useful when an object/array is mutated in place rather than replaced.

```typescript
function mark(sig: WritableSignal<any>, clone?: boolean): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `sig` | `WritableSignal<any>` | The signal to mark as changed |
| `clone` | `boolean` (optional) | If `true`, performs a shallow clone via `update()` (array spread or object spread). If `false`/omitted, directly increments the signal version using Angular internal primitives (`producerIncrementEpoch`, `producerNotifyConsumers`). |

## `setupModelHook`

Intercepts a `WritableSignal.set` to guard value changes with a sync/async predicate.

```typescript
function setupModelHook<T, S extends WritableSignal<T>>(
  model: S,
  canFn: Signal<(item: T) => boolean | Promise<boolean>>,
): void;
```
