# Publish Configuration Types

## `SdPublishConfig`

Union of all publish configuration types. Discriminated by the `type` field.

```typescript
type SdPublishConfig = SdNpmPublishConfig | SdLocalDirectoryPublishConfig | SdStoragePublishConfig;
```

| Variant | Discriminant (`type`) |
|---------|----------------------|
| `SdNpmPublishConfig` | `"npm"` |
| `SdLocalDirectoryPublishConfig` | `"local-directory"` |
| `SdStoragePublishConfig` | `"ftp"`, `"ftps"`, `"sftp"` |

## `SdNpmPublishConfig`

npm registry publish configuration.

```typescript
interface SdNpmPublishConfig {
  type: "npm";
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"npm"` | Publish type discriminator |

## `SdLocalDirectoryPublishConfig`

Copy build output to a local directory.

```typescript
interface SdLocalDirectoryPublishConfig {
  type: "local-directory";
  path: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"local-directory"` | Publish type discriminator |
| `path` | `string` | Deployment target path (supports environment variable substitution: `%VER%`, `%PROJECT%`) |

## `SdStoragePublishConfig`

Upload build output to FTP/FTPS/SFTP server.

```typescript
interface SdStoragePublishConfig {
  type: "ftp" | "ftps" | "sftp";
  host: string;
  port?: number;
  path?: string;
  user?: string;
  password?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"ftp" \| "ftps" \| "sftp"` | Protocol |
| `host` | `string` | Server hostname |
| `port` | `number` | Server port |
| `path` | `string` | Remote path |
| `user` | `string` | Username |
| `password` | `string` | Password |

## `SdPostPublishScriptConfig`

Script to run after publish completes.

```typescript
interface SdPostPublishScriptConfig {
  type: "script";
  cmd: string;
  args: string[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"script"` | Config type discriminator |
| `cmd` | `string` | Command to execute |
| `args` | `string[]` | Command arguments (supports environment variable substitution: `%VER%`, `%PROJECT%`) |
