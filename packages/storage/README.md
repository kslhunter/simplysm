# @simplysm/storage

Simplysm Package - Storage Module (node)

Provides FTP, FTPS, and SFTP storage clients with a unified interface, plus a factory for connection management.

## Installation

```bash
pnpm add @simplysm/storage
```

## Main Modules

### Types

#### `StorageConnConfig`

Connection configuration shared by all storage clients.

```ts
import { StorageConnConfig } from "@simplysm/storage";

const config: StorageConnConfig = {
  host: "storage.example.com",
  port: 22,        // optional — defaults to the protocol default
  user: "admin",   // optional
  pass: "secret",  // optional
};
```

| Property | Type     | Required | Description                              |
| -------- | -------- | -------- | ---------------------------------------- |
| `host`   | `string` | yes      | Hostname or IP address of the server     |
| `port`   | `number` | no       | Port number (defaults to protocol default) |
| `user`   | `string` | no       | Username for authentication              |
| `pass`   | `string` | no       | Password for authentication              |

---

#### `FileInfo`

Describes a single entry returned by `readdir`.

```ts
import { FileInfo } from "@simplysm/storage";

// Example entry
const entry: FileInfo = { name: "report.pdf", isFile: true };
```

| Property | Type      | Description                                  |
| -------- | --------- | -------------------------------------------- |
| `name`   | `string`  | File or directory name (not the full path)   |
| `isFile` | `boolean` | `true` if it is a file, `false` if directory |

---

#### `Storage`

The unified storage interface implemented by all client classes. Use this type when writing code that is protocol-agnostic.

```ts
import { Storage } from "@simplysm/storage";

async function uploadFile(storage: Storage, localPath: string, remotePath: string) {
  await storage.put(localPath, remotePath);
}
```

| Method                                                        | Returns               | Description                                                   |
| ------------------------------------------------------------- | --------------------- | ------------------------------------------------------------- |
| `connect(config: StorageConnConfig)`                          | `Promise<void>`       | Open a connection to the server                               |
| `mkdir(dirPath: string)`                                      | `Promise<void>`       | Create a directory (including parents)                        |
| `rename(fromPath: string, toPath: string)`                    | `Promise<void>`       | Rename or move a remote path                                  |
| `readdir(dirPath: string)`                                    | `Promise<FileInfo[]>` | List entries in a directory                                   |
| `readFile(filePath: string)`                                  | `Promise<Bytes>`      | Download a file as raw bytes                                  |
| `exists(filePath: string)`                                    | `Promise<boolean>`    | Check whether a path exists                                   |
| `put(localPathOrBuffer: string \| Bytes, storageFilePath: string)` | `Promise<void>` | Upload a local file path or byte buffer to the remote path    |
| `uploadDir(fromPath: string, toPath: string)`                 | `Promise<void>`       | Upload an entire local directory to a remote path             |
| `remove(filePath: string)`                                    | `Promise<void>`       | Delete a remote file                                          |
| `close()`                                                     | `Promise<void>`       | Close the connection                                          |

---

#### `StorageType`

Union type that identifies the storage protocol.

```ts
import { StorageType } from "@simplysm/storage";

const type: StorageType = "sftp"; // "ftp" | "ftps" | "sftp"
```

| Value    | Protocol                        |
| -------- | ------------------------------- |
| `"ftp"`  | Plain FTP                       |
| `"ftps"` | FTP with TLS/SSL (explicit)     |
| `"sftp"` | SSH File Transfer Protocol      |

---

### Clients

#### `FtpStorageClient`

Storage client for FTP and FTPS. Implements `Storage`.

The constructor accepts a `secure` boolean that selects FTPS when `true` (default `false`).
Using `StorageFactory.connect` is recommended over direct instantiation.

```ts
import { FtpStorageClient } from "@simplysm/storage";

// Plain FTP
const client = new FtpStorageClient();

// FTPS
const secureClient = new FtpStorageClient(true);

await client.connect({ host: "ftp.example.com", user: "user", pass: "pass" });

try {
  const entries = await client.readdir("/uploads");
  console.log(entries);

  await client.put("/local/file.txt", "/uploads/file.txt");
  const exists = await client.exists("/uploads/file.txt");
  console.log(exists); // true
} finally {
  await client.close();
}
```

**Constructor**

```ts
new FtpStorageClient(secure?: boolean)
```

| Parameter | Type      | Default | Description                              |
| --------- | --------- | ------- | ---------------------------------------- |
| `secure`  | `boolean` | `false` | `true` to use FTPS (TLS), `false` for FTP |

