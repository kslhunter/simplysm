# @simplysm/storage

Simplysm Package - Storage Module (node). Provides FTP, FTPS, and SFTP storage client implementations with a factory for managed connections.

## Installation

```bash
npm install @simplysm/storage
```

## API Overview

### Types

| API | Type | Description |
|-----|------|-------------|
| `StorageConnConfig` | interface | Storage connection configuration |
| `FileInfo` | interface | File/directory entry information |
| `StorageClient` | interface | Storage client interface |
| `StorageProtocol` | type | Protocol type (`"ftp" \| "ftps" \| "sftp"`) |

### Clients

| API | Type | Description |
|-----|------|-------------|
| `FtpStorageClient` | class | FTP/FTPS storage client (uses basic-ftp) |
| `SftpStorageClient` | class | SFTP storage client (uses ssh2-sftp-client) |

### Factory

| API | Type | Description |
|-----|------|-------------|
| `StorageFactory` | class | Storage client factory with managed connections |

---

### `StorageProtocol`

```typescript
type StorageProtocol = "ftp" | "ftps" | "sftp"
```

### `StorageConnConfig`

| Field | Type | Description |
|-------|------|-------------|
| `host` | `string` | Server hostname |
| `port` | `number?` | Server port |
| `user` | `string?` | Username |
| `password` | `string?` | Password (SFTP: if omitted, uses SSH agent + key file) |

### `FileInfo`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | File or directory name |
| `isFile` | `boolean` | Whether the entry is a file |

### `StorageClient`

Interface implemented by both `FtpStorageClient` and `SftpStorageClient`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `connect` | `(config: StorageConnConfig) => Promise<void>` | Connect to server |
| `mkdir` | `(dirPath: string) => Promise<void>` | Create directory (recursive) |
| `rename` | `(fromPath: string, toPath: string) => Promise<void>` | Rename file/directory |
| `list` | `(dirPath: string) => Promise<FileInfo[]>` | List directory contents |
| `readFile` | `(filePath: string) => Promise<Bytes>` | Read file |
| `exists` | `(filePath: string) => Promise<boolean>` | Check existence |
| `put` | `(localPathOrBuffer: string \| Bytes, storageFilePath: string) => Promise<void>` | Upload file (local path or byte data) |
| `uploadDir` | `(fromPath: string, toPath: string) => Promise<void>` | Upload entire directory |
| `remove` | `(filePath: string) => Promise<void>` | Delete file |
| `close` | `() => Promise<void>` | Close connection |

### `FtpStorageClient`

Implements `StorageClient` using FTP/FTPS protocol via the `basic-ftp` library.

| Method | Signature | Description |
|--------|-----------|-------------|
| `constructor` | `(secure?: boolean)` | Create client (`true` for FTPS, `false` for FTP) |

All `StorageClient` methods are implemented. Using `StorageFactory.connect` is recommended over direct usage.

### `SftpStorageClient`

Implements `StorageClient` using SFTP protocol via the `ssh2-sftp-client` library. Supports password authentication and SSH agent + key file authentication.

All `StorageClient` methods are implemented. Using `StorageFactory.connect` is recommended over direct usage.

### `StorageFactory`

| Method | Signature | Description |
|--------|-----------|-------------|
| `connect` | `<R>(type: StorageProtocol, config: StorageConnConfig, fn: (storage: StorageClient) => R \| Promise<R>) => Promise<R>` | Connect, execute callback, auto-close |

## Usage Examples

### Using StorageFactory (recommended)

```typescript
import { StorageFactory } from "@simplysm/storage";

await StorageFactory.connect("sftp", {
  host: "example.com",
  user: "deploy",
  password: "secret",
}, async (storage) => {
  await storage.uploadDir("./dist", "/var/www/app");
  const files = await storage.list("/var/www/app");
});
```

### Using client directly

```typescript
import { FtpStorageClient } from "@simplysm/storage";

const client = new FtpStorageClient(true); // FTPS
await client.connect({ host: "ftp.example.com", user: "admin", password: "pass" });
try {
  await client.put("./build.zip", "/releases/build.zip");
  const exists = await client.exists("/releases/build.zip");
} finally {
  await client.close();
}
```

### SFTP with SSH key authentication

```typescript
import { StorageFactory } from "@simplysm/storage";

// Omit password to use SSH agent + ~/.ssh/id_ed25519
await StorageFactory.connect("sftp", {
  host: "example.com",
  user: "deploy",
}, async (storage) => {
  await storage.put(fileBytes, "/data/upload.bin");
});
```
