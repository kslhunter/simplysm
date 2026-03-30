# Providers / Services

## `SdThemeProvider`

Injectable (root). Manages dark/light theme by toggling `sd-theme-dark` class on `document.body`.

```typescript
@Injectable({ providedIn: "root" })
class SdThemeProvider {
  dark: WritableSignal<boolean>;  // default: false
}
```

## `SdAngularConfigProvider`

Injectable (root). Holds the client application name set by `provideSdAngular`.

```typescript
@Injectable({ providedIn: "root" })
class SdAngularConfigProvider {
  clientName!: string;
}
```

## `SdSystemLogProvider`

Injectable (root). Writes log messages to console and optionally to a custom handler.

```typescript
@Injectable({ providedIn: "root" })
class SdSystemLogProvider {
  writeFn?: (severity: "error" | "warn" | "log", ...data: any[]) => Promise<void> | void;

  async writeAsync(severity: "error" | "warn" | "log", ...data: any[]): Promise<void>;
}
```

## `SdNavigateWindowProvider`

Injectable (root). Opens navigation links in new windows or tabs, with support for window features.

```typescript
@Injectable({ providedIn: "root" })
class SdNavigateWindowProvider {
  get isWindow(): boolean;
  open(navigate: string, params?: Record<string, string>, features?: string): void;
}
```

## `SdLocalStorageProvider`

Injectable (root). Typed localStorage wrapper that scopes keys by client name.

```typescript
@Injectable({ providedIn: "root" })
class SdLocalStorageProvider<T> {
  set<K extends keyof T & string>(key: K, value: T[K]): void;
  get<K extends keyof T & string>(key: K): T[K] | undefined;
  remove(key: keyof T & string): void;
}
```

## `SdSystemConfigProvider`

Injectable (root). Persists and retrieves system configuration via localStorage or a custom backend.

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

## `SdFileDialogProvider`

Injectable (root). Opens a native file picker dialog.

```typescript
@Injectable({ providedIn: "root" })
class SdFileDialogProvider {
  async showAsync(multiple?: false, accept?: string): Promise<File | undefined>;
  async showAsync(multiple: true, accept?: string): Promise<File[] | undefined>;
}
```

## `SdServiceClientFactoryProvider`

Injectable (root). Manages WebSocket-based service client connections.

```typescript
@Injectable({ providedIn: "root" })
class SdServiceClientFactoryProvider {
  async connectAsync(key: string, options?: Partial<ServiceConnectionOptions>): Promise<void>;
  async closeAsync(key: string): Promise<void>;
  get(key: string): ServiceClient;
}
```

## `SdAppStructureProvider`

Injectable (root, abstract). Provides application menu and permission structure. Subclass and implement `items`, `usableModules`, and `permRecord`.

```typescript
@Injectable({ providedIn: "root" })
abstract class SdAppStructureProvider<TModule = unknown> {
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

### `TSdAppStructureItem`

```typescript
type TSdAppStructureItem<TModule = unknown> =
  | ISdAppStructureGroupItem<TModule>
  | ISdAppStructureLeafItem<TModule>;
