# Utilities

## SdConfigManager

Static utility class that provides cached JSON configuration file loading with automatic file-watching and hot-reload. Uses `LazyGcMap` for automatic cache expiration.

### Methods

#### `getConfigAsync(filePath)`

```typescript
static async getConfigAsync<T>(filePath: string): Promise<T | undefined>
```

Loads and caches a JSON configuration file. On first load, registers a file watcher that automatically updates the cache when the file changes. Returns `undefined` if the file does not exist.

| Parameter | Type | Description |
|-----------|------|-------------|
| `filePath` | `string` | Absolute path to the JSON configuration file |

**Returns:** `Promise<T | undefined>` -- the parsed JSON configuration, or `undefined` if the file does not exist.

### Internal Details

- **Cache implementation:** `LazyGcMap` with 10-minute GC interval and 1-hour expiration
- **File watching:** Uses `SdFsWatcher` to monitor config files. When a file changes, the cache is immediately updated. When a file is deleted, both cache and watcher are cleaned up
- **Watcher cleanup:** When a cache entry expires, its associated file watcher is automatically closed
- **Thread safety:** Static singleton pattern -- all service instances share the same cache
