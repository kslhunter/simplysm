# @simplysm/capacitor-plugin-file-system

> Capacitor 파일 시스템 접근 플러그인. Android에서는 외부 저장소와 앱 전용 저장소 경로를 JavaScript 코드에서 다루고, 브라우저에서는 IndexedDB 기반 가상 파일 시스템으로 같은 API를 에뮬레이션한다.
> `@capacitor/core ^7`을 peer dependency로 사용한다.

## Installation

```bash
npm install @simplysm/capacitor-plugin-file-system
```

## 하려는 작업 → 읽을 파일

### 권한과 저장소 경로 준비

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| Android 파일 시스템 권한을 확인하거나 요청해야 할 때 | 이 문서의 `FileSystem` 섹션 |
| 외부 저장소, 앱 파일, 앱 캐시 같은 저장소 유형별 절대 경로가 필요할 때 | 이 문서의 `StorageType` 섹션 |

### 파일과 디렉토리 조작

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 텍스트 또는 바이트 파일을 쓰고 다시 읽어야 할 때 | 이 문서의 `FileSystem` 섹션 |
| 디렉토리 목록 조회, 재귀 디렉토리 생성, 파일/디렉토리 삭제, 존재 여부 확인이 필요할 때 | 이 문서의 `FileSystem` 섹션 |
| 파일을 다른 앱이나 DOM API에 전달할 URI가 필요할 때 | 이 문서의 `FileSystem` 섹션 |

### 다른 패키지를 먼저 봐야 하는 작업

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| USB Mass Storage 장치의 파일을 다뤄야 할 때 | [`capacitor-plugin-usb-storage`](../capacitor-plugin-usb-storage/README.md) |
| APK 자동 업데이트 흐름에서 파일을 내려받고 설치해야 할 때 | [`capacitor-plugin-auto-update`](../capacitor-plugin-auto-update/README.md) |

---

## `FileSystem`

> **읽어야 하는 상황**: Capacitor 앱에서 파일 읽기/쓰기/삭제, 디렉토리 탐색, 저장소 경로 조회, FileProvider 또는 Blob URI 생성이 필요할 때. USB Mass Storage 장치 접근은 [`@simplysm/capacitor-plugin-usb-storage`](../capacitor-plugin-usb-storage/README.md)를 먼저 확인한다.

### When to use

- ✅ Android 앱에서 외부 저장소 또는 앱 전용 저장소의 파일을 조작해야 할 때
- ✅ 브라우저 실행 중 같은 API로 IndexedDB 기반 가상 파일 시스템을 사용해야 할 때
- ✅ 파일을 다른 앱에 넘길 `content://` URI 또는 브라우저에서 사용할 `blob:` URL이 필요할 때
- ❌ USB Mass Storage 장치 파일 접근에는 [`@simplysm/capacitor-plugin-usb-storage`](../capacitor-plugin-usb-storage/README.md)를 사용한다.

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

| Member | Kind | Type | 역할 |
|--------|------|------|-------------|
| `checkPermissions` | static method | `() => Promise<boolean>` | 파일 시스템 접근 권한 승인 여부를 반환한다. 웹 구현은 항상 `true`를 반환한다. |
| `requestPermissions` | static method | `() => Promise<void>` | Android 11 이상에서는 전체 파일 접근 설정 화면을 열고, Android 10 이하에서는 저장소 런타임 권한을 요청한다. 웹 구현은 아무 작업도 하지 않는다. |
| `readdir` | static method | `(dirPath: string) => Promise<FileInfo[]>` | 디렉토리의 직접 하위 파일/디렉토리 목록을 반환한다. |
| `getStoragePath` | static method | `(type: StorageType) => Promise<string>` | 저장소 유형에 대응하는 절대 경로를 반환한다. 웹 구현은 `/webfs/{type}` 가상 경로를 생성한다. |
| `getUri` | static method | `(filePath: string) => Promise<string>` | Android에서는 FileProvider URI를, 웹에서는 `blob:` URL을 반환한다. |
| `writeFile` | static method | `(filePath: string, data: string \| Bytes) => Promise<void>` | `string`은 UTF-8로 쓰고, `Bytes`는 Base64로 변환해 쓴다. 부모 디렉토리가 없으면 생성한다. |
| `readFile` | static method | overload | `encoding` 생략 시 `Bytes`를 반환하고, `"utf8"` 지정 시 `string`을 반환한다. |
| `remove` | static method | `(targetPath: string) => Promise<void>` | 파일 또는 디렉토리를 재귀 삭제한다. |
| `mkdir` | static method | `(targetPath: string) => Promise<void>` | 디렉토리를 재귀 생성한다. 이미 존재하면 성공으로 처리한다. |
| `exists` | static method | `(targetPath: string) => Promise<boolean>` | 파일 또는 디렉토리 존재 여부를 반환한다. |

