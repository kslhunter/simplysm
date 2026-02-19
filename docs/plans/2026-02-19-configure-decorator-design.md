# Configure Decorator Pattern Design

## Summary

Change all `configure()` methods in `@simplysm/solid` providers to accept a **decorator function** instead of a direct adapter object. The function receives the previous adapter (or a built-in default) as `origin`, enabling middleware/chaining patterns.

## API Change

### Before (current)

```typescript
useLogger().configure(myAdapter);
useSyncStorage()!.configure(myAdapter);
useSharedData().configure(definitions);
```

### After

```typescript
// useLogger — origin is consola-based default adapter
useLogger().configure((origin) => ({
  write(severity, ...data) {
    sendToServer(severity, ...data);
    origin.write(severity, ...data);
  }
}));

// useSyncStorage — origin is localStorage-based default adapter
useSyncStorage()!.configure((origin) => ({
  getItem: (key) => myCustomGet(key) ?? origin.getItem(key),
  setItem: origin.setItem,
  removeItem: origin.removeItem,
}));

// useSharedData — origin is {} (empty definitions)
useSharedData().configure((origin) => ({
  ...origin,
  user: { serviceKey: "main", fetch: ..., getKey: ..., orderBy: ... },
}));
```

## Default Origin Values

| Hook | First-call origin |
|------|-------------------|
| `useLogger` | consola-based `LogAdapter` (`consola.error/warn/info/log`) |
| `useSyncStorage` | localStorage-based `StorageAdapter` |
| `useSharedData` | `{}` (empty definitions object) |

On subsequent calls, origin = previously configured adapter/definitions.

## Implementation

### Core pattern (inside Provider)

```typescript
// Example: LoggerContext.tsx
const defaultAdapter: LogAdapter = {
  write: (severity, ...data) => consola[severity](...data),
};
const [adapter, setAdapter] = createSignal<LogAdapter>(defaultAdapter);

// configure uses functional update to chain
configure: (fn: (origin: LogAdapter) => LogAdapter) => {
  setAdapter((prev) => fn(prev));
}
```

## Files to Change

### Provider implementation (configure signature + default origin)

1. `packages/solid/src/providers/LoggerContext.tsx`
2. `packages/solid/src/providers/SyncStorageContext.tsx`
3. `packages/solid/src/providers/shared-data/SharedDataProvider.tsx`

### Hook interfaces (type changes)

4. `packages/solid/src/hooks/useLogger.ts` — `Logger.configure` signature
5. `packages/solid/src/providers/shared-data/SharedDataContext.ts` — `SharedDataValue.configure` signature

### Existing usage updates (breaking change)

6. `packages/solid-demo/src/pages/SharedDataPage.tsx`

### Tests

7. `packages/solid/tests/useLogger.spec.tsx`
8. `packages/solid/tests/useSyncConfig.spec.tsx`

### Documentation

9. `packages/solid/README.md`
10. `packages/solid/docs/providers.md`
11. `packages/solid/docs/hooks.md`
