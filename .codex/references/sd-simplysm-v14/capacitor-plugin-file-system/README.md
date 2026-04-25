# @simplysm/capacitor-plugin-file-system

> Capacitor 파일 시스템 접근 플러그인. Android에서 외부 저장소 전체 접근 및 앱 전용 디렉토리 접근을 제공하며, 브라우저 환경에서는 IndexedDB 기반 가상 파일 시스템으로 에뮬레이션한다. `@capacitor/core ^7` peerDependency.

## Installation

```bash
npm install @simplysm/capacitor-plugin-file-system
```

## 하려는 작업 → 읽을 파일

### 파일 시스템 조작

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 파일 읽기/쓰기/삭제/디렉토리 조작 | 이 문서의 `FileSystem` 섹션 |
| 저장소 유형별 경로를 얻어야 할 때 | 이 문서의 `StorageType` 섹션 |
| USB Mass Storage 장치 접근 | [`capacitor-plugin-usb-storage`](../capacitor-plugin-usb-storage/README.md) |
| APK 자동 업데이트에서 파일 저장 | [`capacitor-plugin-auto-update`](../capacitor-plugin-auto-update/README.md) |

---

## `FileSystem`

> **읽어야 하는 상황**: Android 앱에서 파일 읽기/쓰기/삭제, 디렉토리 탐색, FileProvider URI 조회가 필요할 때. USB 저장 장치 접근은 [`@simplysm/capacitor-plugin-usb-storage`](../capacitor-plugin-usb-storage/README.md) 참조.

### When to use

- ✅ Android 앱에서 파일 읽기/쓰기/삭제, 디렉토리 탐색이 필요할 때
- ✅ `content://` URI(FileProvider)를 얻어 다른 앱에 파일을 전달할 때
- ❌ USB 저장 장치 접근 → [`@simplysm/capacitor-plugin-usb-storage`](../capacitor-plugin-usb-storage/README.md)

### Signature

```typescript
export abstract class FileSystem {
  static async checkPermissions(): Promise<boolean>;
  static async requestPermissions(): Promise<void>;
  static async readdir(dirPath: string): Promise<FileInfo[]>;
  static async getStoragePath(type: StorageType): Promise<string>;
  static async getUri(filePath: string): Promise<string>;
  static async writeFile(filePath: string, data: string | Bytes): Promise<void>;
  static async readFile(filePath: string): Promise<Bytes>;
  static async readFile(filePath: string, encoding: "utf8"): Promise<string>;
  static async remove(targetPath: string): Promise<void>;
  static async mkdir(targetPath: string): Promise<void>;
  static async exists(targetPath: string): Promise<boolean>;
}
```

### Members

| Member | Kind | Signature | Description |
|--------|------|-----------|-------------|
| `checkPermissions` | static method | `() => Promise<boolean>` | 파일 시스템 접근 권한 확인. 웹에서는 항상 `true` |
| `requestPermissions` | static method | `() => Promise<void>` | 파일 시스템 접근 권한 요청. Android 11+: 설정 화면 이동, Android 10-: 권한 대화상자 |
| `readdir` | static method | `(dirPath: string) => Promise<FileInfo[]>` | 디렉토리 파일/폴더 목록 조회 |
| `getStoragePath` | static method | `(type: StorageType) => Promise<string>` | 저장소 유형별 절대 경로 조회 |
| `getUri` | static method | `(filePath: string) => Promise<string>` | 파일 URI 조회. Android: `content://` FileProvider URI, 웹: `blob:` URL |
| `writeFile` | static method | `(filePath: string, data: string \| Bytes) => Promise<void>` | 파일 쓰기. `string`이면 UTF-8, `Bytes`이면 Base64 중간 포맷으로 전달 |
| `readFile` | static method | 오버로드 2개 | 파일 읽기. `encoding` 생략 시 `Bytes` 반환, `"utf8"` 지정 시 `string` 반환 |
| `remove` | static method | `(targetPath: string) => Promise<void>` | 파일/디렉토리 재귀 삭제 |
| `mkdir` | static method | `(targetPath: string) => Promise<void>` | 디렉토리 재귀 생성. 이미 존재하면 무동작 |
| `exists` | static method | `(targetPath: string) => Promise<boolean>` | 파일/디렉토리 존재 여부 확인 |

