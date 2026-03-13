# @simplysm/sd-storage

Storage module providing a unified interface for FTP, FTPS, and SFTP file operations.

## Installation

```bash
npm install @simplysm/sd-storage
# or
yarn add @simplysm/sd-storage
```

## Quick Start

Use `SdStorage.connectAsync` for managed connections that handle open/close lifecycle automatically:

```typescript
import { SdStorage } from "@simplysm/sd-storage";

await SdStorage.connectAsync("sftp", { host: "example.com", user: "admin", pass: "secret" }, async (storage) => {
  await storage.mkdirAsync("/uploads/images");
  await storage.putAsync("./local-file.txt", "/uploads/file.txt");
  await storage.uploadDirAsync("./local-dir", "/uploads/dir");
});
```

## API Reference

### `SdStorage`

Static helper class that manages connection lifecycle and coordinates concurrent storage sessions.

#### `SdStorage.connectAsync(type, conf, fn)`

Opens a storage connection, executes the callback, and closes the connection when done. Internally tracks concurrent sessions to prevent premature disconnects when multiple storage operations run in parallel.

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | `"sftp" \| "ftp" \| "ftps"` | Protocol to use |
| `conf` | `ISdStorageConnConf` | Connection configuration |
| `fn` | `(storage) => Promise<R>` | Callback receiving the connected storage instance. Returns `SdSftpStorage` for `"sftp"`, `SdFtpStorage` for `"ftp"` / `"ftps"`. |

**Returns:** `Promise<R>` -- the value returned by the callback.

---

### `ISdStorageConnConf`

Connection configuration shared by all storage types.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `host` | `string` | Yes | Server hostname or IP |
| `port` | `number` | No | Server port (protocol default if omitted) |
| `user` | `string` | No | Username |
| `pass` | `string` | No | Password |

---

### `ISdStorage`

Common interface implemented by both `SdFtpStorage` and `SdSftpStorage`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `connectAsync` | `(connectionConfig: any) => Promise<void>` | Connect to the server |
| `mkdirAsync` | `(storageDirPath: string) => Promise<void>` | Create a directory (recursive) |
| `renameAsync` | `(fromPath: string, toPath: string) => Promise<void>` | Rename/move a file or directory |
| `putAsync` | `(localPathOrBuffer: string \| Buffer, storageFilePath: string) => Promise<void>` | Upload a local file path or Buffer to the server |
| `uploadDirAsync` | `(fromPath: string, toPath: string) => Promise<void>` | Upload an entire local directory to the server |
| `closeAsync` | `() => Promise<void>` | Close the connection |

---

### `SdFtpStorage`

FTP/FTPS storage implementation using [basic-ftp](https://www.npmjs.com/package/basic-ftp). Implements `ISdStorage`.

```typescript
const storage = new SdFtpStorage(secure); // true for FTPS, false for FTP
```

**Additional methods** beyond `ISdStorage`:

| Method | Signature | Description |
|--------|-----------|-------------|
| `readdirAsync` | `(dirPath: string) => Promise<{ name: string; isFile: boolean }[]>` | List directory contents with file type info |
| `readFileAsync` | `(filePath: string) => Promise<Buffer>` | Download a file as a Buffer |
| `removeAsync` | `(filePath: string) => Promise<void>` | Delete a file |

---

### `SdSftpStorage`

SFTP storage implementation using [ssh2-sftp-client](https://www.npmjs.com/package/ssh2-sftp-client). Implements `ISdStorage`.

```typescript
const storage = new SdSftpStorage();
```

**Additional methods** beyond `ISdStorage`:

| Method | Signature | Description |
|--------|-----------|-------------|
| `existsAsync` | `(filePath: string) => Promise<boolean>` | Check if a file or directory exists |
| `readdirAsync` | `(filePath: string) => Promise<string[]>` | List directory contents (names only) |
| `readFileAsync` | `(filePath: string) => Promise<any>` | Download a file |

## Usage Examples

### Upload a file from a Buffer

```typescript
await SdStorage.connectAsync("ftp", { host: "ftp.example.com", user: "user", pass: "pass" }, async (storage) => {
  const data = Buffer.from("Hello, World!");
  await storage.putAsync(data, "/remote/hello.txt");
});
```

### Upload a directory via SFTP

```typescript
await SdStorage.connectAsync("sftp", { host: "sftp.example.com", port: 22, user: "user", pass: "pass" }, async (storage) => {
  await storage.uploadDirAsync("./dist", "/var/www/app");
});
```

### Use FTPS with additional operations

```typescript
await SdStorage.connectAsync("ftps", { host: "ftps.example.com", user: "user", pass: "pass" }, async (storage) => {
  await storage.mkdirAsync("/backup/2026");
  await storage.putAsync("./dump.sql", "/backup/2026/dump.sql");

  const files = await storage.readdirAsync("/backup");
  console.log(files);
});
```

### Direct storage instance usage

When you need fine-grained control over the connection lifecycle:

```typescript
import { SdSftpStorage } from "@simplysm/sd-storage";

const storage = new SdSftpStorage();
await storage.connectAsync({ host: "example.com", user: "admin", pass: "secret" });

try {
  const exists = await storage.existsAsync("/data/config.json");
  if (exists) {
    const content = await storage.readFileAsync("/data/config.json");
    // process content...
  }
} finally {
  await storage.closeAsync();
}
```
