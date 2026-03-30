# Config Manager

## `getConfig`

Loads a JSON configuration file with automatic caching and file-watching for live reload.

```typescript
export async function getConfig<TConfig>(
  filePath: string,
): Promise<TConfig | undefined>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `filePath` | `string` | Absolute path to the JSON config file |

**Returns:** `Promise<TConfig | undefined>` -- Parsed config object, or `undefined` if the file does not exist.

Behavior:
- **Caching:** Uses `LazyGcMap` with 10-minute GC interval and 1-hour expiry
- **File watching:** Registers a file watcher on first load. Config is automatically reloaded when the file changes
- **Expiry:** When a cache entry expires, the associated file watcher is cleaned up
- **Deletion:** If the config file is deleted, the cache entry and watcher are removed
- Used internally by `ServiceContext.getConfig()` to load root and client config files
