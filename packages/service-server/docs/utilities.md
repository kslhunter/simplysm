# Utilities

## `getConfig<TConfig>(filePath): Promise<TConfig | undefined>`

Reads and caches a JSON configuration file with automatic live-reloading via file system watcher.

### Features

- **Caching**: Configurations are cached in a `LazyGcMap` with auto-renewal on access
- **Live-reload**: File changes are detected and the cache is updated automatically (100ms debounce)
- **Garbage collection**: Cache entries expire after 1 hour of inactivity; GC runs every 10 minutes
- **Watcher cleanup**: File watchers are released when cache entries expire or files are deleted

### Usage

```typescript
import { getConfig } from "@simplysm/service-server";

const config = await getConfig<{ key: string }>("/path/to/.config.json");
```

This function is used internally by `ServiceContext.getConfig()` to load root and client-level configuration files.

### Behavior

1. Returns cached value if available (resets expiry timer)
2. If file does not exist, returns `undefined`
3. Reads and parses the JSON file, stores in cache
4. Registers a file watcher for live-reload
5. On file change: re-reads and updates cache
6. On file deletion: removes cache entry and closes watcher
