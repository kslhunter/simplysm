# Providers

Source: `src/providers/**`

## `ConfigProvider`

App-wide configuration context providing `clientName` used as storage key prefix.

```typescript
export interface AppConfig {
  clientName: string;
}

export const ConfigContext: Context<AppConfig>;
export function useConfig(): AppConfig;
export const ConfigProvider: ParentComponent<{ clientName: string }>;
```

---

## `SyncStorageProvider`

Sync storage provider with configurable adapter (defaults to localStorage). Supports async adapters for cross-device sync.

```typescript
export interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<unknown>;
  removeItem(key: string): void | Promise<void>;
}

export interface SyncStorageContextValue {
  adapter: Accessor<StorageAdapter>;
  configure: (fn: (origin: StorageAdapter) => StorageAdapter) => void;
}

export const SyncStorageContext: Context<SyncStorageContextValue>;
export function useSyncStorage(): SyncStorageContextValue | undefined;
export const SyncStorageProvider: ParentComponent;
```

---

## `LoggerProvider`

Logger adapter provider. Defaults to consola. Configurable via decorator pattern.

```typescript
export interface LogAdapter {
  write(severity: "error" | "warn" | "info" | "log", ...data: any[]): Promise<void> | void;
}

export interface LoggerContextValue {
  adapter: Accessor<LogAdapter>;
  configure: (fn: (origin: LogAdapter) => LogAdapter) => void;
}

export const LoggerContext: Context<LoggerContextValue>;
export const LoggerProvider: ParentComponent;
```

---

## `ThemeProvider`

Theme mode provider with OS dark mode detection. Persists to storage via `useSyncConfig`. Toggles `dark` class on `<html>`.

```typescript
export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export function useTheme(): {
  mode: () => ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolvedTheme: () => ResolvedTheme;
  cycleMode: () => void;
};

export const ThemeProvider: ParentComponent;
```

---

## `ServiceClientProvider`

WebSocket service client provider with key-based multi-connection management. Displays request/response progress via notifications.

```typescript
export interface ServiceClientContextValue {
  connect: (key?: string, options?: Partial<ServiceConnectionOptions>) => Promise<void>;
  close: (key?: string) => Promise<void>;
  get: (key?: string) => ServiceClient;
  isConnected: (key?: string) => boolean;
}

export const ServiceClientContext: Context<ServiceClientContextValue>;
export function useServiceClient(): ServiceClientContextValue;
export const ServiceClientProvider: ParentComponent;
```

---

## `SharedDataProvider`

Reactive shared data provider that subscribes to server events for real-time data updates.

### `SharedDataDefinition`

```typescript
export interface SharedDataDefinition<TData> {
  serviceKey?: string;
  fetch: (changeKeys?: Array<string | number>) => Promise<TData[]>;
  getKey: (item: TData) => string | number;
  orderBy: [(item: TData) => unknown, "asc" | "desc"][];
  filter?: unknown;
  itemSearchText?: (item: TData) => string;
  isItemHidden?: (item: TData) => boolean;
  getParentKey?: (item: TData) => string | number | undefined;
}
```

### `SharedDataAccessor`

```typescript
export interface SharedDataAccessor<TData> {
  items: Accessor<TData[]>;
  get: (key: string | number | undefined) => TData | undefined;
  emit: (changeKeys?: Array<string | number>) => Promise<void>;
  getKey: (item: TData) => string | number;
  itemSearchText?: (item: TData) => string;
  isItemHidden?: (item: TData) => boolean;
  getParentKey?: (item: TData) => string | number | undefined;
}
```

---

## `SharedDataChangeEvent`

Server-client shared data change event definition.

```typescript
export const SharedDataChangeEvent: EventDefinition<
  { name: string; filter: unknown },
  (string | number)[] | undefined
>;
```

---

## `SystemProvider`

All-in-one provider that composes Config, I18n, SyncStorage, Logger, Notification, ErrorLogger, PwaUpdate, Clipboard, Theme, ServiceClient, SharedData, and Busy providers.

```typescript
export const SystemProvider: ParentComponent<{
  clientName: string;
  busyVariant?: BusyVariant;
}>;
```

---

## `I18nProvider`

Internationalization provider with built-in `en` and `ko` dictionaries.

```typescript
export function useI18n(): I18nContextValue;
export const I18nProvider: ParentComponent;
```

### `I18nContextValue`

```typescript
export interface I18nContextValue {
  t: (key: string, params?: Record<string, string>) => string;
  locale: Accessor<string>;
  setLocale: (locale: string) => void;
  configure: (options: I18nConfigureOptions) => void;
}
```

### `I18nConfigureOptions`

```typescript
export interface I18nConfigureOptions {
  locale?: string;
  dict?: Record<string, Record<string, unknown>>;
}
```

### `FlatDict`

```typescript
export type FlatDict = Record<string, string>;
```
