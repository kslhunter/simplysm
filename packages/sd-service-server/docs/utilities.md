# Utilities

## SdConfigManager

Static configuration file manager with caching and file watching. Reads `.config.json` files and keeps them in memory with automatic invalidation.

```typescript
class SdConfigManager
```

### Static Methods

#### `getConfigAsync<T>(filePath: string): Promise<T | undefined>`

Loads and caches a JSON configuration file. Returns `undefined` if the file does not exist.

- First call reads the file from disk and caches it.
- Subsequent calls return the cached value.
- A file watcher is registered to automatically reload the config when the file changes on disk.

### Caching Behavior

- **GC interval**: Checks for expired entries every 10 minutes.
- **Expiry**: Cached entries expire after 1 hour of inactivity.
- **File watching**: Changes to the config file are detected and the cache is updated in real-time (100ms debounce).
- **Deletion**: If the watched file is deleted, the cache entry and watcher are removed.
- On cache expiry, the associated file watcher is closed to prevent resource leaks.

### Usage

`SdConfigManager` is used internally by `SdServiceBase.getConfigAsync()` and is not typically called directly.

```typescript
// Internal usage in SdServiceBase:
const config = await SdConfigManager.getConfigAsync<Record<string, any>>(
  "/app/.config.json"
);
```
