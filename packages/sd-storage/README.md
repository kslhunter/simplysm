# @simplysm/sd-storage

Storage module providing a unified interface for FTP, FTPS, and SFTP file operations. Supports uploading files and buffers, creating directories, renaming, and reading files on remote servers.

## Installation

```bash
npm install @simplysm/sd-storage
```

## API Overview

| API | Type | Description |
|-----|------|-------------|
| `ISdStorage` | Interface | Common interface for all storage implementations |
| `ISdStorageConnConf` | Interface | Connection configuration shared by FTP and SFTP |
| `SdStorage` | Class | Static factory for connecting via FTP, FTPS, or SFTP |
| `SdFtpStorage` | Class | FTP/FTPS storage implementation |
| `SdSftpStorage` | Class | SFTP storage implementation |

## API Reference

### `ISdStorage`

Common interface implemented by all storage backends.

```typescript
interface ISdStorage {
  connectAsync(connectionConfig: any): Promise<void>;
  mkdirAsync(storageDirPath: string): Promise<void>;
  renameAsync(fromPath: string, toPath: string): Promise<void>;
  putAsync(localPathOrBuffer: string | Buffer, storageFilePath: string): Promise<void>;
  uploadDirAsync(fromPath: string, toPath: string): Promise<void>;
  closeAsync(): Promise<void>;
}
```

| Method | Description |
|--------|-------------|
| `connectAsync(connectionConfig)` | Establishes the connection to the remote server |
| `mkdirAsync(storageDirPath)` | Creates a directory (recursively) on the remote server |
| `renameAsync(fromPath, toPath)` | Renames or moves a file/directory on the remote server |
| `putAsync(localPathOrBuffer, storageFilePath)` | Uploads a local file path or Buffer to the remote server |
| `uploadDirAsync(fromPath, toPath)` | Uploads an entire directory to the remote server |
| `closeAsync()` | Closes the connection |

### `ISdStorageConnConf`

Connection configuration for remote storage.

```typescript
interface ISdStorageConnConf {
  host: string;
  port?: number;
  user?: string;
  pass?: string;
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `host` | `string` | Yes | Remote server hostname or IP |
| `port` | `number` | No | Connection port |
| `user` | `string` | No | Username for authentication |
| `pass` | `string` | No | Password for authentication |

### `SdStorage`

Static factory class that manages storage connections with automatic lifecycle handling. Uses a `busyCount` mechanism to prevent premature disconnection when multiple operations share the same connection.

```typescript
class SdStorage {
  static busyCount: number;

  static async connectAsync<T extends "sftp" | "ftp" | "ftps", R>(
    type: T,
    conf: ISdStorageConnConf,
    fn: (storage: T extends "sftp" ? SdSftpStorage : SdFtpStorage) => Promise<R>,
  ): Promise<R>;
}
```

#### `SdStorage.connectAsync(type, conf, fn)`

Creates a storage connection of the specified type, executes the callback, and automatically closes the connection when done.

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | `"sftp"` \| `"ftp"` \| `"ftps"` | Storage protocol type |
| `conf` | `ISdStorageConnConf` | Connection configuration |
| `fn` | `(storage) => Promise<R>` | Callback receiving the connected storage instance |

**Returns**: `Promise<R>` -- the result of the callback function.

### `SdFtpStorage`

FTP/FTPS storage implementation using `basic-ftp`. Implements `ISdStorage`.

```typescript
class SdFtpStorage implements ISdStorage {
  constructor(private readonly _secure: boolean);

