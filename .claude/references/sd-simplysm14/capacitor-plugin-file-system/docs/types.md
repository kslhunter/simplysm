# Types

## `FileInfo`

파일 또는 디렉토리의 정보를 나타내는 인터페이스입니다.

```typescript
interface FileInfo {
  name: string;
  isDirectory: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | 파일 또는 디렉토리의 이름 (경로 제외, 확장자 포함) |
| `isDirectory` | boolean | true일 경우 디렉토리, false일 경우 파일 |

```typescript
// 디렉토리 읽기 결과
const files = await FileSystem.readdir("/storage/emulated/0/Documents");

// FileInfo 배열 처리
for (const file of files) {
  if (file.isDirectory) {
    console.log(`📁 ${file.name} (directory)`);
  } else {
    console.log(`📄 ${file.name} (file)`);
  }
}
```

## `FileSystemPlugin`

Capacitor 플러그인 인터페이스입니다. 일반적으로 `FileSystem` 파사드를 통해 간접적으로 사용됩니다.

```typescript
interface FileSystemPlugin {
  checkPermissions(): Promise<{ granted: boolean }>;
  requestPermissions(): Promise<void>;
  readdir(options: { path: string }): Promise<{ files: FileInfo[] }>;
  getStoragePath(options: { type: StorageType }): Promise<{ path: string }>;
  getUri(options: { path: string }): Promise<{ uri: string }>;
  writeFile(options: { path: string; data: string; encoding?: "utf8" | "base64" }): Promise<void>;
  readFile(options: { path: string; encoding?: "utf8" | "base64" }): Promise<{ data: string }>;
  remove(options: { path: string }): Promise<void>;
  mkdir(options: { path: string }): Promise<void>;
  exists(options: { path: string }): Promise<{ exists: boolean }>;
}
```

**참고**: 이 인터페이스는 내부 플러그인 구현용이며, 외부 사용자는 `FileSystem` 파사드의 정적 메서드를 사용합니다.

## `Bytes`

이 패키지에서는 `@simplysm/core-common`의 `Bytes` 타입(Uint8Array의 별칭)을 사용합니다.

```typescript
import type { Bytes } from "@simplysm/core-common";
import { bytes } from "@simplysm/core-common";

// Bytes = Uint8Array
const data: Bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

// Base64 변환 유틸리티
const base64Str = bytes.toBase64(data);      // Bytes → Base64 문자열
const bytesData = bytes.fromBase64(base64Str); // Base64 문자열 → Bytes
```

## `StorageType`

저장소 유형 union type입니다. 자세한 설명은 [storage-paths.md](./storage-paths.md)를 참조하세요.

```typescript
type StorageType =
  | "external"
  | "externalFiles"
  | "externalCache"
  | "externalMedia"
  | "appData"
  | "appFiles"
  | "appCache";
```