```

Group item fields:

| Field | Type | Description |
|-------|------|-------------|
| `code` | `string` | Unique code |
| `title` | `string` | Display title |
| `modules` | `TModule[]` | Optional: any-of module requirement (OR) |
| `requiredModules` | `TModule[]` | Optional: all-of module requirement (AND) |
| `icon` | `string` | Optional icon SVG |
| `children` | `TSdAppStructureItem<TModule>[]` | Child items |

Leaf item fields:

| Field | Type | Description |
|-------|------|-------------|
| `code` | `string` | Unique code |
| `title` | `string` | Display title |
| `modules` | `TModule[]` | Optional: any-of module requirement (OR) |
| `requiredModules` | `TModule[]` | Optional: all-of module requirement (AND) |
| `perms` | `("use" \| "edit")[]` | Optional permission keys |
| `subPerms` | `ISdAppStructureSubPermission<TModule>[]` | Optional sub-permissions |
| `icon` | `string` | Optional icon SVG |
| `isNotMenu` | `boolean` | Optional: exclude from menu |

### `ISdMenu`

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Display title |
| `codeChain` | `string[]` | Code path chain |
| `icon` | `string \| undefined` | Icon SVG |
| `modules` | `TModule[] \| undefined` | Modules |
| `children` | `ISdMenu<TModule>[] \| undefined` | Child menus |

### `ISdFlatMenu`

| Field | Type | Description |
|-------|------|-------------|
| `titleChain` | `string[]` | Title path chain |
| `codeChain` | `string[]` | Code path chain |
| `modulesChain` | `TModule[][]` | Module chain |

### `ISdPermission`

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Display title |
| `codeChain` | `string[]` | Code path chain |
| `modules` | `TModule[] \| undefined` | Modules |
| `perms` | `("use" \| "edit")[] \| undefined` | Permission keys |
| `children` | `ISdPermission<TModule>[] \| undefined` | Child permissions |

### `ISdFlatPermission`

| Field | Type | Description |
|-------|------|-------------|
| `titleChain` | `string[]` | Title path chain |
| `codeChain` | `string[]` | Code path chain |
| `modulesChain` | `TModule[][]` | Module chain |

## `SdAppStructureUtils`

Abstract class with static utility methods for menu and permission computation.

```typescript
abstract class SdAppStructureUtils {
  static getTitleByFullCode<TModule>(items: TSdAppStructureItem<TModule>[], fullCode: string): string;
  static getPermsByFullCode<TModule, K extends string>(
    items: TSdAppStructureItem<TModule>[],
    fullCodes: string[],
    permKeys: K[],
    permRecord: Record<string, boolean> | undefined,
  ): K[];
  static getItemChainByFullCode<TModule>(
    items: TSdAppStructureItem<TModule>[],
    fullCode: string,
  ): TSdAppStructureItem<TModule>[];
  static getMenus<TModule>(
    items: TSdAppStructureItem<TModule>[],
    codeChain: string[],
    usableModules: TModule[] | undefined,
    permRecord: Record<string, boolean> | undefined,
  ): ISdMenu<TModule>[];
  static getFlatMenus<TModule>(
    items: TSdAppStructureItem<TModule>[],
    usableModules: TModule[] | undefined,
    permRecord: Record<string, boolean> | undefined,
  ): ISdFlatMenu<TModule>[];
  static getPermissions<TModule>(
    items: TSdAppStructureItem<TModule>[],
    codeChain: string[],
    usableModules: TModule[] | undefined,
  ): ISdPermission<TModule>[];
  static getFlatPermissions<TModule>(
    items: TSdAppStructureItem<TModule>[],
    usableModules: TModule[] | undefined,
  ): ISdFlatPermission<TModule>[];
}
```

## `SdSharedDataProvider`

Injectable (abstract). Manages real-time shared data with event-driven partial updates via service client.

```typescript
@Injectable()
abstract class SdSharedDataProvider<T extends Record<string, ISharedDataBase<string | number>>> {
  readonly loadingCount: WritableSignal<number>;

  abstract initialize(): void;
  register<K extends string & keyof T>(name: K, info: ISharedDataInfo<T[K]>): void;
  getHandle<K extends string & keyof T>(name: K): SharedDataHandle<T[K]>;
  async emitAsync<K extends string & keyof T>(name: K, changeKeys?: (string | number)[]): Promise<void>;
  async wait(): Promise<void>;
}
```

### `ISharedDataBase`

| Field | Type | Description |
|-------|------|-------------|
| `__valueKey` | `TKey` (string \| number) | Primary key of the shared data item |

### `ISharedDataInfo`

| Field | Type | Description |
|-------|------|-------------|
| `serviceKey` | `string` | Key identifying the service client connection |
| `getter` | `(changeKeys?: (string \| number)[]) => Promise<T[]>` | Function to fetch data (full or partial) |
| `filter` | `unknown` | Optional filter for event matching |
| `orderBy` | `(a: T, b: T) => number` | Optional sort comparator |

### `SharedDataHandle`

| Field | Type | Description |
|-------|------|-------------|
| `items` | `Signal<T[]>` | Read-only signal of all items |
| `get` | `(key: T["__valueKey"] \| undefined) => T \| undefined` | Lookup by key |

### `SdSharedDataChangeEvent`

Event definition for shared data change notifications (used with service client events).

```typescript
const SdSharedDataChangeEvent: EventDefinition<
  { name: string; filter: unknown },
  (string | number)[] | undefined
>;
```

## `SdModalProvider`

Injectable (root). Programmatically creates and shows modal dialogs.

```typescript
@Injectable({ providedIn: "root" })
class SdModalProvider {
  modalCount: WritableSignal<number>;

