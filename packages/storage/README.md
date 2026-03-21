# @simplysm/storage

Storage Module (node) -- FTP, FTPS, and SFTP storage client with a unified interface and factory pattern.

## Installation

```bash
npm install @simplysm/storage
```

## API Overview

### Types

| API | Type | Description |
|-----|------|-------------|
| `StorageProtocol` | type | Protocol type: `"ftp"`, `"ftps"`, `"sftp"` |
| `StorageConnConfig` | interface | Connection configuration (host, port, user, password) |
| `FileInfo` | interface | File entry info (`name`, `isFile`) |
| `StorageClient` | interface | Unified storage client interface |

### Factory

| API | Type | Description |
|-----|------|-------------|
| `StorageFactory` | class | Factory that creates and manages storage connections |

### Clients

| API | Type | Description |
|-----|------|-------------|
| `FtpStorageClient` | class | FTP/FTPS storage client (basic-ftp) |
| `SftpStorageClient` | class | SFTP storage client (ssh2-sftp-client) |

## `StorageProtocol`

```typescript
type StorageProtocol = "ftp" | "ftps" | "sftp";
```

## `StorageConnConfig`

```typescript
interface StorageConnConfig {
  host: string;
  port?: number;
  user?: string;
  password?: string;
}
```

## `FileInfo`

```typescript
interface FileInfo {
  name: string;
  isFile: boolean;
}
```

## `StorageClient`

```typescript
interface StorageClient {
  connect(config: StorageConnConfig): Promise<void>;
  mkdir(dirPath: string): Promise<void>;
  rename(fromPath: string, toPath: string): Promise<void>;
  list(dirPath: string): Promise<FileInfo[]>;
  readFile(filePath: string): Promise<Bytes>;
  exists(filePath: string): Promise<boolean>;
  put(localPathOrBuffer: string | Bytes, storageFilePath: string): Promise<void>;
  uploadDir(fromPath: string, toPath: string): Promise<void>;
  remove(filePath: string): Promise<void>;
  close(): Promise<void>;
}
```

## `StorageFactory`

```typescript
class StorageFactory {
  static async connect<R>(
    type: StorageProtocol,
    config: StorageConnConfig,
    fn: (storage: StorageClient) => R | Promise<R>,
  ): Promise<R>;
}
```

Creates a storage connection, executes the callback, and automatically closes the connection. The connection is closed even if the callback throws an exception. This is the recommended way to use storage clients.

## `FtpStorageClient`

```typescript
class FtpStorageClient implements StorageClient {
  constructor(secure?: boolean);
  async connect(config: StorageConnConfig): Promise<void>;
  async mkdir(dirPath: string): Promise<void>;
  async rename(fromPath: string, toPath: string): Promise<void>;
  async list(dirPath: string): Promise<FileInfo[]>;
  async readFile(filePath: string): Promise<Bytes>;
  async exists(filePath: string): Promise<boolean>;
  async put(localPathOrBuffer: string | Bytes, storageFilePath: string): Promise<void>;
  async uploadDir(fromPath: string, toPath: string): Promise<void>;
  async remove(filePath: string): Promise<void>;
  close(): Promise<void>;
}
```

FTP/FTPS storage client. The `secure` constructor parameter controls FTPS mode. Use `StorageFactory.connect` instead of direct usage for automatic connection lifecycle management.

## `SftpStorageClient`

```typescript
class SftpStorageClient implements StorageClient {
  async connect(config: StorageConnConfig): Promise<void>;
  async mkdir(dirPath: string): Promise<void>;
  async rename(fromPath: string, toPath: string): Promise<void>;
  async list(dirPath: string): Promise<FileInfo[]>;
  async readFile(filePath: string): Promise<Bytes>;
  async exists(filePath: string): Promise<boolean>;
  async put(localPathOrBuffer: string | Bytes, storageFilePath: string): Promise<void>;
  async uploadDir(fromPath: string, toPath: string): Promise<void>;
  async remove(filePath: string): Promise<void>;
  async close(): Promise<void>;
}
```

SFTP storage client. Supports password authentication and SSH key/agent authentication. Use `StorageFactory.connect` instead of direct usage for automatic connection lifecycle management.

## Usage Examples

### Upload files via StorageFactory (recommended)

```typescript
import { StorageFactory } from "@simplysm/storage";

await StorageFactory.connect("sftp", {
  host: "example.com",
  user: "deploy",
  password: "secret",
}, async (storage) => {
  await storage.mkdir("/var/www/app");
  await storage.put("/local/dist/bundle.js", "/var/www/app/bundle.js");
});
// Connection is automatically closed
```

### List remote directory

```typescript
import { StorageFactory } from "@simplysm/storage";

const files = await StorageFactory.connect("ftp", {
  host: "files.example.com",
  user: "admin",
  password: "pass",
}, async (storage) => {
  return await storage.list("/uploads");
});

for (const file of files) {
  // file.name, file.isFile
}
```

### Upload entire directory via FTPS

```typescript
import { StorageFactory } from "@simplysm/storage";

await StorageFactory.connect("ftps", {
  host: "secure.example.com",
  user: "deploy",
  password: "secret",
}, async (storage) => {
  await storage.uploadDir("/local/dist", "/remote/app");
});
```
