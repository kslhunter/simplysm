# @simplysm/storage

A storage client package that supports FTP, FTPS, and SFTP protocols. Through the unified `Storage` interface, you can perform file upload, download, directory manipulation and other operations with the same API regardless of protocol.

Using `StorageFactory`, you can automatically manage connection/disconnection, and you can also directly instantiate `FtpStorageClient` or `SftpStorageClient` if needed.

## Installation

```bash
npm install @simplysm/storage
# or
pnpm add @simplysm/storage
```

## Main Modules

### Export List

| Module | Type | Description |
|------|------|------|
| `StorageFactory` | Class | Creates clients based on storage type and automatically manages connection/disconnection |
| `FtpStorageClient` | Class | FTP/FTPS protocol client (based on `basic-ftp`) |
| `SftpStorageClient` | Class | SFTP protocol client (based on `ssh2-sftp-client`) |
| `Storage` | Interface | Common interface implemented by all storage clients |
| `StorageConnConfig` | Interface | Connection configuration |
| `FileInfo` | Interface | Directory entry information |
| `StorageType` | Type | Storage protocol types (`"ftp" \| "ftps" \| "sftp"`) |

## Type Definitions

### StorageConnConfig

Configuration required for server connection.

```typescript
interface StorageConnConfig {
  host: string;   // Server host
  port?: number;  // Port (FTP default: 21, SFTP default: 22)
  user?: string;  // Username
  pass?: string;  // Password (required for FTP/FTPS; optional for SFTP)
}
```

**SFTP SSH Key Authentication:**
- If `pass` is omitted for SFTP connections, the client automatically attempts authentication using:
  1. SSH key file at `~/.ssh/id_ed25519`
  2. SSH agent (if `SSH_AUTH_SOCK` environment variable is set)
  - Both methods are tried in order; if the key file authentication fails (e.g., encrypted keys), the client falls back to agent-only authentication.

### FileInfo

File/directory information returned by `readdir()`.

```typescript
interface FileInfo {
  name: string;    // File or directory name
  isFile: boolean; // true if file, false if directory
}
```

### StorageType

Supported storage protocol types.

```typescript
type StorageType = "ftp" | "ftps" | "sftp";
```

| Value | Protocol | Default Port | Description |
|-----|---------|----------|------|
| `"ftp"` | FTP | 21 | Unencrypted FTP |
| `"ftps"` | FTPS | 21 | TLS-encrypted FTP |
| `"sftp"` | SFTP | 22 | SSH-based file transfer |

### Storage Interface

Common interface implemented by all storage clients (`FtpStorageClient`, `SftpStorageClient`). `Bytes` is a `Uint8Array` type alias defined in `@simplysm/core-common`.

| Method | Signature | Description |
|--------|---------|------|
| `connect` | `(config: StorageConnConfig) => Promise<void>` | Connect to server |
| `close` | `() => Promise<void>` | Close connection |
| `put` | `(localPathOrBuffer: string \| Bytes, storageFilePath: string) => Promise<void>` | Upload file (local path or byte data) |
| `readFile` | `(filePath: string) => Promise<Bytes>` | Download file (returns `Bytes`) |
| `readdir` | `(dirPath: string) => Promise<FileInfo[]>` | List directory contents |
| `remove` | `(filePath: string) => Promise<void>` | Delete file |
| `exists` | `(filePath: string) => Promise<boolean>` | Check if file/directory exists |
| `mkdir` | `(dirPath: string) => Promise<void>` | Create directory (recursive) |
| `rename` | `(fromPath: string, toPath: string) => Promise<void>` | Rename file/directory |
| `uploadDir` | `(fromPath: string, toPath: string) => Promise<void>` | Upload entire local directory to remote |

## Usage

### StorageFactory (Recommended)

`StorageFactory.connect()` automatically manages connection and disconnection with a callback pattern. The connection is always closed even if an exception occurs in the callback, so it's recommended over using clients directly.

```typescript
import { StorageFactory } from "@simplysm/storage";

// FTP connection
const result = await StorageFactory.connect("ftp", {
  host: "ftp.example.com",
  port: 21,
  user: "username",
  pass: "password",
}, async (client) => {
  // Upload local file to remote server
  await client.put("/local/path/file.txt", "/remote/path/file.txt");

  // Upload byte data directly
  const data = new TextEncoder().encode("hello world");
  await client.put(data, "/remote/path/hello.txt");

  // Download remote file
  const content = await client.readFile("/remote/path/file.txt");

  // The callback's return value becomes the return value of StorageFactory.connect()
  return content;
});
```

```typescript
// FTPS connection (TLS encryption)
await StorageFactory.connect("ftps", {
  host: "ftps.example.com",
  user: "username",
  pass: "password",
}, async (client) => {
  await client.put("/local/file.txt", "/remote/file.txt");
});
```

