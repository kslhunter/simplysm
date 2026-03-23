# Core - Providers

## App Providers

### SdAngularConfigProvider

**Type:** `@Injectable({ providedIn: "root" })`

Holds the application-wide configuration. Configured by `provideSdAngular()`.

| Field | Type | Description |
|-------|------|-------------|
| `clientName` | `string` | Application name, used as localStorage key prefix |
| `defaultTheme` | `TSdTheme` | Default theme (`"compact"`, `"mobile"`, `"kiosk"`) |
| `defaultDark` | `boolean` | Default dark mode state |

---

### SdAppStructureProvider

**Type:** `@Injectable({ providedIn: "root" })` (abstract)

Manages the application's menu and permission hierarchy. Subclass this to provide your app's structure.

| Abstract Member | Type | Description |
|-----------------|------|-------------|
| `items` | `TSdAppStructureItem<TModule>[]` | Full app structure tree |
| `usableModules` | `Signal<TModule[] \| undefined>` | Currently available modules |
| `permRecord` | `Signal<Record<string, boolean> \| undefined>` | Permission key-value record |

| Computed Property | Type | Description |
|-------------------|------|-------------|
| `usableMenus` | `Signal<ISdMenu<TModule>[]>` | Filtered menu tree |
| `usableFlatMenus` | `Signal<ISdFlatMenu<TModule>[]>` | Flattened filtered menu list |

| Method | Signature | Description |
|--------|-----------|-------------|
| `getPermissionsByStructure` | `(items, codeChain?) => ISdPermission[]` | Get permissions for structure items |
| `getTitleByFullCode` | `(fullCode: string) => string` | Get display title by full code |
| `getItemChainByFullCode` | `(fullCode: string) => TSdAppStructureItem[]` | Get item chain by full code |
| `getPermsByFullCode` | `(fullCodes, permKeys) => K[]` | Get active permissions for view codes |

#### usePermsSignal

```typescript
function usePermsSignal<K extends string>(
  viewCodes: string[],
  keys: K[],
): Signal<K[]>;
```

Injection helper that returns a signal of active permission keys for the given view codes.

---

### SdAppStructureUtils

Static utility class with methods for menu/permission operations on structure items.

| Static Method | Signature | Description |
|---------------|-----------|-------------|
| `getTitleByFullCode` | `(items, fullCode) => string` | Formatted title with parent chain |
| `getPermsByFullCode` | `(items, fullCodes, permKeys, permRecord) => K[]` | Active permissions for codes |
| `getItemChainByFullCode` | `(items, fullCode) => TSdAppStructureItem[]` | Item chain from root to target |
| `getMenus` | `(items, codeChain, usableModules, permRecord) => ISdMenu[]` | Filtered menu tree |
| `getFlatMenus` | `(items, usableModules, permRecord) => ISdFlatMenu[]` | Flattened menu list |
| `getPermissions` | `(items, codeChain, usableModules) => ISdPermission[]` | Permission tree |
| `getFlatPermissions` | `(items, usableModules) => ISdFlatPermission[]` | Flattened permission list |

---

### TSdAppStructureItem

```typescript
type TSdAppStructureItem<TModule = unknown> =
  | ISdAppStructureGroupItem<TModule>
  | ISdAppStructureLeafItem<TModule>;
```

**Group item fields:** `code`, `title`, `modules?`, `requiredModules?`, `icon?`, `children`

**Leaf item fields:** `code`, `title`, `modules?`, `requiredModules?`, `perms?`, `subPerms?`, `icon?`, `isNotMenu?`

---

### ISdMenu

```typescript
interface ISdMenu<TModule = unknown> {
  title: string;
  codeChain: string[];
  icon: string | undefined;
  modules: TModule[] | undefined;
  children: ISdMenu<TModule>[] | undefined;
}
```

### ISdFlatMenu

```typescript
interface ISdFlatMenu<TModule = unknown> {
  titleChain: string[];
  codeChain: string[];
  modulesChain: TModule[][];
}
```

### ISdPermission

```typescript
interface ISdPermission<TModule = unknown> {
  title: string;
  codeChain: string[];
  modules: TModule[] | undefined;
  perms: ("use" | "edit")[] | undefined;
  children: ISdPermission<TModule>[] | undefined;
}
```

### ISdFlatPermission

```typescript
interface ISdFlatPermission<TModule = unknown> {
  titleChain: string[];
  codeChain: string[];
  modulesChain: TModule[][];
}
```

---

### SdSystemConfigProvider

**Type:** `@Injectable({ providedIn: "root" })`

Typed system configuration storage. Can use either localStorage (default) or a custom remote backend.

| Field | Type | Description |
|-------|------|-------------|
| `fn` | `{ set, get }` | Optional custom storage backend |

| Method | Signature | Description |
|--------|-----------|-------------|
| `setAsync` | `<K>(key: K, data: T[K]) => Promise<void>` | Store a config value |
| `getAsync` | `(key: string) => Promise<any>` | Retrieve a config value |

---

### SdSystemLogProvider

**Type:** `@Injectable({ providedIn: "root" })`

System log writer. Logs to console and optionally to a custom backend.

| Field | Type | Description |
|-------|------|-------------|
| `writeFn` | `(severity, ...data) => Promise<void> \| void` | Optional remote log handler |

| Method | Signature | Description |
|--------|-----------|-------------|
| `writeAsync` | `(severity: "error" \| "warn" \| "log", ...data: any[]) => Promise<void>` | Write a log entry |

