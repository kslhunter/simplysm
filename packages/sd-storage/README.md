# @simplysm/sd-storage

FTP/SFTP storage client for file transfer operations. Provides a unified interface for connecting to FTP (with optional FTPS) and SFTP servers.

## Installation

```bash
yarn add @simplysm/sd-storage
```

## Main Modules

### SdStorage

Static utility class for managing storage connections with automatic connect/disconnect lifecycle.

```typescript
import { SdStorage } from "@simplysm/sd-storage";
```

#### `SdStorage.busyCount: number`

Number of currently active storage connections.

#### `SdStorage.connectAsync<T, R>(type: T, conf: ISdStorageConnConf, fn: (storage: T extends "sftp" ? SdSftpStorage : SdFtpStorage) => Promise<R>): Promise<R>`

Connects to a storage server, executes the callback function, and automatically disconnects. Manages concurrent sessions via `busyCount`. When `type` is `"sftp"`, the callback receives an `SdSftpStorage` instance; otherwise it receives an `SdFtpStorage` instance.

```typescript
import { SdStorage } from "@simplysm/sd-storage";

const result = await SdStorage.connectAsync(
  "sftp",
  {
    host: "example.com",
    port: 22,
    user: "admin",
    pass: "password",
  },
  async (storage) => {
    // storage is SdSftpStorage here
    await storage.mkdirAsync("/uploads/new-folder");
    await storage.putAsync(Buffer.from("hello"), "/uploads/hello.txt");
    return "done";
  },
);

await SdStorage.connectAsync(
  "ftp",
  { host: "ftp.example.com", user: "user", pass: "pass" },
  async (storage) => {
    // storage is SdFtpStorage here
    await storage.putAsync("/local/file.txt", "/remote/file.txt");
  },
);
```

---

### SdFtpStorage

FTP/FTPS storage implementation. Implements `ISdStorage`.

```typescript
import { SdFtpStorage } from "@simplysm/sd-storage";
```

#### Constructor

```typescript
new SdFtpStorage(secure: boolean)
```

- `secure: true` — uses FTPS (FTP over TLS)
- `secure: false` — uses plain FTP

#### Methods (from ISdStorage)

- `connectAsync(connectionConfig: ISdStorageConnConf): Promise<void>` — Connect to the FTP server
- `mkdirAsync(storageDirPath: string): Promise<void>` — Create a directory (ensures it exists)
- `renameAsync(fromPath: string, toPath: string): Promise<void>` — Rename/move a file or directory
- `putAsync(localPathOrBuffer: string | Buffer, storageFilePath: string): Promise<void>` — Upload a file from local path or Buffer
- `uploadDirAsync(fromPath: string, toPath: string): Promise<void>` — Upload an entire directory
- `closeAsync(): Promise<void>` — Close the connection

#### Additional Methods

- `readdirAsync(dirPath: string): Promise<{ name: string; isFile: boolean }[]>` — List directory contents with file type info
- `readFileAsync(filePath: string): Promise<Buffer>` — Read a file and return its contents as a Buffer
- `removeAsync(filePath: string): Promise<void>` — Remove a file or directory

---

### SdSftpStorage

SFTP storage implementation. Implements `ISdStorage`.

```typescript
import { SdSftpStorage } from "@simplysm/sd-storage";
```

#### Methods (from ISdStorage)

- `connectAsync(connectionConfig: ISdStorageConnConf): Promise<void>` — Connect to the SFTP server
- `mkdirAsync(storageDirPath: string): Promise<void>` — Create a directory (recursive)
- `renameAsync(fromPath: string, toPath: string): Promise<void>` — Rename/move a file or directory
- `putAsync(localPathOrBuffer: string | Buffer, storageFilePath: string): Promise<void>` — Upload a file from local path (uses `fastPut`) or Buffer (uses `put`)
- `uploadDirAsync(fromPath: string, toPath: string): Promise<void>` — Upload an entire directory
- `closeAsync(): Promise<void>` — Close the connection

#### Additional Methods

- `existsAsync(filePath: string): Promise<boolean>` — Check if a file or directory exists
- `readdirAsync(filePath: string): Promise<string[]>` — List directory contents (file names only)
- `readFileAsync(filePath: string): Promise<any>` — Read a file

## Types

### `ISdStorage`

Common interface for all storage implementations.

```typescript
import { ISdStorage } from "@simplysm/sd-storage";
```

| Method           | Signature                                                                         |
| ---------------- | --------------------------------------------------------------------------------- |
| `connectAsync`   | `(connectionConfig: any) => Promise<void>`                                        |
| `mkdirAsync`     | `(storageDirPath: string) => Promise<void>`                                       |
| `renameAsync`    | `(fromPath: string, toPath: string) => Promise<void>`                             |
| `putAsync`       | `(localPathOrBuffer: string \| Buffer, storageFilePath: string) => Promise<void>` |
| `uploadDirAsync` | `(fromPath: string, toPath: string) => Promise<void>`                             |
| `closeAsync`     | `() => Promise<void>`                                                             |

### `ISdStorageConnConf`

Connection configuration for storage servers.

```typescript
import { ISdStorageConnConf } from "@simplysm/sd-storage";
```

```typescript
interface ISdStorageConnConf {
  host: string;
  port?: number;
  user?: string;
  pass?: string;
}
```