  async connectAsync(connectionConfig: ISdStorageConnConf): Promise<void>;
  async mkdirAsync(storageDirPath: string): Promise<void>;
  async renameAsync(fromPath: string, toPath: string): Promise<void>;
  async readdirAsync(dirPath: string): Promise<{ name: string; isFile: boolean }[]>;
  async readFileAsync(filePath: string): Promise<Buffer>;
  async removeAsync(filePath: string): Promise<void>;
  async putAsync(localPathOrBuffer: string | Buffer, storageFilePath: string): Promise<void>;
  async uploadDirAsync(fromPath: string, toPath: string): Promise<void>;
  async closeAsync(): Promise<void>;
}
```

| Method | Description |
|--------|-------------|
| `connectAsync(connectionConfig)` | Connects to the FTP/FTPS server |
| `mkdirAsync(storageDirPath)` | Creates directory, ensuring parent directories exist |
| `renameAsync(fromPath, toPath)` | Renames a remote file or directory |
| `readdirAsync(dirPath)` | Lists directory contents with file type info |
| `readFileAsync(filePath)` | Downloads a file and returns its contents as a Buffer |
| `removeAsync(filePath)` | Removes a file from the remote server |
| `putAsync(localPathOrBuffer, storageFilePath)` | Uploads a file path or Buffer to the server |
| `uploadDirAsync(fromPath, toPath)` | Uploads an entire local directory |
| `closeAsync()` | Closes the FTP connection |

### `SdSftpStorage`

SFTP storage implementation using `ssh2-sftp-client`. Implements `ISdStorage`.

```typescript
class SdSftpStorage implements ISdStorage {
  async connectAsync(connectionConfig: ISdStorageConnConf): Promise<void>;
  async mkdirAsync(storageDirPath: string): Promise<void>;
  async renameAsync(fromPath: string, toPath: string): Promise<void>;
  async existsAsync(filePath: string): Promise<boolean>;
  async readdirAsync(filePath: string): Promise<string[]>;
  async readFileAsync(filePath: string): Promise<any>;
  async putAsync(localPathOrBuffer: string | Buffer, storageFilePath: string): Promise<void>;
  async uploadDirAsync(fromPath: string, toPath: string): Promise<void>;
  async closeAsync(): Promise<void>;
}
```

| Method | Description |
|--------|-------------|
| `connectAsync(connectionConfig)` | Connects to the SFTP server |
| `mkdirAsync(storageDirPath)` | Creates directory recursively |
| `renameAsync(fromPath, toPath)` | Renames a remote file or directory |
| `existsAsync(filePath)` | Checks if a file or directory exists |
| `readdirAsync(filePath)` | Lists file names in a directory |
| `readFileAsync(filePath)` | Downloads and returns file contents |
| `putAsync(localPathOrBuffer, storageFilePath)` | Uploads a file path or Buffer (uses `fastPut` for file paths) |
| `uploadDirAsync(fromPath, toPath)` | Uploads an entire local directory |
| `closeAsync()` | Closes the SFTP connection |

## Usage Examples

### Using SdStorage factory (recommended)

```typescript
import { SdStorage } from "@simplysm/sd-storage";

// SFTP upload
await SdStorage.connectAsync("sftp", {
  host: "example.com",
  port: 22,
  user: "deploy",
  pass: "secret",
}, async (storage) => {
  await storage.mkdirAsync("/var/www/app");
  await storage.putAsync("./dist/bundle.js", "/var/www/app/bundle.js");
  await storage.uploadDirAsync("./dist/assets", "/var/www/app/assets");
});

// FTP upload
await SdStorage.connectAsync("ftp", {
  host: "ftp.example.com",
  user: "deploy",
  pass: "secret",
}, async (storage) => {
  await storage.putAsync(Buffer.from("hello"), "/uploads/hello.txt");
});
```

### Using SdSftpStorage directly

```typescript
import { SdSftpStorage } from "@simplysm/sd-storage";

const sftp = new SdSftpStorage();
await sftp.connectAsync({ host: "example.com", user: "admin", pass: "secret" });

const exists = await sftp.existsAsync("/data/backup.tar.gz");
if (exists) {
  const content = await sftp.readFileAsync("/data/backup.tar.gz");
}

const files = await sftp.readdirAsync("/data");
await sftp.closeAsync();
```
