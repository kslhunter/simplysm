# `FileInfo`

> **읽어야 하는 상황**: `StorageClient.list()` 반환값의 구조를 확인할 때.

파일 또는 디렉토리 정보를 담는 인터페이스. [`StorageClient.list()`](./storage-client.md)의 반환 타입이다.

```typescript
interface FileInfo {
  name: string;
  isFile: boolean;
}
```

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | 파일 또는 디렉토리의 이름 (경로 아님, 이름만) |
| `isFile` | `boolean` | `true`이면 파일, `false`이면 디렉토리 |

## Usage

```typescript
import { StorageFactory } from "@simplysm/storage";

const items = await StorageFactory.connect(
  "sftp",
  { host: "sftp.example.com", user: "user", password: "pass" },
  async (storage) => storage.list("/remote/dir"),
);

const files = items.filter((item) => item.isFile);
const dirs = items.filter((item) => !item.isFile);
```