---

## Integration Providers

### SdFileDialogProvider

**Type:** `@Injectable({ providedIn: "root" })`

Opens a native file selection dialog.

| Method | Signature | Description |
|--------|-----------|-------------|
| `showAsync` | `(multiple?: false, accept?: string) => Promise<File \| undefined>` | Single file selection |
| `showAsync` | `(multiple: true, accept?: string) => Promise<File[] \| undefined>` | Multiple file selection |

---

### SdNavigateWindowProvider

**Type:** `@Injectable({ providedIn: "root" })`

Manages opening routes in new windows or tabs.

| Property | Type | Description |
|----------|------|-------------|
| `isWindow` | `boolean` (readonly) | Whether the current page is running as a popup window |

| Method | Signature | Description |
|--------|-----------|-------------|
| `open` | `(navigate: string, params?: Record<string, string>, features?: string) => void` | Open route in new window/tab |

---

### SdPrintProvider

**Type:** `@Injectable({ providedIn: "root" })`

Renders a component for printing or PDF export.

| Method | Signature | Description |
|--------|-----------|-------------|
| `printAsync` | `(template: ISdPrintInput<T>, options?) => Promise<void>` | Print a component via `window.print()` |
| `getPdfBufferAsync` | `(template: ISdPrintInput<T>, options?) => Promise<Buffer>` | Generate PDF buffer from a component |

#### ISdPrint

```typescript
interface ISdPrint {
  initialized: Signal<boolean>;
}
```

#### ISdPrintInput

```typescript
interface ISdPrintInput<T, X extends keyof any = ""> {
  type: Type<T>;
  inputs: Omit<TDirectiveInputSignals<T>, X>;
}
```

---

### SdServiceClientFactoryProvider

**Type:** `@Injectable({ providedIn: "root" })`

Factory for creating and managing WebSocket service client connections.

| Method | Signature | Description |
|--------|-----------|-------------|
| `connectAsync` | `(key: string, options?: Partial<ISdServiceConnectionConfig>) => Promise<void>` | Connect to a service server |
| `closeAsync` | `(key: string) => Promise<void>` | Close a connection |
| `get` | `(key: string) => SdServiceClient` | Get an active client by key |

Automatically handles:
- CSS hot reload (swaps stylesheet links)
- HMR (hot module replacement) on file changes
- Request/response progress toast notifications

---

## Storage Providers

### SdLocalStorageProvider

**Type:** `@Injectable({ providedIn: "root" })`

Typed wrapper around `localStorage`. Keys are prefixed with the `clientName`.

```typescript
class SdLocalStorageProvider<T> {
  set<K extends keyof T & string>(key: K, value: T[K]): void;
  get<K extends keyof T & string>(key: K): T[K] | undefined;
  remove(key: keyof T & string): void;
}
```

#### injectSdLocalStorage

```typescript
function injectSdLocalStorage<T>(): SdLocalStorageProvider<T>;
```

Typed injection helper for `SdLocalStorageProvider`.

---

### SdSharedDataProvider

**Type:** `@Injectable({ providedIn: "root" })` (abstract)

Real-time shared data manager that syncs data across clients via service events. Subclass this and call `register()` in `initialize()`.

| Abstract Method | Signature | Description |
|-----------------|-----------|-------------|
| `initialize` | `() => void` | Register shared data sources |

| Method | Signature | Description |
|--------|-----------|-------------|
| `register` | `(name, getter: ISharedDataInfo<T>) => void` | Register a data source |
| `getSignal` | `(name) => ISharedSignal<T>` | Get a reactive signal for data |
| `emitAsync` | `(name, changeKeys?) => Promise<void>` | Notify clients of data changes |
| `wait` | `() => Promise<void>` | Wait until all loading completes |

| Field | Type | Description |
|-------|------|-------------|
| `loadingCount` | `number` | Number of active loading operations |

#### ISharedSignal

```typescript
interface ISharedSignal<T extends ISharedDataBase<string | number>> extends Signal<T[]> {
  $get(key: T["__valueKey"] | undefined): T | undefined;
}
```

#### ISharedDataInfo

```typescript
interface ISharedDataInfo<T extends ISharedDataBase<string | number>> {
  serviceKey: string;
  getDataAsync: (changeKeys?: T["__valueKey"][]) => Promise<T[]>;
  orderBy: [(data: T) => any, "asc" | "desc"][];
  filter?: any;
}
```

#### ISharedDataBase

```typescript
interface ISharedDataBase<VK extends string | number> {
  __valueKey: VK;
  __searchText: string;
  __isHidden: boolean;
  __parentKey?: VK;
}
```

#### SdSharedDataChangeEvent

```typescript
class SdSharedDataChangeEvent extends SdServiceEventListenerBase<
  { name: string; filter: any },
  (string | number)[] | undefined
> {}
```

---

## Theme Provider

### SdThemeProvider

**Type:** `@Injectable({ providedIn: "root" })`

Manages the active visual theme and dark mode. Automatically applies CSS class to `document.body` and persists to localStorage.

| Signal | Type | Description |
|--------|------|-------------|
| `theme` | `SdWritableSignal<TSdTheme>` | Current theme |
| `dark` | `SdWritableSignal<boolean>` | Dark mode state |

CSS classes applied: `sd-theme-compact`, `sd-theme-mobile`, `sd-theme-kiosk`, `sd-theme-dark`

#### TSdTheme

```typescript
type TSdTheme = "compact" | "mobile" | "kiosk";
```
