# File

## SdServiceFileClient

Handles file upload and download over HTTP. Used internally by `SdServiceClient`.

### Constructor

```typescript
constructor(
  private readonly _hostUrl: string,
  private readonly _clientName: string,
)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `_hostUrl` | `string` | Base URL of the server (e.g. `https://localhost:3000`) |
| `_clientName` | `string` | Client application name, sent as the `x-sd-client-name` header |

### Methods

#### `downloadAsync(relPath)`

```typescript
async downloadAsync(relPath: string): Promise<Buffer>
```

Downloads a file from the server using `fetch` and returns it as a `Buffer`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `relPath` | `string` | Relative path of the file on the server |

**Returns:** `Promise<Buffer>` -- the file contents.

**Throws:** `Error` if the HTTP response is not OK.

#### `uploadAsync(files, authToken)`

```typescript
async uploadAsync(
  files: File[] | FileList | { name: string; data: BlobPart }[],
  authToken: string,
): Promise<ISdServiceUploadResult[]>
```

Uploads files to the server via HTTP POST multipart/form-data to the `/upload` endpoint.

| Parameter | Type | Description |
|-----------|------|-------------|
| `files` | `File[] \| FileList \| { name: string; data: BlobPart }[]` | Files to upload. Accepts browser `File` objects, `FileList`, or custom `{ name, data }` objects |
| `authToken` | `string` | JWT token sent in the `Authorization: Bearer` header |

**Returns:** `Promise<ISdServiceUploadResult[]>` -- array of upload results from the server, each containing `path`, `filename`, and `size`.

**Throws:** `Error` if the HTTP response is not OK.
