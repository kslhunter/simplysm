# Providers

Source: `src/providers/**`

## `ConfigProvider`

App-wide configuration provider.

```ts
interface AppConfig {
  clientName: string;
}

const ConfigContext: Context<AppConfig>;
function useConfig(): AppConfig;
const ConfigProvider: ParentComponent<{ clientName: string }>;
```

| Field | Type | Description |
|-------|------|-------------|
| `clientName` | `string` | Application identifier used as storage key prefix |

Throws error if `useConfig()` is called outside ConfigProvider.

## `SyncStorageProvider`

Pluggable sync storage provider. Uses localStorage by default.

```ts
interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<unknown>;
  removeItem(key: string): void | Promise<void>;
}

interface SyncStorageContextValue {
  adapter: Accessor<StorageAdapter>;
  configure: (fn: (origin: StorageAdapter) => StorageAdapter) => void;
}

const SyncStorageContext: Context<SyncStorageContextValue>;
function useSyncStorage(): SyncStorageContextValue | undefined;
const SyncStorageProvider: ParentComponent;
```

| Field | Type | Description |
|-------|------|-------------|
| `adapter` | `Accessor<StorageAdapter>` | Current storage adapter |
| `configure` | `(fn) => void` | Replace adapter via transform function |

`useSyncStorage()` returns undefined when not inside a provider.

## `LoggerProvider`

Pluggable log adapter provider. Defaults to consola.

```ts
interface LogAdapter {
  write(severity: "error" | "warn" | "info" | "log", ...data: any[]): Promise<void> | void;
}

interface LoggerContextValue {
  adapter: Accessor<LogAdapter>;
  configure: (fn: (origin: LogAdapter) => LogAdapter) => void;
}

const LoggerContext: Context<LoggerContextValue>;
const LoggerProvider: ParentComponent;
```

| Field | Type | Description |
|-------|------|-------------|
| `adapter` | `Accessor<LogAdapter>` | Current log adapter |
| `configure` | `(fn) => void` | Replace adapter via transform function |

## `ThemeProvider`

Theme mode management. Persists to localStorage and toggles `dark` class on `<html>`.

```ts
type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

function useTheme(): ThemeContextValue;
const ThemeProvider: ParentComponent;
```

Must be inside ConfigContext. `ResolvedTheme` is determined by OS preference when mode is "system".

## `ServiceClientProvider`

WebSocket service client connection management.

```ts
interface ServiceClientContextValue {
  connect: (key?: string, options?: Partial<ServiceConnectionOptions>) => Promise<void>;
  close: (key?: string) => Promise<void>;
  get: (key?: string) => ServiceClient;
  isConnected: (key?: string) => boolean;
}

const ServiceClientContext: Context<ServiceClientContextValue>;
function useServiceClient(): ServiceClientContextValue;
const ServiceClientProvider: ParentComponent;
```

| Method | Description |
|--------|-------------|
| `connect()` | Establish WebSocket connection (optional key for multiple connections) |
| `close()` | Close connection |
| `get()` | Get ServiceClient instance |
| `isConnected()` | Check connection status |

Must be inside ConfigProvider and NotificationProvider.

## `SharedDataProvider`

Server-synced shared data with real-time subscriptions.

```ts
interface SharedDataDefinition<TData> {
  serviceKey?: string;
  fetch: (changeKeys?: Array<string | number>) => Promise<TData[]>;
  getKey: (item: TData) => string | number;
  orderBy: [(item: TData) => unknown, "asc" | "desc"][];
  filter?: unknown;
  itemSearchText?: (item: TData) => string;
  isItemHidden?: (item: TData) => boolean;
  getParentKey?: (item: TData) => string | number | undefined;
}

interface SharedDataAccessor<TData> {
  items: Accessor<TData[]>;
  get: (key: string | number | undefined) => TData | undefined;
  emit: (changeKeys?: Array<string | number>) => Promise<void>;
  getKey: (item: TData) => string | number;
  itemSearchText?: (item: TData) => string;
  isItemHidden?: (item: TData) => boolean;
  getParentKey?: (item: TData) => string | number | undefined;
}

type SharedDataValue<TSharedData extends Record<string, unknown>> = {
  [K in keyof TSharedData]: SharedDataAccessor<TSharedData[K]>;
} & {
  wait: () => Promise<void>;
  busy: Accessor<boolean>;
  configure: (fn: ...) => void;
};

function useSharedData<TSharedData extends Record<string, unknown>>(): SharedDataValue<TSharedData>;
const SharedDataProvider: ParentComponent;
```

| Field | Type | Description |
|-------|------|-------------|
| `items` | `Accessor<TData[]>` | Reactive data items |
| `get` | `(key) => TData \| undefined` | Get item by key |
| `emit` | `(changeKeys?) => Promise<void>` | Trigger data refresh |
| `wait` | `() => Promise<void>` | Wait for initial load |
| `busy` | `Accessor<boolean>` | Loading state |

Must be inside ServiceClientProvider and NotificationProvider.

### `SharedDataChangeEvent`

```ts
const SharedDataChangeEvent = defineEvent<
  { name: string; filter: unknown },
  (string | number)[] | undefined
>("SharedDataChangeEvent");
```

Event emitted on server-side data changes. Event info contains data name and filter; event data is array of changed keys or undefined for full refresh.

## `SystemProvider`

All-in-one provider wrapping ConfigProvider, SyncStorageProvider, LoggerProvider, ThemeProvider, NotificationProvider, BusyProvider, DialogProvider, PrintProvider, and I18nProvider.

```ts
const SystemProvider: ParentComponent<{
  clientName: string;
  busyVariant?: BusyVariant;
}>;
```

| Field | Type | Description |
|-------|------|-------------|
| `clientName` | `string` | Application identifier |
| `busyVariant` | `BusyVariant` | Busy overlay style |

## `I18nProvider`

Internationalization provider with built-in en/ko dictionaries. Persists locale to localStorage.

```ts
interface I18nContextValue {
  t: (key: string, params?: Record<string, string>) => string;
  locale: Accessor<string>;
  setLocale: (locale: string) => void;
  configure: (options: I18nConfigureOptions) => void;
}

interface I18nConfigureOptions {
  locale?: string;
  dict?: Record<string, Record<string, unknown>>;
}

type FlatDict = Record<string, string>;

function useI18n(): I18nContextValue;
const I18nProvider: ParentComponent;
```

| Method | Description |
|--------|-------------|
| `t()` | Translate key with optional parameter substitution |
| `locale` | Current locale accessor |
| `setLocale()` | Change locale |
| `configure()` | Add dictionaries or change locale |
