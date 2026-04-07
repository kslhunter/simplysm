# @simplysm/capacitor-plugin-file-system

Capacitor 파일 시스템 접근 플러그인. Android에서는 외부 저장소 전체 접근 및 앱 전용 디렉토리 접근을 제공하며, 브라우저에서는 IndexedDB 기반 가상 파일 시스템으로 에뮬레이션한다.

## Installation

```bash
npm install @simplysm/capacitor-plugin-file-system
```

## API Overview

### 파일 시스템

| API | Type | Description |
|-----|------|-------------|
| `StorageType` | type | 저장소 유형 (external, externalFiles, externalCache 등 7종) |
| `FileInfo` | interface | 파일/디렉토리 정보 (이름, 디렉토리 여부) |
| `FileSystemPlugin` | interface | Capacitor 네이티브 플러그인 인터페이스 |
| `FileSystem` | abstract class | 파일 시스템 접근 정적 파사드 |

---

## `StorageType`

저장소 유형을 나타내는 유니온 타입.

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

| Value | Android 경로 | Description |
|-------|-------------|-------------|
| `"external"` | `Environment.getExternalStorageDirectory()` | 외부 저장소 루트 |
| `"externalFiles"` | `getExternalFilesDir(null)` | 앱 전용 외부 파일 디렉토리 |
| `"externalCache"` | `externalCacheDir` | 앱 전용 외부 캐시 디렉토리 |
| `"externalMedia"` | `externalMediaDirs[0]` | 앱 전용 외부 미디어 디렉토리 |
| `"appData"` | `applicationInfo.dataDir` | 앱 데이터 디렉토리 |
| `"appFiles"` | `filesDir` | 앱 파일 디렉토리 |
| `"appCache"` | `cacheDir` | 앱 캐시 디렉토리 |

## `FileInfo`

파일 또는 디렉토리 정보를 나타내는 인터페이스.

```typescript
export interface FileInfo {
  name: string;
  isDirectory: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | 파일 또는 디렉토리 이름 |
| `isDirectory` | `boolean` | 디렉토리 여부 |

## `FileSystemPlugin`

Capacitor 네이티브 플러그인 인터페이스. 직접 사용하지 않고 `FileSystem` 파사드를 통해 접근한다.

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

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `checkPermissions` | 없음 | `Promise<{ granted: boolean }>` | 파일 시스템 권한 확인 |
| `requestPermissions` | 없음 | `Promise<void>` | 파일 시스템 권한 요청 |
| `readdir` | `{ path }` | `Promise<{ files: FileInfo[] }>` | 디렉토리 내용 읽기 |
| `getStoragePath` | `{ type: StorageType }` | `Promise<{ path: string }>` | 저장소 경로 조회 |
| `getUri` | `{ path }` | `Promise<{ uri: string }>` | FileProvider URI 조회 |
| `writeFile` | `{ path, data, encoding? }` | `Promise<void>` | 파일 쓰기 |
| `readFile` | `{ path, encoding? }` | `Promise<{ data: string }>` | 파일 읽기 |
| `remove` | `{ path }` | `Promise<void>` | 파일/디렉토리 삭제 (재귀) |
| `mkdir` | `{ path }` | `Promise<void>` | 디렉토리 생성 (재귀) |
| `exists` | `{ path }` | `Promise<{ exists: boolean }>` | 존재 여부 확인 |

## `FileSystem`

파일 시스템 접근 정적 파사드 클래스. Android 11+에서는 MANAGE_EXTERNAL_STORAGE 권한, Android 10-에서는 READ/WRITE_EXTERNAL_STORAGE 권한을 사용한다. 브라우저에서는 IndexedDB 기반으로 에뮬레이션된다.

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

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `checkPermissions` | 없음 | `Promise<boolean>` | 파일 시스템 권한 보유 여부 |
| `requestPermissions` | 없음 | `Promise<void>` | 권한 요청 (Android 11+: 설정 화면, Android 10-: 대화상자) |
| `readdir` | `dirPath: string` | `Promise<FileInfo[]>` | 디렉토리 내용 읽기 |
| `getStoragePath` | `type: StorageType` | `Promise<string>` | 저장소 유형별 경로 조회 |
| `getUri` | `filePath: string` | `Promise<string>` | FileProvider URI 조회. 브라우저에서는 Blob URL 반환 (사용 후 `URL.revokeObjectURL()` 필요) |
| `writeFile` | `filePath: string, data: string \| Bytes` | `Promise<void>` | 파일 쓰기. `string` 전달 시 UTF-8, `Bytes`(Uint8Array) 전달 시 Base64 인코딩하여 전송 |
| `readFile` | `filePath: string` | `Promise<Bytes>` | 파일을 바이너리로 읽기 |
| `readFile` | `filePath: string, encoding: "utf8"` | `Promise<string>` | 파일을 UTF-8 문자열로 읽기 |
| `remove` | `targetPath: string` | `Promise<void>` | 파일 또는 디렉토리 재귀 삭제 |
| `mkdir` | `targetPath: string` | `Promise<void>` | 디렉토리 재귀 생성 |
| `exists` | `targetPath: string` | `Promise<boolean>` | 파일/디렉토리 존재 여부 확인 |

## Usage Examples

### 파일 읽기/쓰기

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

// 앱 캐시 디렉토리에 텍스트 파일 쓰기
const cachePath = await FileSystem.getStoragePath("appCache");
await FileSystem.writeFile(cachePath + "/config.json", '{"key": "value"}');

// 텍스트 파일 읽기
const text = await FileSystem.readFile(cachePath + "/config.json", "utf8");

// 바이너리 파일 읽기
const data: Bytes = await FileSystem.readFile(cachePath + "/image.png");
```

### 권한 확인 및 외부 저장소 접근

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

const granted = await FileSystem.checkPermissions();
if (!granted) {
  await FileSystem.requestPermissions();
}

const externalPath = await FileSystem.getStoragePath("external");
const files = await FileSystem.readdir(externalPath + "/Documents");
```

### 디렉토리 관리

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

const filesPath = await FileSystem.getStoragePath("appFiles");

// 디렉토리 생성
await FileSystem.mkdir(filesPath + "/downloads/images");

// 존재 여부 확인
const exists = await FileSystem.exists(filesPath + "/downloads/images");

// 재귀 삭제
await FileSystem.remove(filesPath + "/downloads");
```
