# Providers

Source: `src/providers/**/*.tsx`

## ConfigContext / ConfigProvider

App-level configuration providing the `clientName` used as a prefix for storage keys.

```ts
interface AppConfig {
  clientName: string;
}

const ConfigContext: Context<AppConfig>;

function useConfig(): AppConfig;

const ConfigProvider: ParentComponent<{ clientName: string }>;
```

## SyncStorageProvider / useSyncStorage

Pluggable storage provider. Components use this adapter for persistent storage (localStorage fallback when no adapter is configured).

```ts
interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

interface SyncStorageContextValue {
  adapter: Accessor<StorageAdapter | undefined>;
  configure: (adapter: StorageAdapter | undefined) => void;
}

const SyncStorageContext: Context<SyncStorageContextValue>;

function useSyncStorage(): SyncStorageContextValue | undefined;

const SyncStorageProvider: ParentComponent;
```

## LoggerProvider

Logging adapter provider. Allows plugging in custom log writers.

```ts
interface LogAdapter {
  write: (level: "log" | "info" | "warn" | "error", ...args: unknown[]) => void | Promise<void>;
}

interface LoggerContextValue {
  adapter: Accessor<LogAdapter | undefined>;
  configure: (fn: (origin: LogAdapter) => LogAdapter) => void;
}

const LoggerContext: Context<LoggerContextValue>;

const LoggerProvider: ParentComponent;
```

## ThemeContext / ThemeProvider / useTheme

Light/dark/system theme management. Persists mode to synced storage.

```ts
type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  mode: Accessor<ThemeMode>;
  resolved: Accessor<ResolvedTheme>;
  setMode: (mode: ThemeMode) => void;
  cycleMode: () => void;
}

function useTheme(): ThemeContextValue;

const ThemeProvider: ParentComponent;
```

- `cycleMode()`: light -> system -> dark -> light.
- `resolved`: the actual applied theme after resolving "system" via `prefers-color-scheme`.

## ServiceClientProvider / useServiceClient

Service client connection provider for `@simplysm/service-client`.

```ts
interface ServiceClientContextValue {
  client: Accessor<SdServiceClient | undefined>;
  connected: Accessor<boolean>;
  configure: (url: string) => void;
}

const ServiceClientContext: Context<ServiceClientContextValue>;

function useServiceClient(): ServiceClientContextValue;

const ServiceClientProvider: ParentComponent;
```

## SystemProvider

Composite provider that bundles commonly used providers together.

```ts
const SystemProvider: ParentComponent<{
  clientName: string;
  busyVariant?: BusyVariant;
}>;
```

Internally wraps: `ConfigProvider`, `I18nProvider`, `SyncStorageProvider`, `LoggerProvider`, `ThemeProvider`, `BusyProvider`, `NotificationProvider`, `DialogProvider`, `PrintProvider`, `ErrorLoggerProvider`, `ClipboardProvider`, `PwaUpdateProvider`.

## I18nProvider / useI18n

Internationalization provider with flat dictionary-based translations.

```ts
interface I18nContextValue {
  locale: Accessor<string>;
  t: (key: string, params?: Record<string, string>) => string;
  configure: (options: I18nConfigureOptions) => void;
}

interface I18nConfigureOptions {
  locale?: string;
  dict?: Record<string, unknown>;  // nested dict, auto-flattened
  flatDict?: FlatDict;             // pre-flattened dict
}

type FlatDict = Record<string, string>;

function useI18n(): I18nContextValue;

const I18nProvider: ParentComponent;
```

- `t("key", { name: "value" })`: interpolates `{name}` placeholders.
- `configure()`: merges new dictionaries into existing translations.

## SharedDataProvider / useSharedData

Shared data cache provider. Loads and caches data from service, auto-refreshes on change events.

```ts
interface SharedDataDefinition<TData> {
  key: string;
  loader: () => Promise<TData[]>;
  getKey: (item: TData) => string | number;
  getSearchText?: (item: TData) => string;
  getChildren?: (item: TData, allItems: TData[]) => TData[];
}

interface SharedDataAccessor<TData> {
  items: Accessor<TData[]>;
  loading: Accessor<boolean>;
  refresh: () => Promise<void>;
  getByKey: (key: string | number) => TData | undefined;
}

function useSharedData<TSharedData extends Record<string, unknown>>(): SharedDataValue<TSharedData>;

function SharedDataProvider(props: { children: JSX.Element }): JSX.Element;
```

### SharedDataChangeEvent

Event emitted when shared data changes, triggering refresh.

```ts
const SharedDataChangeEvent: EventDefinition<{
  key: string;
}>;
```
