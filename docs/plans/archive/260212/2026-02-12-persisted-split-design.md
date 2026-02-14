# Split usePersisted into useLocalConfig / useSyncConfig / useLogger

## Background

`usePersisted` was created by merging legacy Angular providers during migration:
- `SdLocalStorageProvider` → pure localStorage
- `SdSystemConfigProvider` → DB-backed config with localStorage fallback
- `SdSystemLogProvider` → console + optional server logging (never migrated)

The merged `usePersisted` can't distinguish between data that must stay local (auth tokens) and data that should sync across devices (user preferences).

## Design

### Interface Changes (`ConfigContext.ts`)

```typescript
interface StorageAdapter {  // existing, unchanged
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<unknown>;
  removeItem(key: string): void | Promise<void>;
}

interface LogAdapter {  // new
  write(severity: "error" | "warn" | "log", ...data: any[]): Promise<void> | void;
}

interface AppConfig {
  clientName: string;
  syncStorage?: StorageAdapter;  // renamed from `storage`
  logger?: LogAdapter;           // new
  loadingVariant?: "spinner" | "bar";  // existing, unchanged
}
```

### New Hooks

**`useLocalConfig<T>(key, initialValue): [Accessor<T>, Setter<T>]`**
- Always uses `localStorage`
- Synchronous only → no loading state
- `{clientName}.{key}` prefix applied
- Use for: auth tokens, device-specific state

**`useSyncConfig<T>(key, initialValue): [Accessor<T>, Setter<T>, Accessor<boolean>]`**
- Uses `syncStorage` if configured, otherwise falls back to `localStorage`
- Returns loading accessor (for async storage)
- When `syncStorage` is not set, behaves identically to `useLocalConfig` (loading always false)
- Use for: theme, DataSheet column config, StatePreset filter presets

**`useLogger(): { write(severity, ...data): void }`**
- Always logs to `consola`
- Additionally calls `logger.write()` if configured
- Swallows `logger.write()` errors (logs them to consola.error)

### Migration Map

| File | Before | After |
|------|--------|-------|
| `ThemeContext.tsx` | `usePersisted("theme", "system")` | `useSyncConfig("theme", "system")` |
| `DataSheet.tsx` | `usePersisted("sheet.{key}", ...)` | `useSyncConfig("sheet.{key}", ...)` |
| `StatePreset.tsx` | `usePersisted("state-preset.{key}", ...)` | `useSyncConfig("state-preset.{key}", ...)` |
| `SidebarContainer.tsx` | `usePersisted("sidebar.toggle", false)` | `createSignal(false)` (remove persistence) |

### Deletions

- `hooks/usePersisted.ts` — delete
- `tests/hooks/usePersisted.spec.tsx` — replace with `useLocalConfig`/`useSyncConfig` tests

### Export Changes (`index.ts`)

```typescript
// remove
export * from "./hooks/usePersisted";
// add
export * from "./hooks/useLocalConfig";
export * from "./hooks/useSyncConfig";
export * from "./hooks/useLogger";
// add (types)
export type { LogAdapter } from "./providers/ConfigContext";
```
