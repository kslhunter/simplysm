# @simplysm/capacitor-plugin-file-system

Capacitor 플러그인으로 Android 파일 시스템 접근을 제공합니다. 외부 저장소 전체 접근 및 앱 전용 디렉토리 접근을 지원하며, 브라우저 환경에서는 IndexedDB 기반 가상 파일 시스템으로 에뮬레이션합니다.

## Installation

```bash
npm install @simplysm/capacitor-plugin-file-system
```

## API Overview

### `FileSystem`

파일 시스템 접근 파사드 클래스. 모든 API는 정적 메서드로 제공됩니다.

```typescript
abstract class FileSystem
```

#### Members

| Member | Kind | Signature | Description |
|--------|------|-----------|-------------|
| `checkPermissions` | static method | `() => Promise<boolean>` | 파일 시스템 접근 권한 확인 |
| `requestPermissions` | static method | `() => Promise<void>` | 파일 시스템 접근 권한 요청 |
| `readdir` | static method | `(dirPath: string) => Promise<FileInfo[]>` | 디렉토리 파일/폴더 목록 조회 |
| `getStoragePath` | static method | `(type: StorageType) => Promise<string>` | 저장소 유형별 경로 조회 |
| `getUri` | static method | `(filePath: string) => Promise<string>` | 파일 URI 조회 (FileProvider / Blob URL) |
| `writeFile` | static method | `(filePath: string, data: string \| Bytes) => Promise<void>` | 파일 쓰기 |
| `readFile` | static method | `(filePath: string, encoding?: "utf8") => Promise<Bytes \| string>` | 파일 읽기 (오버로드) |
| `remove` | static method | `(targetPath: string) => Promise<void>` | 파일/디렉토리 삭제 (재귀) |
| `mkdir` | static method | `(targetPath: string) => Promise<void>` | 디렉토리 생성 (재귀) |
| `exists` | static method | `(targetPath: string) => Promise<boolean>` | 파일/디렉토리 존재 여부 확인 |

---

#### `FileSystem.checkPermissions`

```typescript
static async checkPermissions(): Promise<boolean>
```

**Returns**: true (권한 허용), false (권한 거부)

**플랫폼별 동작:**
- **Android**: MANAGE_EXTERNAL_STORAGE 또는 READ/WRITE_EXTERNAL_STORAGE 권한 상태 확인
- **Web**: 항상 true (권한 개념 없음)

---

#### `FileSystem.requestPermissions`

```typescript
static async requestPermissions(): Promise<void>
```

**플랫폼별 동작:**
- **Android 11+ (API 30+)**: `MANAGE_EXTERNAL_STORAGE` 권한 — 설정 화면으로 이동하여 사용자가 수동 허용
- **Android 10 이하 (API 29-)**: `READ_EXTERNAL_STORAGE` + `WRITE_EXTERNAL_STORAGE` — 표준 권한 대화상자 표시
- **Web**: 아무 동작 없음

**권한 관련 주의사항:**
- Android 11+: `MANAGE_EXTERNAL_STORAGE`는 특수 권한으로 일반 권한 대화상자가 표시되지 않습니다. AndroidManifest.xml에 `android.permission.MANAGE_EXTERNAL_STORAGE`를 선언해야 합니다.
- Android 10 이하: `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`는 위험한(Dangerous) 권한으로 런타임 권한 요청이 필요합니다.

---

#### `FileSystem.readdir`

```typescript
static async readdir(dirPath: string): Promise<FileInfo[]>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `dirPath` | string | 조회할 디렉토리의 절대 경로 |

**Returns**: 디렉토리 내 파일/폴더 목록

**Throws**: 디렉토리가 존재하지 않거나 허용되지 않는 경로일 경우 Error

---

#### `FileSystem.getStoragePath`

```typescript
static async getStoragePath(type: StorageType): Promise<string>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | `StorageType` | 저장소 유형 |

**Returns**: 절대 경로 문자열

**StorageType별 경로:**

| Type | Android Path | Web Path | 설명 |
|------|--------------|----------|------|
| `external` | `Environment.getExternalStorageDirectory()` | `/webfs/external` | 외부 저장소 루트 (공유 저장소) |
| `externalFiles` | `getExternalFilesDir(null)` | `/webfs/externalFiles` | 앱 전용 외부 파일 디렉토리 |
| `externalCache` | `externalCacheDir` | `/webfs/externalCache` | 앱 전용 외부 캐시 디렉토리 |
| `externalMedia` | `externalMediaDirs[0]` | `/webfs/externalMedia` | 앱 전용 외부 미디어 디렉토리 |
| `appData` | `applicationInfo.dataDir` | `/webfs/appData` | 앱 데이터 디렉토리 (내부) |
| `appFiles` | `filesDir` | `/webfs/appFiles` | 앱 파일 디렉토리 (내부) |
| `appCache` | `cacheDir` | `/webfs/appCache` | 앱 캐시 디렉토리 (내부) |

---

#### `FileSystem.getUri`

```typescript
static async getUri(filePath: string): Promise<string>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `filePath` | string | 파일의 절대 경로 |

**Returns**:
- Android: `content://` scheme의 FileProvider URI
- Web: `blob:` scheme의 Blob URL

