# Providers

## ConfigProvider

```typescript
export const ConfigProvider: ParentComponent<{ clientName: string }>;
export function useConfig(): { clientName: string };
```

Application-level configuration. `clientName` identifies the client app.

---

## ThemeProvider

```typescript
type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  mode(): ThemeMode;
  setMode(mode: ThemeMode): void;
  resolvedTheme(): ResolvedTheme;
  cycleMode(): void;
}

export const ThemeProvider: ParentComponent;
export function useTheme(): ThemeContextValue;
```

Light/Dark mode management with system preference detection. `cycleMode()` rotates through light → dark → system.

---

## I18nProvider

```typescript
interface I18nContextValue {
  t(key: string, params?: Record<string, string>): string;
  locale: Accessor<string>;
  setLocale(locale: string): void;
  configure(options: I18nConfigureOptions): void;
}

interface I18nConfigureOptions {
  locale?: string;
  dict?: Record<string, Record<string, unknown>>;
}

export const I18nProvider: ParentComponent;
export function useI18n(): I18nContextValue;
```

Internationalization provider. Supports nested dictionary keys and parameter interpolation via `t("key", { name: "John" })`.

---

## SyncStorageProvider

```typescript
interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<unknown>;
  removeItem(key: string): void | Promise<void>;
}

interface SyncStorageContextValue {
  adapter: Accessor<StorageAdapter>;
  configure(fn: (origin: StorageAdapter) => StorageAdapter): void;
}

export const SyncStorageProvider: ParentComponent;
export function useSyncStorage(): SyncStorageContextValue | undefined;
```

Pluggable storage adapter used by components like `StatePreset`, `DataSheet` (column config), and `useSyncConfig`. Defaults to `localStorage`. Override with `configure()` for server-backed storage.

---

## LoggerProvider

```typescript
interface LogAdapter {
  write(severity: "error" | "warn" | "info" | "log", ...data: any[]): Promise<void> | void;
}

interface LoggerContextValue {
  adapter: Accessor<LogAdapter>;
  configure(fn: (origin: LogAdapter) => LogAdapter): void;
}

export const LoggerProvider: ParentComponent;
```

Configurable logging provider. Middleware pattern via `configure()`.

---

## ServiceClientProvider

```typescript
interface ServiceClientContextValue {
  connect(key?: string, options?: Partial<ServiceConnectionOptions>): Promise<void>;
  close(key?: string): Promise<void>;
  get(key?: string): ServiceClient;
  isConnected(key?: string): boolean;
}

export const ServiceClientProvider: ParentComponent;
export function useServiceClient(): ServiceClientContextValue;
```

Service communication provider. Manages WebSocket connections to backend services. Multiple named connections supported via `key`.

---

## SharedDataProvider

```typescript
interface SharedDataDefinition<TData> {
  serviceKey?: string;
  fetch(changeKeys?: (string | number)[]): Promise<TData[]>;
  getKey(item: TData): string | number;
  orderBy: [(item: TData) => unknown, "asc" | "desc"][];
  filter?: unknown;
  itemSearchText?: (item: TData) => string;
  isItemHidden?: (item: TData) => boolean;
  getParentKey?: (item: TData) => string | number | undefined;
}

interface SharedDataAccessor<TData> {
  items: Accessor<TData[]>;
  get(key: string | number | undefined): TData | undefined;
  emit(changeKeys?: (string | number)[]): Promise<void>;
  getKey(item: TData): string | number;
  itemSearchText?: (item: TData) => string;
  isItemHidden?: (item: TData) => boolean;
  getParentKey?: (item: TData) => string | number | undefined;
}

export const SharedDataProvider: (props: { children: JSX.Element }) => JSX.Element;
export function useSharedData<TSharedData>(): SharedDataValue<TSharedData>;
```

Centralized data management for shared lookup data (e.g. code tables). Data is fetched once and shared across all consumers. `emit()` triggers a re-fetch.

---

## SystemProvider

```typescript
export const SystemProvider: ParentComponent<{
  clientName: string;
  busyVariant?: BusyVariant;
}>;
```

Convenience provider that composes `ConfigProvider`, `SyncStorageProvider`, `LoggerProvider`, `ThemeProvider`, `I18nProvider`, `NotificationProvider`, and `BusyProvider` into a single wrapper.

---

## Usage Examples

```typescript
import { SystemProvider, DialogProvider, PrintProvider } from "@simplysm/solid";

// Typical app provider tree
<SystemProvider clientName="my-app">
  <ServiceClientProvider>
    <SharedDataProvider>
      <DialogProvider>
        <PrintProvider>
          <App />
        </PrintProvider>
      </DialogProvider>
    </SharedDataProvider>
  </ServiceClientProvider>
</SystemProvider>
```