  async showAsync<T extends ISdModal<any>>(
    modal: ISdModalInfo<T>,
    options?: ISdModalOptions,
  ): Promise<Parameters<T["close"]["emit"]>[0] | undefined>;
}
```

### `ISdModal`

| Field | Type | Description |
|-------|------|-------------|
| `initialized` | `Signal<boolean>` | Whether the modal content is initialized |
| `close` | `OutputEmitterRef<O \| undefined>` | Output to emit close result |
| `actionTplRef` | `TemplateRef<any>` | Optional action template for header |

### `ISdModalInfo`

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Modal title |
| `type` | `Type<T>` | Component type for modal content |
| `inputs` | `Omit<TDirectiveInputSignals<T>, "initialized" \| "close" \| "actionTplRef">` | Component inputs |

### `ISdModalOptions`

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Optional key for config persistence |
| `hideHeader` | `boolean` | Hide the modal header |
| `hideCloseButton` | `boolean` | Hide the close button |
| `useCloseByBackdrop` | `boolean` | Allow closing by clicking backdrop (default: true) |
| `useCloseByEscapeKey` | `boolean` | Allow closing by Escape key (default: true) |
| `float` | `boolean` | Float mode |
| `fill` | `boolean` | Fill mode |
| `resizable` | `boolean` | Enable resize handles |
| `movable` | `boolean` | Enable header drag to move |
| `position` | `"bottom-right" \| "top-right"` | Position preset |
| `minHeightPx` | `number` | Minimum height in pixels |
| `minWidthPx` | `number` | Minimum width in pixels |
| `heightPx` | `number` | Initial height in pixels |
| `widthPx` | `number` | Initial width in pixels |
| `headerStyle` | `string` | Custom header inline style |
| `noFirstControlFocusing` | `boolean` | Skip auto-focusing first control |

## `SdActivatedModalProvider`

Injectable. Available inside modal content components via DI. Provides access to modal context.

```typescript
@Injectable()
class SdActivatedModalProvider<T extends ISdModal<any> = ISdModal<any>> {
  modalComponent: WritableSignal<any>;
  contentComponent: WritableSignal<T | undefined>;
  canDeactiveFn: () => boolean;
}
```

## `SdToastProvider`

Injectable (root). Shows toast notifications with severity levels.

```typescript
@Injectable({ providedIn: "root" })
class SdToastProvider {
  alertThemes: WritableSignal<TSdToastSeverity[]>;
  overlap: WritableSignal<boolean>;
  beforeShowFn?: (theme: TSdToastSeverity) => void;

  info(message: string, useProgress?: true): WritableSignal<number>;
  info(message: string, useProgress?: false): void;
  success(message: string, useProgress?: true): WritableSignal<number>;
  success(message: string, useProgress?: false): void;
  warning(message: string, useProgress?: true): WritableSignal<number>;
  warning(message: string, useProgress?: false): void;
  danger(message: string, useProgress?: true): WritableSignal<number>;
  danger(message: string, useProgress?: false): void;

  notify<T extends ISdToast<any>>(input: ISdToastInput<T>): Promise<Parameters<T["close"]["emit"]>[0] | undefined>;
  async try<R>(fn: () => Promise<R>, messageFn?: (err: unknown) => string): Promise<R | undefined>;
}
```

### `TSdToastSeverity`

```typescript
type TSdToastSeverity = "info" | "success" | "warning" | "danger";
```

### `TSdToastTheme`

```typescript
type TSdToastTheme = "primary" | "secondary" | TSdToastSeverity | "gray" | "blue-gray";
```

### `ISdToast`

| Field | Type | Description |
|-------|------|-------------|
| `close` | `OutputEmitterRef<O \| undefined>` | Output to emit close result |

### `ISdToastInput`

| Field | Type | Description |
|-------|------|-------------|
| `type` | `Type<T>` | Component type for toast content |
| `inputs` | `Omit<TDirectiveInputSignals<T>, "close">` | Component inputs |

## `SdBusyProvider`

Injectable (root). Manages the global busy/loading overlay.

```typescript
@Injectable({ providedIn: "root" })
class SdBusyProvider {
  type: WritableSignal<TSdBusyType>;        // default: "bar"
  globalBusyCount: WritableSignal<number>;   // default: 0
}
```

### `TSdBusyType`

```typescript
type TSdBusyType = "spinner" | "bar" | "cube";
```

## `SdPrintProvider`

Injectable (root). Prints components via `window.print()` or generates PDF buffers.

```typescript
@Injectable({ providedIn: "root" })
class SdPrintProvider {
  async printAsync<T extends ISdPrint>(
    template: ISdPrintInput<T>,
    options?: { size?: string; margin?: string },
  ): Promise<void>;

  async getPdfBufferAsync<T extends ISdPrint>(
    template: ISdPrintInput<T>,
    options?: { orientation?: "portrait" | "landscape"; pageSize?: string },
  ): Promise<Uint8Array>;
}
```

### `ISdPrint`

| Field | Type | Description |
|-------|------|-------------|
| `initialized` | `Signal<boolean>` | Whether the print component is initialized |

### `ISdPrintInput`

| Field | Type | Description |
|-------|------|-------------|
| `type` | `Type<T>` | Component type for print content |
| `inputs` | `Omit<TDirectiveInputSignals<T>, X>` | Component inputs |
