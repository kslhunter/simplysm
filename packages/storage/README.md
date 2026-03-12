# @simplysm/storage

> Simplysm Package - Storage Module (node)

A unified storage client library for Node.js that provides a consistent API for FTP, FTPS, and SFTP file operations. The factory pattern with automatic connection management makes it easy to perform remote file operations without worrying about connection lifecycle. Internally uses [basic-ftp](https://www.npmjs.com/package/basic-ftp) for FTP/FTPS and [ssh2-sftp-client](https://www.npmjs.com/package/ssh2-sftp-client) for SFTP.

## API Reference

### StorageProtocol

```typescript
type StorageProtocol = "ftp" | "ftps" | "sftp";
```

Union type representing the supported storage protocols.

---

### StorageConnConfig

```typescript
interface StorageConnConfig {
  host: string;
  port?: number;
  user?: string;
  password?: string;
}
```

Connection configuration shared across all protocols. When `password` is omitted for SFTP, authentication falls back to SSH agent and `~/.ssh/id_ed25519` key file.

---

### FileInfo

```typescript
interface FileInfo {
  name: string;
  isFile: boolean;
}
```

Represents a file or directory entry returned by `list()`.

---

### StorageClient

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

Common interface implemented by all storage clients. Using `StorageFactory.connect()` is recommended over calling these methods directly, as it manages the connection lifecycle automatically.

| Method | Description |
|--------|-------------|
| `connect` | Open a connection to the remote server. |
| `mkdir` | Create a directory, including parent directories. |
| `rename` | Rename or move a remote file/directory. |
| `list` | List entries in a remote directory. |
| `readFile` | Read the contents of a remote file as `Bytes`. |
| `exists` | Check whether a remote file or directory exists. |
| `put` | Upload a local file path or byte data to a remote path. |
| `uploadDir` | Upload an entire local directory to a remote path. |
| `remove` | Delete a remote file. |
| `close` | Close the connection. Safe to call when already closed. |

---

### StorageFactory

```typescript
class StorageFactory {
  static connect<R>(
    type: StorageProtocol,
    config: StorageConnConfig,
    fn: (storage: StorageClient) => R | Promise<R>,
  ): Promise<R>;
}
```

Factory class that creates protocol-specific clients and manages the connection lifecycle. The `connect` method opens a connection, passes the client to the callback, and guarantees the connection is closed afterwards (even if the callback throws).

---

### FtpStorageClient

```typescript
class FtpStorageClient implements StorageClient {
  constructor(secure?: boolean);
}
```

FTP/FTPS storage client built on [basic-ftp](https://www.npmjs.com/package/basic-ftp). Pass `true` for the `secure` parameter to use FTPS. Using `StorageFactory.connect()` is recommended over direct instantiation.

---

### SftpStorageClient

```typescript
class SftpStorageClient implements StorageClient {
}
```

SFTP storage client built on [ssh2-sftp-client](https://www.npmjs.com/package/ssh2-sftp-client). When no password is provided, authenticates via SSH agent or `~/.ssh/id_ed25519` key file. Using `StorageFactory.connect()` is recommended over direct instantiation.

---

## Usage Examples

### Recommended: Using StorageFactory (auto-managed connection)

```typescript
import { StorageFactory } from "@simplysm/storage";

// Upload a file via SFTP
await StorageFactory.connect("sftp", { host: "example.com", user: "deploy" }, async (storage) => {
  await storage.mkdir("/uploads/2024");
  await storage.put("/local/path/file.txt", "/uploads/2024/file.txt");
});

// List files via FTP
const files = await StorageFactory.connect("ftp", { host: "ftp.example.com", user: "admin", password: "secret" }, async (storage) => {
  return await storage.list("/data");
});

// Upload a directory via FTPS
await StorageFactory.connect("ftps", { host: "secure.example.com", user: "admin", password: "secret" }, async (storage) => {
  await storage.uploadDir("/local/dist", "/remote/dist");
});
```

### Direct client usage

```typescript
import { SftpStorageClient } from "@simplysm/storage";

const client = new SftpStorageClient();
await client.connect({ host: "example.com", user: "deploy", password: "secret" });
try {
  const exists = await client.exists("/remote/file.txt");
  if (exists) {
    const data = await client.readFile("/remote/file.txt");
  }
  await client.put(new TextEncoder().encode("hello"), "/remote/hello.txt");
} finally {
  await client.close();
}
```
