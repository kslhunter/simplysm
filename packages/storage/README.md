# @simplysm/storage

Simplysm Package - Storage Module (node)

## Installation

pnpm add @simplysm/storage

## Source Index

### Types

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/types/storage-conn-config.ts` | `StorageConnConfig` | Connection config interface (host, port, user, pass) | - |
| `src/types/storage.ts` | `FileInfo`, `Storage` | Storage interface and file entry type | - |
| `src/types/storage-type.ts` | `StorageType` | Union type for supported protocols: ftp, ftps, sftp | - |

### Clients

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/clients/ftp-storage-client.ts` | `FtpStorageClient` | Storage client for FTP/FTPS protocol | `ftp-storage-client.spec.ts` |
| `src/clients/sftp-storage-client.ts` | `SftpStorageClient` | Storage client for SFTP protocol with SSH key support | `sftp-storage-client.spec.ts` |

### Factory

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/storage-factory.ts` | `StorageFactory` | Factory that creates and auto-closes storage connections | `storage-factory.spec.ts` |

## License

Apache-2.0
