# useLogger Refactor & Global Error Handling

## Summary

Refactor `useLogger` to use `ConfigContext` instead of the global `LogConfig` object,
and add automatic global error capturing via `InitializeProvider`.

## Goals

1. Unify LogAdapter configuration through `ConfigContext` (remove `LogConfig.ts`)
2. When adapter is configured, use adapter only (no consola); fallback to consola when no adapter
3. Capture global uncaught errors (`window.onerror`, `unhandledrejection`) via `InitializeProvider`
4. Add `logger.error()` to unexpected error catch blocks

## Design

### 1. Remove `LogConfig.ts`, unify via `ConfigContext`

**Delete:** `packages/solid/src/configs/LogConfig.ts`

**Update `ConfigContext.ts`** — add `"info"` to `LogAdapter.write` severity:

```typescript
export interface LogAdapter {
  write(severity: "error" | "warn" | "info" | "log", ...data: any[]): Promise<void> | void;
}
```

`AppConfig.logger` (already exists) becomes the single source of truth.

### 2. Refactor `useLogger`

- Use `useConfig().logger` instead of global `LogAdapter`
- If adapter present → adapter only (no consola)
- If adapter absent → consola fallback

```typescript
export function useLogger(): Logger {
  const config = useConfig();

  const createLogFunction = (level: LogEntry["level"]) => {
    return (...args: unknown[]) => {
      if (config.logger) {
        config.logger.write(level, ...args);
      } else {
        (consola as any)[level](...args);
      }
    };
  };

  return {
    log: createLogFunction("log"),
    info: createLogFunction("info"),
    warn: createLogFunction("warn"),
    error: createLogFunction("error"),
  };
}
```

### 3. Global error handler in `InitializeProvider`

Add internal `GlobalErrorLogger` component (same pattern as existing `PwaUpdater`):

```typescript
function GlobalErrorLogger() {
  const logger = useLogger();

  const onError = (event: ErrorEvent) => {
    logger.error("Uncaught error:", event.error ?? event.message);
  };
  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    logger.error("Unhandled rejection:", event.reason);
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onUnhandledRejection);
  onCleanup(() => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onUnhandledRejection);
  });

  return null;
}
```

Place inside `InitializeProvider` JSX, within `ConfigContext.Provider`:

```tsx
<ConfigContext.Provider value={props.config}>
  <ThemeProvider>
    <NotificationProvider>
      <GlobalErrorLogger />
      <NotificationBanner />
      <PwaUpdater />
      <LoadingProvider variant={props.config.loadingVariant}>
        <DialogProvider>{props.children}</DialogProvider>
      </LoadingProvider>
    </NotificationProvider>
  </ThemeProvider>
</ConfigContext.Provider>
```

### 4. Add `logger.error()` to unexpected error catch blocks

**Apply:**

| Location | Current | Change |
|---|---|---|
| `SharedDataProvider` fetch failure | `notification.danger()` | + `logger.error()` |
| `usePrint` | `try/catch` | Review, add `logger.error()` if unexpected |
| `Combobox` | `try/catch` | Review, add `logger.error()` if unexpected |

**Do NOT apply** (expected failures, keep silent):
- `useLocalConfig` — JSON parse failure
- `useSyncConfig` — storage access/parse failure

### 5. Test updates

- Remove `LogConfig` imports from `useLogger.spec.tsx`
- Test with `ConfigContext.Provider` wrapping (provide mock `logger`)
- Test consola fallback when no adapter configured
- Test `GlobalErrorLogger` captures window errors

## Files to modify

- `packages/solid/src/configs/LogConfig.ts` — DELETE
- `packages/solid/src/configs/ConfigContext.ts` — add `"info"` to LogAdapter severity
- `packages/solid/src/hooks/useLogger.ts` — use `useConfig()`, adapter-only or consola fallback
- `packages/solid/src/providers/InitializeProvider.tsx` — add `GlobalErrorLogger`
- `packages/solid/src/providers/shared-data/SharedDataProvider.tsx` — add `logger.error()`
- `packages/solid/src/index.ts` — remove `LogConfig` export
- `packages/solid/tests/hooks/useLogger.spec.tsx` — rewrite for ConfigContext-based tests
