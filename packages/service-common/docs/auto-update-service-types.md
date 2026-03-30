# Auto-Update Service Types

## `AutoUpdateService`

Auto-update service interface for querying the latest client application version.

```typescript
export interface AutoUpdateService {
  getLastVersion(platform: string): Promise<
    | {
        version: string;
        downloadPath: string;
      }
    | undefined
  >;
}
```

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `getLastVersion` | `platform: string` | `Promise<{ version: string; downloadPath: string } \| undefined>` | Returns the latest version info for the given platform (e.g., `"win32"`, `"darwin"`, `"linux"`, `"android"`). Returns `undefined` if no version is available |