### Usage

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

const granted = await FileSystem.checkPermissions();
if (!granted) {
  await FileSystem.requestPermissions();
  // Android 11 이상에서는 설정 화면에서 돌아온 뒤 checkPermissions()를 다시 호출한다.
}

const appFilesPath = await FileSystem.getStoragePath("appFiles");
const filePath = appFilesPath + "/hello.txt";

await FileSystem.writeFile(filePath, "Hello!");
const content = await FileSystem.readFile(filePath, "utf8");
```

### Anti-patterns

#### 웹에서 `getUri()` 반환값을 해제하지 않음

```typescript
// 잘못된 예: blob URL이 페이지 생명주기 동안 메모리에 남는다.
const uri = await FileSystem.getUri(filePath);
img.src = uri;

// 올바른 예: 로드 뒤 blob URL을 해제한다.
const uri = await FileSystem.getUri(filePath);
img.src = uri;
img.onload = () => {
  URL.revokeObjectURL(uri);
};
```

**근거**: 웹 구현의 `getUri()`는 `URL.createObjectURL(blob)`을 호출한다.

---

## Related Types

### `StorageType`

`FileSystem.getStoragePath()`에 전달하는 저장소 유형이다.

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

| Type | Android 경로 | 웹 경로 | 언제 쓰나 |
|------|--------------|---------|-----------|
| `external` | `Environment.getExternalStorageDirectory()` | `/webfs/external` | 공유 외부 저장소 루트가 필요할 때 |
| `externalFiles` | `context.getExternalFilesDir(null)` | `/webfs/externalFiles` | 앱 전용 외부 파일 디렉토리가 필요할 때 |
| `externalCache` | `context.externalCacheDir` | `/webfs/externalCache` | 앱 전용 외부 캐시 디렉토리가 필요할 때 |
| `externalMedia` | `context.externalMediaDirs[0]` | `/webfs/externalMedia` | 앱 전용 외부 미디어 디렉토리가 필요할 때 |
| `appData` | `context.applicationInfo.dataDir` | `/webfs/appData` | 앱 내부 데이터 디렉토리가 필요할 때 |
| `appFiles` | `context.filesDir` | `/webfs/appFiles` | 앱 내부 파일 디렉토리가 필요할 때 |
| `appCache` | `context.cacheDir` | `/webfs/appCache` | 앱 내부 캐시 디렉토리가 필요할 때 |

### `FileInfo`

`FileSystem.readdir()`의 반환 배열 요소이다.

```typescript
export interface FileInfo {
  name: string;
  isDirectory: boolean;
}
```

| Field | Type | 의미 |
|-------|------|-------------|
| `name` | `string` | 파일 또는 디렉토리 이름이다. 전체 경로가 아니라 직접 하위 항목의 이름만 담는다. |
| `isDirectory` | `boolean` | 디렉토리이면 `true`, 파일이면 `false`이다. |

---

## `FileSystemPlugin`

> **읽어야 하는 상황**: Capacitor 네이티브 플러그인 contract 타입을 확장하거나 테스트 대역을 만들 때. 일반 파일 작업은 `FileSystem` facade를 사용한다.

### When to use

- ✅ 네이티브 또는 웹 plugin 구현체가 따라야 하는 contract 타입이 필요할 때
- ✅ 테스트에서 `registerPlugin<FileSystemPlugin>()` 수준의 대역 타입을 선언해야 할 때
- ❌ 앱 기능 코드에서 파일을 직접 조작할 때는 `FileSystem`을 사용한다.

### Signature

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

### Related Types

`FileSystemPlugin`은 `StorageType`과 `FileInfo`를 같은 contract 안에서 사용한다. 두 타입의 필드는 이 문서의 `Related Types` 섹션과 동일하다.

## 이 패키지를 쓰지 말아야 할 때

- USB Mass Storage 장치 파일 접근에는 [`@simplysm/capacitor-plugin-usb-storage`](../capacitor-plugin-usb-storage/README.md)를 사용한다.
- 브라우저 전용 다운로드 링크 생성만 필요하면 브라우저 `Blob`과 `URL.createObjectURL()`을 직접 사용한다.
