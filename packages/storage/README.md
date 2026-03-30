# @simplysm/storage

Storage client library for FTP, FTPS, and SFTP file operations.

Platform: Node.js.

## Installation

```bash
npm install @simplysm/storage
```

## API Overview

### Types

#### StorageConnConfig

Connection configuration for storage clients.

| Field | Type | Description |
|---|---|---|
| `host` | `string` | Server hostname or IP address |
| `port?` | `number` | Server port (protocol default if omitted) |
| `user?` | `string` | Username |
| `password?` | `string` | Password |

#### FileInfo

File/directory entry returned by `list()`.

| Field | Type | Description |
|---|---|---|
| `name` | `string` | File or directory name |
| `isFile` | `boolean` | `true` if this entry is a file, `false` if it is a directory |

#### StorageProtocol

```typescript
type StorageProtocol = "ftp" | "ftps" | "sftp";
```

#### StorageClient (interface)

Common interface implemented by all storage clients.

| Method | Signature | Description |
|---|---|---|
| `connect` | `(config: StorageConnConfig) => Promise<void>` | Connect to the server |
| `mkdir` | `(dirPath: string) => Promise<void>` | Create directory (recursive) |
| `rename` | `(fromPath: string, toPath: string) => Promise<void>` | Rename a file or directory |
| `list` | `(dirPath: string) => Promise<FileInfo[]>` | List directory contents |
| `readFile` | `(filePath: string) => Promise<Bytes>` | Read file contents |
| `exists` | `(filePath: string) => Promise<boolean>` | Check if file or directory exists |
| `put` | `(localPathOrBuffer: string \| Bytes, storageFilePath: string) => Promise<void>` | Upload a local file path or byte data to remote path |
| `uploadDir` | `(fromPath: string, toPath: string) => Promise<void>` | Upload entire local directory to remote path |
| `remove` | `(filePath: string) => Promise<void>` | Remove a file |
| `close` | `() => Promise<void>` | Close the connection. Safe to call multiple times. |

### Clients

#### FtpStorageClient

FTP/FTPS client. Implements `StorageClient`. Uses `basic-ftp` internally.

```typescript
constructor(secure?: boolean)
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `secure` | `boolean` | `false` | Set `true` for FTPS |

All methods from `StorageClient` are implemented. Prefer using `StorageFactory.connect` over direct instantiation.

#### SftpStorageClient

SFTP client. Implements `StorageClient`. Uses `ssh2-sftp-client` internally.

```typescript
constructor()
```

Authentication priority when `password` is not provided:
1. SSH private key (`~/.ssh/id_ed25519`) + SSH agent
2. SSH agent only (fallback when key parsing fails)

All methods from `StorageClient` are implemented. Prefer using `StorageFactory.connect` over direct instantiation.

### Factory

#### StorageFactory

Static factory class for creating and managing storage connections.

##### Static Methods

| Method | Signature | Description |
|---|---|---|
| `connect` | `<R>(type: StorageProtocol, config: StorageConnConfig, fn: (storage: StorageClient) => R \| Promise<R>) => Promise<R>` | Connect to storage, execute callback, and automatically close the connection. The connection is closed even if the callback throws. |

## Usage

### Recommended: StorageFactory (auto-managed connection)

```typescript
import { StorageFactory } from "@simplysm/storage";

const files = await StorageFactory.connect("sftp", {
  host: "example.com",
  user: "deploy",
}, async (client) => {
  await client.mkdir("/remote/path");
  await client.put("/local/file.txt", "/remote/file.txt");
  return client.list("/remote/path");
});
```

### Direct client usage

```typescript
import { SftpStorageClient } from "@simplysm/storage";

const client = new SftpStorageClient();
await client.connect({ host: "example.com", user: "deploy" });
try {
  const exists = await client.exists("/remote/file.txt");
  if (exists) {
    const data = await client.readFile("/remote/file.txt");
  }
} finally {
  await client.close();
}
```
