# @simplysm/capacitor-plugin-file-system

Capacitor 파일시스템 플러그인. Android 네이티브 파일시스템 접근과 Web IndexedDB 기반 가상 파일시스템을 제공한다.

## 설치

```bash
npm install @simplysm/capacitor-plugin-file-system
```

**의존성:** `@simplysm/core-common` (Bytes, bytes 유틸), `@simplysm/core-browser` (IndexedDbStore, IndexedDbVirtualFs)
**Peer:** `@capacitor/core` ^7.4.4

## Export 목록

```typescript
// index.ts
export { FileSystem } from "./FileSystem";
export type { FileSystemPlugin, FileInfo, StorageType } from "./FileSystemPlugin";
```

## 주요 사용법

### 권한 관리

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

const granted = await FileSystem.checkPermissions(); // boolean
if (!granted) {
  await FileSystem.requestPermissions();
  // Android 11+: MANAGE_EXTERNAL_STORAGE 설정 화면 이동
  // Android 10-: READ/WRITE_EXTERNAL_STORAGE 권한 다이얼로그
}
```

### 파일 읽기/쓰기

```typescript
import type { Bytes } from "@simplysm/core-common";

// 텍스트 파일 쓰기
await FileSystem.writeFile("/storage/emulated/0/test.txt", "Hello World");

// 바이너리 파일 쓰기 (Bytes = Uint8Array)
const data: Bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
await FileSystem.writeFile("/storage/emulated/0/data.bin", data);

// 텍스트 읽기
const text: string = await FileSystem.readFile("/path/to/file.txt", "utf8");

// 바이너리 읽기 (기본값, Bytes 반환)
const bytes: Bytes = await FileSystem.readFile("/path/to/file.bin");
```

`writeFile`은 내부적으로 string이면 utf8, Bytes이면 base64로 인코딩하여 네이티브에 전달한다.

### 디렉토리 조작

```typescript
// 디렉토리 생성 (재귀)
await FileSystem.mkdir("/storage/emulated/0/myapp/data");

// 디렉토리 목록 조회
const files = await FileSystem.readdir("/storage/emulated/0/myapp");
// FileInfo[] = [{ name: "data", isDirectory: true }, { name: "config.json", isDirectory: false }]

// 파일/디렉토리 삭제 (재귀)
await FileSystem.remove("/storage/emulated/0/myapp/temp");

// 존재 여부 확인
const exists = await FileSystem.exists("/storage/emulated/0/myapp"); // boolean
```

### 스토리지 경로 조회

```typescript
const path = await FileSystem.getStoragePath("external"); // string
```

| 타입 | Android 경로 | 설명 |
|------|-------------|------|
| `"external"` | `Environment.getExternalStorageDirectory()` | 외부 스토리지 루트 |
| `"externalFiles"` | `getExternalFilesDir(null)` | 앱 전용 외부 파일 |
| `"externalCache"` | `getExternalCacheDir()` | 앱 전용 외부 캐시 |
| `"externalMedia"` | `getExternalMediaDirs()[0]` | 앱 전용 미디어 |
| `"appData"` | `getApplicationInfo().dataDir` | 앱 데이터 디렉토리 |
| `"appFiles"` | `getFilesDir()` | 앱 파일 디렉토리 |
| `"appCache"` | `getCacheDir()` | 앱 캐시 디렉토리 |

Web 환경에서는 `/webfs/{type}` 가상 경로를 반환한다.

### FileProvider URI

파일의 `content://` URI를 얻는다. APK 설치 등 인텐트에 파일을 전달할 때 사용한다.

```typescript
const uri = await FileSystem.getUri("/path/to/file.apk");
// content://{applicationId}.filesystem.provider/...
```

## API 레퍼런스

### `FileSystem` (abstract class, static 메서드)

| 메서드 | 시그니처 | 설명 |
|--------|----------|------|
| `checkPermissions` | `() => Promise<boolean>` | 파일시스템 권한 확인 |
| `requestPermissions` | `() => Promise<void>` | 권한 요청 |
| `readdir` | `(dirPath: string) => Promise<FileInfo[]>` | 디렉토리 목록 |
| `getStoragePath` | `(type: StorageType) => Promise<string>` | 스토리지 경로 조회 |
| `getUri` | `(filePath: string) => Promise<string>` | FileProvider URI |
| `writeFile` | `(filePath: string, data: string \| Bytes) => Promise<void>` | 파일 쓰기 |
| `readFile` | `(filePath: string) => Promise<Bytes>` | 바이너리 읽기 |
| `readFile` | `(filePath: string, encoding: "utf8") => Promise<string>` | 텍스트 읽기 |
| `remove` | `(targetPath: string) => Promise<void>` | 재귀 삭제 |
| `mkdir` | `(targetPath: string) => Promise<void>` | 재귀 생성 |
| `exists` | `(targetPath: string) => Promise<boolean>` | 존재 여부 확인 |

### `StorageType` (type alias)

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

### `FileInfo` (interface)

```typescript
interface FileInfo {
  name: string;        // 파일/디렉토리 이름
  isDirectory: boolean;
}
```

## 플랫폼 지원

| 기능 | Android | Web |
|------|---------|-----|
| 파일 읽기/쓰기 | 네이티브 파일시스템 (base64/utf8) | IndexedDB 가상 파일시스템 |
| 디렉토리 | `java.io.File` API | IndexedDB 기반 가상 경로 |
| 스토리지 경로 | Android 스토리지 API | `/webfs/{type}` 가상 경로 |
| FileProvider | `content://` URI 생성 | Blob URL (`URL.createObjectURL`) |
| 권한 | MANAGE_EXTERNAL_STORAGE / READ+WRITE | 항상 granted |

## Android 네이티브 구현

- **패키지:** `kr.co.simplysm.capacitor.filesystem`
- **플러그인명:** `FileSystem`
- **FileProvider authority:** `${applicationId}.filesystem.provider`
- **FileProvider paths:** external, external_files, external_cache, files, cache (모두 root `.`)
- **AndroidManifest 권한:**
  - `READ_EXTERNAL_STORAGE` (maxSdkVersion=32)
  - `WRITE_EXTERNAL_STORAGE` (maxSdkVersion=29)
  - `MANAGE_EXTERNAL_STORAGE`
- `writeFile`: 부모 디렉토리 자동 생성 (`mkdirs`), BufferedOutputStream 사용
- `readFile`: BufferedInputStream + ByteArrayOutputStream (8KB 버퍼)

## Web 구현 상세

`FileSystemWeb`은 `VirtualFileSystem` 클래스를 사용하며, 내부적으로 `IndexedDbStore`와 `IndexedDbVirtualFs`(`@simplysm/core-browser`)를 활용한다.

- **IndexedDB 이름:** `capacitor_web_virtual_fs`
- **스토어:** `entries` (keyPath: `path`)
- `getUri`: Blob URL 반환. 사용 후 `URL.revokeObjectURL(uri)` 호출 필요 (메모리 누수 방지)
- 암묵적 디렉토리 처리: 파일 경로만 저장되어 있어도 중간 경로를 디렉토리로 인식
