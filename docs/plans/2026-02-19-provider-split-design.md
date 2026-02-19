# Provider Split Design

## Summary

Decompose `InitializeProvider` into independent, composable providers to resolve the circular dependency between `ConfigContext(syncStorage)` and `ServiceClientProvider`.

## Root Cause

`AppConfig` bundles two different concerns into one context:

1. **Basic identity** (`clientName`) — no dependencies, can be topmost
2. **Infrastructure adapters** (`syncStorage`, `logger`) — may depend on ServiceClient

This creates a circular dependency when `syncStorage` needs `ServiceClient`:

```
AppConfig(syncStorage) → needs ServiceClient
ServiceClient → needs useConfig() → needs AppConfig
```

## Design

### 1. Context/Provider Split

**ConfigContext.ts** — shrink to `clientName` only:

```typescript
interface AppConfig {
  clientName: string;
}

export const ConfigProvider: ParentComponent<{ clientName: string }>;
```

**SyncStorageContext.ts** — new, optional context:

```typescript
export interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<unknown>;
  removeItem(key: string): void | Promise<void>;
}

// Default undefined → useSyncConfig falls back to localStorage
export const SyncStorageContext = createContext<StorageAdapter | undefined>(undefined);
export const SyncStorageProvider: ParentComponent<{ storage: StorageAdapter }>;
```

**LoggerContext.ts** — new, optional context:

```typescript
export interface LogAdapter {
  write(severity: "error" | "warn" | "info" | "log", ...data: any[]): Promise<void> | void;
}

// Default undefined → useLogger falls back to consola
export const LoggerContext = createContext<LogAdapter | undefined>(undefined);
export const LoggerProvider: ParentComponent<{ adapter: LogAdapter }>;
```

### 2. Side-effect Providers

**ErrorLoggerProvider.tsx** — captures window errors via useLogger:

```typescript
export const ErrorLoggerProvider: ParentComponent;
// Dependency: useLogger() (LoggerContext optional, consola fallback)
```

**PwaUpdateProvider.tsx** — monitors SW updates:

```typescript
export const PwaUpdateProvider: ParentComponent;
// Dependency: useNotification() (NotificationProvider required above)
```

**ClipboardProvider.tsx** — form control clipboard copy:

```typescript
export const ClipboardProvider: ParentComponent;
// Dependency: none (pure browser API)
```

### 3. Hook Changes

**useSyncConfig.ts**:

```typescript
// Before: config.syncStorage from useConfig()
// After: useContext(SyncStorageContext) — undefined means localStorage fallback
```

**useLogger.ts**:

```typescript
// Before: config.logger from useConfig()
// After: useContext(LoggerContext) — undefined means consola fallback
```

**useLocalStorage.ts**: No changes (only uses `useConfig().clientName`).

### 4. Deleted

- `InitializeProvider.tsx` — removed entirely
- `usePwaUpdate.ts` — logic moved to PwaUpdateProvider
- `useClipboardValueCopy.ts` — logic moved to ClipboardProvider

### 5. File Structure

```
packages/solid/src/providers/
├── ConfigContext.ts          ← modified (AppConfig shrink, ConfigProvider added)
├── SyncStorageContext.ts     ← new
├── LoggerContext.ts          ← new
├── ErrorLoggerProvider.tsx   ← new
├── PwaUpdateProvider.tsx     ← new
├── ClipboardProvider.tsx     ← new
├── ThemeContext.tsx           ← modified (error message update)
├── ServiceClientProvider.tsx ← unchanged
├── ServiceClientContext.ts   ← unchanged
└── shared-data/              ← unchanged
```

### 6. index.ts Export Changes

```typescript
// Remove
export * from "./providers/InitializeProvider";
export { usePwaUpdate } from "./hooks/usePwaUpdate";

// Add
export * from "./providers/SyncStorageContext";
export * from "./providers/LoggerContext";
export * from "./providers/ErrorLoggerProvider";
export * from "./providers/PwaUpdateProvider";
export * from "./providers/ClipboardProvider";
```

### 7. App Composition

**Minimal (no server sync):**

```tsx
<ConfigProvider clientName="myApp">
  <NotificationProvider>
    <NotificationBanner />
    <ErrorLoggerProvider>
      <PwaUpdateProvider>
        <ClipboardProvider>
          <ThemeProvider>
            <BusyProvider>
              <App />
            </BusyProvider>
          </ThemeProvider>
        </ClipboardProvider>
      </PwaUpdateProvider>
    </ErrorLoggerProvider>
  </NotificationProvider>
</ConfigProvider>
```

**With ServiceClient + sync:**

```tsx
<ConfigProvider clientName="myApp">
  <NotificationProvider>
    <NotificationBanner />
    <ErrorLoggerProvider>
      <PwaUpdateProvider>
        <ClipboardProvider>
          <ServiceClientProvider>
            <AppSyncSetup>
              <ThemeProvider>
                <BusyProvider>
                  <App />
                </BusyProvider>
              </ThemeProvider>
            </AppSyncSetup>
          </ServiceClientProvider>
        </ClipboardProvider>
      </PwaUpdateProvider>
    </ErrorLoggerProvider>
  </NotificationProvider>
</ConfigProvider>
```

`AppSyncSetup` is an app-defined component that uses `useServiceClient()` internally
and provides `SyncStorageProvider` + `LoggerProvider`.

**Provider dependency order:**

```
ConfigProvider (topmost, required)
  └─ NotificationProvider
      └─ ErrorLoggerProvider (uses useLogger)
          └─ PwaUpdateProvider (uses useNotification)
              └─ ClipboardProvider (no dependencies)
                  └─ [ServiceClientProvider] (optional)
                      └─ [SyncStorageProvider] (optional, can use ServiceClient)
                          └─ [LoggerProvider] (optional, can use ServiceClient)
                              └─ ThemeProvider (uses useSyncConfig)
                                  └─ BusyProvider (variant prop)
```

### 8. Test Changes

**Modified tests:**

| Test file | Change |
|-----------|--------|
| `tests/providers/ConfigContext.spec.ts` | Remove syncStorage/logger/busyVariant tests, add ConfigProvider test |
| `tests/hooks/useSyncConfig.spec.tsx` | Wrapper: ConfigContext.Provider → ConfigProvider + SyncStorageProvider |
| `tests/hooks/useLogger.spec.tsx` | Wrapper: ConfigContext.Provider → LoggerProvider |

**New tests:**

| Test file | Coverage |
|-----------|----------|
| `tests/providers/SyncStorageContext.spec.ts` | Provider provides adapter, default undefined |
| `tests/providers/LoggerContext.spec.ts` | Provider provides adapter, default undefined |
| `tests/providers/ErrorLoggerProvider.spec.tsx` | Error/rejection capture, consola fallback |
| `tests/providers/PwaUpdateProvider.spec.tsx` | Basic mount/unmount |
| `tests/providers/ClipboardProvider.spec.tsx` | Basic mount/unmount |

### 9. README / Docs Changes

**README.md**: Replace InitializeProvider section with individual provider docs + minimal/full examples.

**docs/providers.md**: Replace InitializeProvider section with per-provider docs and dependency order guide.

**Other docs** (`hooks.md`, `feedback.md`, etc.): Update InitializeProvider references to individual providers.
