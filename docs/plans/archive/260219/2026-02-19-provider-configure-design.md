# Provider Late-Injection & InitializeProvider Design

## Problem

SyncStorageProvider and LoggerProvider require adapter props at mount time. When the adapter depends on lower Providers (e.g., ServiceClientProvider for server-backed storage), the correct nesting order becomes impossible.

SharedDataProvider has the same issue: definitions may depend on auth state or service connections established later.

## Solution

1. **Remove all configuration props** from SyncStorageProvider, LoggerProvider, SharedDataProvider
2. **Add `configure()` via hooks** for late injection after dependencies are ready
3. **Create InitializeProvider** as the single main Provider that nests everything internally

## Design

### InitializeProvider (new)

Single entry point for `@simplysm/solid`. Only prop: `clientName`.

```tsx
<InitializeProvider clientName="my-app">
  <AppRoot />
</InitializeProvider>
```

Internal nesting order:

```
ConfigProvider → SyncStorageProvider → LoggerProvider →
  NotificationProvider + NotificationBanner →
    ErrorLoggerProvider → PwaUpdateProvider →
      ClipboardProvider → ThemeProvider →
        ServiceClientProvider → SharedDataProvider →
          BusyProvider → DialogProvider → {children}
```

Individual providers remain exported for advanced use cases.

### SyncStorageProvider

- **No props** (was: `storage: StorageAdapter` required)
- Context value: `SyncStorageContextValue { adapter: Accessor, configure() }`
- Before `configure()`: `useSyncConfig` uses localStorage fallback
- After `configure()`: `useSyncConfig` re-reads from new adapter (ready=false → true)

```typescript
interface SyncStorageContextValue {
  adapter: Accessor<StorageAdapter | undefined>;
  configure: (adapter: StorageAdapter) => void;
}
```

### LoggerProvider

- **No props** (was: `adapter: LogAdapter` required)
- Context value: `LoggerContextValue { adapter: Accessor, configure() }`
- Before `configure()`: `useLogger` uses consola fallback
- After `configure()`: log calls routed to injected adapter

```typescript
interface LoggerContextValue {
  adapter: Accessor<LogAdapter | undefined>;
  configure: (adapter: LogAdapter) => void;
}
```

### SharedDataProvider

- **No props** (was: `definitions` required)
- Before `configure()`: `wait()`, `busy`, `configure` accessible; data access throws
- After `configure(definitions)`: signals, memos, event listeners, initial fetches created
- Uses `Proxy` to intercept data access and throw before configuration

```typescript
// Context value type adds configure
type SharedDataValue<T> = { [K in keyof T]: SharedDataAccessor<T[K]> }
  & { wait; busy; configure(definitions) };
```

### useSyncConfig changes

- Tracks `syncStorageCtx?.adapter()` reactively via `createEffect`
- On adapter change: `ready(false)` → read from new adapter → `ready(true)`
- Save effect reads adapter via `untrack()` to avoid unnecessary re-runs

### useLogger changes

- Reads `loggerCtx?.adapter()` lazily on each log call (not captured at mount)
- `configure()` delegates to context, throws if no Provider

### Usage pattern

```tsx
function AppRoot() {
  const serviceClient = useServiceClient();

  onMount(async () => {
    await serviceClient.connect("main", { port: 3000 });

    useSyncStorage()!.configure(serverStorageAdapter);
    useLogger().configure(serverLogAdapter);
    useSharedData().configure(definitions);
  });
}
```

## Files to Change

| File | Change |
|------|--------|
| `providers/SyncStorageContext.tsx` | Context type, remove prop, add signal + configure |
| `providers/LoggerContext.tsx` | Same pattern |
| `providers/shared-data/SharedDataContext.ts` | Add configure to type |
| `providers/shared-data/SharedDataProvider.tsx` | Remove prop, defer init to configure(), Proxy |
| `hooks/useSyncConfig.ts` | Reactive adapter tracking, re-init on change |
| `hooks/useLogger.ts` | Lazy adapter read, add configure |
| **`providers/InitializeProvider.tsx`** (new) | Main wrapper Provider |
| `index.ts` | Export InitializeProvider |

## Tests to Update

| Test | Change |
|------|--------|
| `SyncStorageContext.spec.tsx` | New context shape, configure() |
| `LoggerContext.spec.tsx` | Same |
| `useSyncConfig.spec.tsx` | No-prop Provider, configure re-read |
| `useLogger.spec.tsx` | No-prop Provider, configure switch |
| `SharedDataProvider.spec.tsx` | Pre-configure throw, post-configure normal |
| **`InitializeProvider.spec.tsx`** (new) | All contexts accessible |

## Docs to Update

- `providers.md` — InitializeProvider, dependency graph, configure pattern
- `README.md` — Provider Setup with InitializeProvider
- `solid-demo/src/App.tsx` — Replace manual nesting with InitializeProvider