**Web 환경 주의사항**: 반환된 Blob URL은 사용 후 반드시 `URL.revokeObjectURL(uri)`로 해제해야 합니다. 해제하지 않으면 메모리 누수가 발생합니다.

---

#### `FileSystem.writeFile`

```typescript
static async writeFile(filePath: string, data: string | Bytes): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `filePath` | string | 쓸 파일의 절대 경로 |
| `data` | `string \| Bytes` | 파일 내용 (문자열 또는 Uint8Array) |

**동작:**
- 문자열인 경우: UTF-8 인코딩으로 저장 (`encoding: "utf8"`)
- Bytes인 경우: Base64 인코딩을 중간 포맷으로 사용하여 저장 (`encoding: "base64"`)
- 웹 환경: 상위 디렉토리가 없으면 자동 생성

**Throws**: 쓰기 권한 없을 경우 Error

---

#### `FileSystem.readFile`

```typescript
static async readFile(filePath: string): Promise<Bytes>;
static async readFile(filePath: string, encoding: "utf8"): Promise<string>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `filePath` | string | 읽을 파일의 절대 경로 |
| `encoding` | `"utf8"` (optional) | 생략 시 `Bytes` 반환, `"utf8"` 지정 시 `string` 반환 |

**Returns**:
- `encoding` 생략: `Promise<Bytes>` (Uint8Array)
- `encoding="utf8"`: `Promise<string>`

**Throws**: 파일이 없거나 읽기 권한이 없을 경우 Error

---

#### `FileSystem.remove`

```typescript
static async remove(targetPath: string): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | string | 삭제할 파일/디렉토리의 절대 경로 |

**동작:**
- 파일: 즉시 삭제
- 디렉토리: 하위 파일/폴더 포함 재귀 삭제
- 웹 환경: 경로 프리픽스로 모든 관련 항목 삭제

**Throws**: 대상이 존재하지 않거나 권한 없을 경우 Error

---

#### `FileSystem.mkdir`

```typescript
static async mkdir(targetPath: string): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | string | 생성할 디렉토리의 절대 경로 |

**동작:**
- 중간 경로가 없어도 자동 생성 (재귀)
- 이미 존재하면 아무 동작 없음

**Throws**: 권한 없을 경우 Error

---

#### `FileSystem.exists`

```typescript
static async exists(targetPath: string): Promise<boolean>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | string | 확인할 파일/디렉토리의 절대 경로 |

**Returns**: true (존재), false (존재하지 않음)

---

### `FileInfo`

파일 또는 디렉토리의 정보를 나타내는 인터페이스입니다. `FileSystem.readdir()`의 반환 타입 요소입니다.

```typescript
interface FileInfo {
  name: string;
  isDirectory: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | 파일 또는 디렉토리의 이름 (경로 제외, 확장자 포함) |
| `isDirectory` | boolean | true이면 디렉토리, false이면 파일 |

---

### `StorageType`

저장소 유형을 나타내는 union type입니다.

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

**선택 가이드:**
- **내부 저장소 (앱 전용)**: `appData` (상태 데이터, 자동 백업 대상) / `appFiles` (일반 파일) / `appCache` (임시 캐시, 시스템이 삭제 가능)
- **외부 저장소**: `external` (전체 외부 저장소, 권한 필요) / `externalFiles` (앱 전용 외부 파일, 권한 필요) / `externalCache` (앱 전용 외부 캐시, 권한 필요) / `externalMedia` (앱 전용 외부 미디어, 권한 필요)

---

### `FileSystemPlugin`

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

이 인터페이스는 내부 플러그인 구현용이며, 외부 사용자는 `FileSystem` 파사드의 정적 메서드를 사용합니다.

## Usage Examples

### 권한 확인 후 파일 읽기

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

async function readAppFile() {
  const hasPermission = await FileSystem.checkPermissions();
  if (!hasPermission) {
    await FileSystem.requestPermissions();
  }

  const appFilesPath = await FileSystem.getStoragePath("appFiles");
  const content = await FileSystem.readFile(appFilesPath + "/config.json", "utf8");
}
```

### Bytes 데이터 쓰기

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

async function writeImage() {
  const appCachePath = await FileSystem.getStoragePath("appCache");
  const data = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG header
  await FileSystem.writeFile(appCachePath + "/image.png", data);
}
```

### 디렉토리 탐색 및 삭제

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

async function listAndClean(dirPath: string) {
  const files = await FileSystem.readdir(dirPath);
  for (const file of files) {
    console.log(`${file.name} ${file.isDirectory ? "(dir)" : "(file)"}`);
  }

  const exists = await FileSystem.exists(dirPath);
  if (exists) {
    await FileSystem.remove(dirPath);
  }
}
```

### 웹 환경: Blob URL 사용 후 해제

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

async function showImageInBrowser() {
  const appFilesPath = await FileSystem.getStoragePath("appFiles");
  const uri = await FileSystem.getUri(appFilesPath + "/photo.jpg");

  const img = document.createElement("img");
  img.src = uri;
  document.body.appendChild(img);

  // 사용 완료 후 반드시 해제 (메모리 누수 방지)
  img.onload = () => {
    URL.revokeObjectURL(uri);
  };
}
```