### Usage

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

// 권한 확인 후 파일 읽기/쓰기
const hasPermission = await FileSystem.checkPermissions();
if (!hasPermission) {
  await FileSystem.requestPermissions();
  // Android 11+에서는 설정 화면으로 이동하므로, 복귀 후 다시 확인해야 한다
}

const appFilesPath = await FileSystem.getStoragePath("appFiles");
await FileSystem.writeFile(appFilesPath + "/hello.txt", "Hello!");
const content = await FileSystem.readFile(appFilesPath + "/hello.txt", "utf8");
```

### Anti-patterns

#### 웹에서 `getUri()` 반환값을 해제하지 않음

```typescript
// ❌ Blob URL 미해제 - 메모리 누수
const uri = await FileSystem.getUri(filePath);
img.src = uri;

// ✅ 사용 후 반드시 해제
const uri = await FileSystem.getUri(filePath);
img.src = uri;
img.onload = () => {
  URL.revokeObjectURL(uri);
};
```

**근거**: 웹 환경에서 `getUri()`는 `blob:` URL을 생성한다. `URL.revokeObjectURL()`로 해제하지 않으면 페이지가 살아있는 동안 메모리에 남는다.

---

## Related Types

### `StorageType`

저장소 유형을 나타내는 union type. `FileSystem.getStoragePath()`의 파라미터로 사용한다.

```typescript
export type StorageType =
  | "external"
  | "externalFiles"
  | "externalCache"
  | "externalMedia"
  | "appData"
  | "appFiles"
  | "appCache";
```

**선택 가이드:**

| Type | Android 경로 | 웹 경로 | 설명 |
|------|--------------|---------|------|
| `external` | `Environment.getExternalStorageDirectory()` | `/webfs/external` | 외부 저장소 루트 (공유 저장소, 권한 필요) |
| `externalFiles` | `getExternalFilesDir(null)` | `/webfs/externalFiles` | 앱 전용 외부 파일 |
| `externalCache` | `externalCacheDir` | `/webfs/externalCache` | 앱 전용 외부 캐시 |
| `externalMedia` | `externalMediaDirs[0]` | `/webfs/externalMedia` | 앱 전용 외부 미디어 |
| `appData` | `applicationInfo.dataDir` | `/webfs/appData` | 앱 데이터 (내부, 자동 백업 대상) |
| `appFiles` | `filesDir` | `/webfs/appFiles` | 앱 파일 (내부) |
| `appCache` | `cacheDir` | `/webfs/appCache` | 앱 캐시 (내부, 시스템이 삭제 가능) |

---

### `FileInfo`

파일 또는 디렉토리 정보 인터페이스. `FileSystem.readdir()`의 반환 타입 요소이다.

```typescript
export interface FileInfo {
  name: string;
  isDirectory: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | 파일 또는 디렉토리 이름 (경로 제외, 확장자 포함) |
| `isDirectory` | `boolean` | `true`이면 디렉토리, `false`이면 파일 |

---

### `FileSystemPlugin`

Capacitor 네이티브 플러그인 인터페이스. 직접 사용하지 않고 `FileSystem` 파사드를 통해 접근한다. 타입 참조 목적으로만 export된다.

```typescript
export interface FileSystemPlugin {
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

## 이 패키지를 쓰지 말아야 할 때

- USB Mass Storage 장치 접근 → [`@simplysm/capacitor-plugin-usb-storage`](../capacitor-plugin-usb-storage/README.md)
- 웹 전용 파일 다운로드 → 브라우저 `fetch()` + `Blob` 사용