**Methods** — all defined by the `Storage` interface.

| Method         | Notes                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------- |
| `connect`      | Throws if already connected. Use `StorageFactory.connect` to avoid manual lifecycle management.     |
| `mkdir`        | Creates parent directories automatically.                                                           |
| `rename`       | Renames or moves a remote path.                                                                     |
| `readdir`      | Returns a list of `FileInfo` entries for the given directory.                                       |
| `readFile`     | Downloads and returns file content as `Bytes`.                                                      |
| `exists`       | Uses `size()` for files (O(1)) and `list()` for directories. Returns `false` on any error.          |
| `put`          | Accepts a local file path string or a `Bytes` buffer.                                               |
| `uploadDir`    | Recursively uploads a local directory.                                                              |
| `remove`       | Deletes a remote file.                                                                              |
| `close`        | Safe to call when already closed. Can reconnect on the same instance after closing.                 |

---

#### `SftpStorageClient`

Storage client for SFTP (SSH File Transfer Protocol). Implements `Storage`.

When `pass` is omitted from the config, authentication falls back to SSH agent and the key file at `~/.ssh/id_ed25519`.
Using `StorageFactory.connect` is recommended over direct instantiation.

```ts
import { SftpStorageClient } from "@simplysm/storage";

const client = new SftpStorageClient();

// Password authentication
await client.connect({ host: "sftp.example.com", port: 22, user: "user", pass: "pass" });

// Key-based authentication (omit pass)
await client.connect({ host: "sftp.example.com", user: "user" });

try {
  await client.mkdir("/uploads/2024");
  await client.put("/local/report.csv", "/uploads/2024/report.csv");
  const entries = await client.readdir("/uploads/2024");
  console.log(entries);
} finally {
  await client.close();
}
```

**Constructor**

```ts
new SftpStorageClient()
```

No constructor parameters.

**Methods** — all defined by the `Storage` interface.

| Method         | Notes                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| `connect`      | Throws if already connected. When `pass` is absent, authenticates via SSH agent / `~/.ssh/id_ed25519`.  |
| `mkdir`        | Creates parent directories automatically.                                                               |
| `rename`       | Renames or moves a remote path.                                                                         |
| `readdir`      | Returns a list of `FileInfo` entries for the given directory.                                           |
| `readFile`     | Downloads and returns file content as `Bytes`.                                                          |
| `exists`       | Returns `false` even when the parent directory does not exist, or on any error.                         |
| `put`          | Accepts a local file path string (uses `fastPut`) or a `Bytes` buffer.                                  |
| `uploadDir`    | Recursively uploads a local directory.                                                                  |
| `remove`       | Deletes a remote file.                                                                                  |
| `close`        | Safe to call when already closed. Can reconnect on the same instance after closing.                     |

---

### Factory

#### `StorageFactory`

Creates and manages storage client connections. Preferred over constructing clients directly.

**`StorageFactory.connect`** (static)

Connects to storage, executes the callback, and closes the connection automatically — even if the callback throws.

```ts
import { StorageFactory } from "@simplysm/storage";

const result = await StorageFactory.connect(
  "sftp",
  { host: "sftp.example.com", user: "deploy", pass: "secret" },
  async (storage) => {
    await storage.mkdir("/var/www/releases/v2");
    await storage.uploadDir("/local/build", "/var/www/releases/v2");
    return await storage.readdir("/var/www/releases/v2");
  },
);

console.log(result); // FileInfo[]
```

```ts
static connect<R>(
  type: StorageType,
  config: StorageConnConfig,
  fn: (storage: Storage) => R | Promise<R>,
): Promise<R>
```

| Parameter | Type                              | Description                                          |
| --------- | --------------------------------- | ---------------------------------------------------- |
| `type`    | `StorageType`                     | Protocol: `"ftp"`, `"ftps"`, or `"sftp"`            |
| `config`  | `StorageConnConfig`               | Connection parameters (host, port, user, pass)       |
| `fn`      | `(storage: Storage) => R \| Promise<R>` | Callback that receives the connected client    |

Returns a `Promise<R>` that resolves to the value returned by `fn`.

## Types

| Name                | Kind        | Description                                         |
| ------------------- | ----------- | --------------------------------------------------- |
| `StorageConnConfig` | `interface` | Connection configuration (host, port, user, pass)   |
| `FileInfo`          | `interface` | File/directory entry returned by `readdir`          |
| `Storage`           | `interface` | Unified interface implemented by all storage clients |
| `StorageType`       | `type`      | Protocol discriminant: `"ftp" \| "ftps" \| "sftp"` |