```typescript
// SFTP connection with password
await StorageFactory.connect("sftp", {
  host: "sftp.example.com",
  port: 22,
  user: "username",
  pass: "password",
}, async (client) => {
  // List directory contents
  const files = await client.readdir("/remote/path");
  for (const file of files) {
    console.log(`${file.name} - ${file.isFile ? "File" : "Directory"}`);
  }

  // Upload entire directory
  await client.uploadDir("/local/dir", "/remote/dir");
});
```

```typescript
// SFTP connection with SSH key (if pass is omitted, uses ~/.ssh/id_ed25519 or SSH agent)
await StorageFactory.connect("sftp", {
  host: "sftp.example.com",
  port: 22,
  user: "username",
  // No password provided - uses SSH key authentication
}, async (client) => {
  const files = await client.readdir("/remote/path");
  await client.uploadDir("/local/dir", "/remote/dir");
});
```

### FtpStorageClient (Direct Usage)

Client that uses FTP or FTPS protocol. The `secure` parameter in the constructor determines whether to use FTPS.

```typescript
import { FtpStorageClient } from "@simplysm/storage";

// FTP client (secure: false is default)
const client = new FtpStorageClient();

// FTPS client
const secureClient = new FtpStorageClient(true);

await client.connect({
  host: "ftp.example.com",
  port: 21,
  user: "username",
  pass: "password",
});

try {
  // Upload file - from local file path
  await client.put("/local/path/file.txt", "/remote/path/file.txt");

  // Upload file - from Uint8Array byte data
  const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
  await client.put(bytes, "/remote/path/hello.bin");

  // Download file (returns Bytes, i.e. Uint8Array)
  const data = await client.readFile("/remote/path/file.txt");
  const text = new TextDecoder().decode(data);

  // List directory contents
  const files = await client.readdir("/remote/path");

  // Check if file/directory exists
  const exists = await client.exists("/remote/path/file.txt");

  // Create directory (creates parent directories too)
  await client.mkdir("/remote/new/nested/path");

  // Rename file
  await client.rename("/remote/old-name.txt", "/remote/new-name.txt");

  // Delete file
  await client.remove("/remote/path/file.txt");

  // Upload entire local directory to remote
  await client.uploadDir("/local/dir", "/remote/dir");
} finally {
  // Connection must be closed
  await client.close();
}
```

### SftpStorageClient (Direct Usage)

Client that uses SFTP protocol. It implements the same `Storage` interface as `FtpStorageClient`, so the API is identical.

```typescript
import { SftpStorageClient } from "@simplysm/storage";

const client = new SftpStorageClient();

// Connection with password
await client.connect({
  host: "sftp.example.com",
  port: 22,
  user: "username",
  pass: "password",
});

try {
  // All methods of the Storage interface can be used identically
  await client.put("/local/path/file.txt", "/remote/path/file.txt");
  const data = await client.readFile("/remote/path/file.txt");
  const files = await client.readdir("/remote/path");
  const exists = await client.exists("/remote/path/file.txt");
  await client.mkdir("/remote/new/path");
  await client.rename("/remote/old.txt", "/remote/new.txt");
  await client.remove("/remote/path/file.txt");
  await client.uploadDir("/local/dir", "/remote/dir");
} finally {
  await client.close();
}
```

```typescript
// Connection with SSH key (password omitted)
const client = new SftpStorageClient();

await client.connect({
  host: "sftp.example.com",
  port: 22,
  user: "username",
  // Uses ~/.ssh/id_ed25519 or SSH agent for authentication
});

try {
  await client.put("/local/path/file.txt", "/remote/path/file.txt");
  // ... other operations
} finally {
  await client.close();
}
```

## Caveats

### Connection Management

- Using `StorageFactory.connect()` is recommended. The connection is automatically closed when the callback ends, and closure is guaranteed in the `finally` block even if an exception occurs.
- When using clients directly, you must call `close()` with a `try/finally` pattern. Otherwise, connections may leak.
- Calling `connect()` again on an already connected instance will cause an error. If reconnection is needed, call `close()` first.
- Calling `close()` when already closed does not cause an error.

### exists() Behavior

- FTP: Checks files with the `SIZE` command (O(1)), and on failure, lists the parent directory to check if a directory exists. Performance may degrade in directories with many entries.
- SFTP: Uses `ssh2-sftp-client`'s `exists()` method, returns `true` for files (`"-"`), directories (`"d"`), and symbolic links (`"l"`).
- Both implementations return `false` instead of throwing exceptions when the parent directory doesn't exist or on network/permission errors.

### Byte Data Type

- `Bytes` used in the return type of `readFile()` and input type of `put()` is a `Uint8Array` type alias defined in `@simplysm/core-common`.

## License

Apache-2.0
