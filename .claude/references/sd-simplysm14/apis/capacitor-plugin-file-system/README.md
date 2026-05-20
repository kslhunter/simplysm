# @simplysm/capacitor-plugin-file-system

Capacitor 기반 파일 시스템 접근 플러그인. Android(11+ MANAGE_EXTERNAL_STORAGE, 10- READ/WRITE_EXTERNAL_STORAGE) 네이티브, Web 은 IndexedDB 에뮬레이션.

## 사용 트리거 인덱스

- **`FileSystem`** — 모바일/웹에서 파일·디렉토리 읽기/쓰기/삭제, 저장소 경로·URI 조회, 권한 처리 필요 시.
- **`FileInfo`, `StorageType`** — `readdir` 결과 처리, `getStoragePath` 호출 시 타입.
- **`FileSystemPlugin`** — 저수준 Capacitor 플러그인 인터페이스 직접 호출 필요 시(정상적으론 `FileSystem` 정적 메서드 사용).

## FileSystem

`abstract class` — 정적 메서드만 호출.

```ts
// 권한
await FileSystem.checkPermissions(): Promise<boolean>
await FileSystem.requestPermissions(): Promise<void>   // Android 11+: 설정 화면 이동, 10-: 권한 대화상자

// 경로/URI
await FileSystem.getStoragePath(type: StorageType): Promise<string>
await FileSystem.getUri(filePath: string): Promise<string>   // 네이티브: FileProvider URI / Web: Blob URL (사용 후 `URL.revokeObjectURL` 필수)

// 디렉토리
await FileSystem.readdir(dirPath: string): Promise<FileInfo[]>
await FileSystem.mkdir(targetPath: string): Promise<void>    // 재귀

// 파일
await FileSystem.writeFile(filePath: string, data: string | Bytes): Promise<void>
await FileSystem.readFile(filePath: string): Promise<Bytes>
await FileSystem.readFile(filePath: string, encoding: "utf8"): Promise<string>

// 공통
await FileSystem.remove(targetPath: string): Promise<void>   // 파일/디렉토리 재귀 삭제
await FileSystem.exists(targetPath: string): Promise<boolean>
```

`writeFile`: `string` 은 utf8, `Bytes`(=`Uint8Array`, `@simplysm/core-common`) 는 base64 로 전달. cross-realm 안전.
`readFile`: encoding 미지정 시 `Bytes`, `"utf8"` 지정 시 `string`.

사용 예:

```ts
if (!(await FileSystem.checkPermissions())) await FileSystem.requestPermissions();
const root = await FileSystem.getStoragePath("externalFiles");
await FileSystem.mkdir(`${root}/logs`);
await FileSystem.writeFile(`${root}/logs/a.txt`, "hello");
const files = await FileSystem.readdir(`${root}/logs`);
```

## FileInfo / StorageType

```ts
interface FileInfo { name: string; isDirectory: boolean; }

type StorageType =
  | "external"        // 외부 저장소 루트 (Environment.getExternalStorageDirectory)
  | "externalFiles"   // 앱 전용 외부 파일
  | "externalCache"   // 앱 전용 외부 캐시
  | "externalMedia"   // 앱 전용 외부 미디어
  | "appData"         // 앱 데이터
  | "appFiles"        // 앱 파일
  | "appCache";       // 앱 캐시
```

## FileSystemPlugin

저수준 Capacitor 인터페이스. `FileSystem` 의 모든 정적 메서드가 위임 대상. 직접 사용 시 `writeFile`/`readFile` 의 `encoding` 은 `"utf8" | "base64"`, `data` 는 항상 `string`.

```ts
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
