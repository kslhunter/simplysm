# @simplysm/capacitor-plugin-file-system

Capacitor 파일 시스템 플러그인의 공개 래퍼와 저수준 계약: 권한, 디렉토리, 저장소 경로, URI, 파일 읽기/쓰기, 존재 확인 API 를 제공한다.

## 사용 트리거 인덱스

- **FileSystem** — 앱/웹 파일 시스템 권한·경로·파일·디렉토리 작업을 `static async` 메서드로 호출할 때.
- **StorageType** — `FileSystem.getStoragePath()` 또는 플러그인 `getStoragePath` 에 넘길 저장소 위치 리터럴을 고를 때.
- **FileInfo** — `readdir` 결과 항목의 이름과 디렉토리 여부를 처리할 때.
- **FileSystemPlugin** — Capacitor 저수준 옵션 객체·반환 객체 계약을 구현하거나 타입으로 참조할 때.

## FileSystem

`abstract class FileSystem` 는 `registerPlugin<FileSystemPlugin>("FileSystem", { web: ... })` 로 등록된 플러그인에 위임하는 정적 래퍼다. 클래스 JSDoc 기준 Android 는 외부 저장소 권한, Browser 는 IndexedDB 기반 에뮬레이션으로 파일 시스템에 접근한다.

- `static checkPermissions(): Promise<boolean>` — 권한 확인. 플러그인 `checkPermissions()` 의 `{ granted: boolean }` 중 `granted` 값을 반환한다.
- `static requestPermissions(): Promise<void>` — 권한 요청. JSDoc 기준 Android 11+ 는 설정 화면으로 이동하고 Android 10- 는 권한 대화상자를 표시한다.
- `static readdir(dirPath: string): Promise<FileInfo[]>` — 디렉토리 읽기. `dirPath` 를 플러그인 옵션 `{ path: dirPath }` 로 넘기고 결과 `{ files }` 를 반환한다.
  - `dirPath: string` — 읽을 디렉토리 경로. 플러그인 `readdir` 의 `path` 옵션으로 전달된다.
- `static getStoragePath(type: StorageType): Promise<string>` — 저장소 경로 조회. `type` 을 플러그인 옵션 `{ type }` 로 넘기고 결과 `{ path }` 를 반환한다.
  - `type: StorageType` — 조회할 저장소 유형. 아래 `StorageType` 리터럴 중 하나를 넘긴다.
- `static getUri(filePath: string): Promise<string>` — 파일 URI 조회(FileProvider). `filePath` 를 플러그인 옵션 `{ path: filePath }` 로 넘기고 결과 `{ uri }` 를 반환한다.
  - `filePath: string` — URI 를 조회할 파일 경로. 플러그인 `getUri` 의 `path` 옵션으로 전달된다.
- `static writeFile(filePath: string, data: string | Bytes): Promise<void>` — 파일 쓰기. `data` 가 문자열이면 `encoding: "utf8"`, 문자열이 아니면 `bytes.toBase64(data)` 와 `encoding: "base64"` 로 플러그인 `writeFile` 에 전달한다.
  - `filePath: string` — 쓸 파일 경로. 플러그인 `writeFile` 의 `path` 옵션으로 전달된다.
  - `data: string | Bytes` — 쓸 데이터. `string` 은 utf8 문자열로, `Bytes` 는 base64 문자열로 변환되어 기록된다.
- `static readFile(filePath: string): Promise<Bytes>` / `static readFile(filePath: string, encoding: "utf8"): Promise<string>` — 파일 읽기 오버로드. `encoding === "utf8"` 이면 문자열을 반환하고, 생략하면 base64 로 읽은 뒤 `bytes.fromBase64` 결과를 반환한다.
  - `filePath: string` — 읽을 파일 경로. 플러그인 `readFile` 의 `path` 옵션으로 전달된다.
  - `encoding: "utf8"` — utf8 로 읽어 `string` 을 반환한다. 생략 시 래퍼가 `encoding: "base64"` 로 읽어 `Bytes` 를 반환한다.
- `static remove(targetPath: string): Promise<void>` — 파일/디렉토리 삭제(재귀). `targetPath` 를 플러그인 옵션 `{ path: targetPath }` 로 넘긴다.
  - `targetPath: string` — 삭제할 파일 또는 디렉토리 경로. 플러그인 `remove` 의 `path` 옵션으로 전달된다.
- `static mkdir(targetPath: string): Promise<void>` — 디렉토리 생성(재귀). `targetPath` 를 플러그인 옵션 `{ path: targetPath }` 로 넘긴다.
  - `targetPath: string` — 생성할 디렉토리 경로. 플러그인 `mkdir` 의 `path` 옵션으로 전달된다.
- `static exists(targetPath: string): Promise<boolean>` — 존재 여부 확인. `targetPath` 를 플러그인 옵션 `{ path: targetPath }` 로 넘기고 결과 `{ exists }` 를 반환한다.
  - `targetPath: string` — 확인할 경로. 플러그인 `exists` 의 `path` 옵션으로 전달된다.

## StorageType

`getStoragePath` 에 넘기는 저장소 유형 리터럴 유니언.

```ts
type StorageType =
  | "external"
  | "externalFiles"
  | "externalCache"
  | "externalMedia"
  | "appData"
  | "appFiles"
  | "appCache";
```

- `"external"` — 외부 저장소 루트(`Environment.getExternalStorageDirectory`). 외부 저장소 루트 경로가 필요할 때.
- `"externalFiles"` — 앱 전용 외부 파일 디렉토리. 앱 전용 외부 파일 경로가 필요할 때.
- `"externalCache"` — 앱 전용 외부 캐시 디렉토리. 앱 전용 외부 캐시 경로가 필요할 때.
- `"externalMedia"` — 앱 전용 외부 미디어 디렉토리. 앱 전용 외부 미디어 경로가 필요할 때.
- `"appData"` — 앱 데이터 디렉토리. 앱 데이터 경로가 필요할 때.
- `"appFiles"` — 앱 파일 디렉토리. 앱 파일 경로가 필요할 때.
- `"appCache"` — 앱 캐시 디렉토리. 앱 캐시 경로가 필요할 때.

## FileInfo

`readdir` 가 반환하는 파일/디렉토리 항목 타입.

```ts
interface FileInfo {
  name: string;
  isDirectory: boolean;
}
```

- `name: string` — 항목 이름. `readdir` 결과에서 개별 파일/디렉토리를 식별할 때.
- `isDirectory: boolean` — 디렉토리 여부. `true` 는 디렉토리, `false` 는 디렉토리가 아닌 항목으로 분기할 때.

## FileSystemPlugin

Capacitor 플러그인의 저수준 계약 인터페이스. 공개 래퍼 `FileSystem` 이 내부에서 이 옵션·반환 객체 형태로 호출한다.

- `checkPermissions(): Promise<{ granted: boolean }>` — 권한 확인 결과를 객체로 반환한다.
  - `granted: boolean` — 권한 부여 여부. `FileSystem.checkPermissions()` 반환값으로 평탄화된다.
- `requestPermissions(): Promise<void>` — 권한 요청을 수행한다.
- `readdir(options: { path: string }): Promise<{ files: FileInfo[] }>` — 디렉토리를 읽고 항목 배열을 객체로 반환한다.
  - `options.path: string` — 읽을 디렉토리 경로. `FileSystem.readdir(dirPath)` 의 `dirPath` 가 전달된다.
  - `files: FileInfo[]` — 디렉토리 읽기 결과 항목 배열. `FileSystem.readdir()` 반환값으로 평탄화된다.
- `getStoragePath(options: { type: StorageType }): Promise<{ path: string }>` — 저장소 유형의 경로를 객체로 반환한다.
  - `options.type: StorageType` — 조회할 저장소 유형. `StorageType` 리터럴 중 하나다.
  - `path: string` — 조회된 저장소 경로. `FileSystem.getStoragePath()` 반환값으로 평탄화된다.
- `getUri(options: { path: string }): Promise<{ uri: string }>` — 파일 URI 를 객체로 반환한다.
  - `options.path: string` — URI 를 조회할 파일 경로. `FileSystem.getUri(filePath)` 의 `filePath` 가 전달된다.
  - `uri: string` — 조회된 파일 URI. `FileSystem.getUri()` 반환값으로 평탄화된다.
- `writeFile(options: { path: string; data: string; encoding?: "utf8" | "base64" }): Promise<void>` — 파일에 문자열 데이터를 기록한다.
  - `options.path: string` — 쓸 파일 경로. `FileSystem.writeFile(filePath, data)` 의 `filePath` 가 전달된다.
  - `options.data: string` — 기록할 문자열 데이터. 래퍼는 `Bytes` 입력을 base64 문자열로 변환해 전달한다.
  - `options.encoding?: "utf8" | "base64"` — 데이터 문자열 해석 방식. 래퍼 기준 `"utf8"` 은 `string` 입력, `"base64"` 는 `Bytes` 입력에 사용된다.
- `readFile(options: { path: string; encoding?: "utf8" | "base64" }): Promise<{ data: string }>` — 파일을 문자열 데이터로 읽어 객체로 반환한다.
  - `options.path: string` — 읽을 파일 경로. `FileSystem.readFile(filePath, ...)` 의 `filePath` 가 전달된다.
  - `options.encoding?: "utf8" | "base64"` — 반환 데이터 문자열 형식. 래퍼 기준 `"utf8"` 은 `string` 반환, `"base64"` 는 `Bytes` 변환에 사용된다.
  - `data: string` — 읽은 문자열 데이터. `FileSystem.readFile()` 이 반환 형식에 맞게 그대로 반환하거나 `Bytes` 로 변환한다.
- `remove(options: { path: string }): Promise<void>` — 파일/디렉토리를 삭제한다.
  - `options.path: string` — 삭제할 파일 또는 디렉토리 경로. `FileSystem.remove(targetPath)` 의 `targetPath` 가 전달된다.
- `mkdir(options: { path: string }): Promise<void>` — 디렉토리를 생성한다.
  - `options.path: string` — 생성할 디렉토리 경로. `FileSystem.mkdir(targetPath)` 의 `targetPath` 가 전달된다.
- `exists(options: { path: string }): Promise<{ exists: boolean }>` — 경로 존재 여부를 객체로 반환한다.
  - `options.path: string` — 확인할 경로. `FileSystem.exists(targetPath)` 의 `targetPath` 가 전달된다.
  - `exists: boolean` — 존재 여부. `FileSystem.exists()` 반환값으로 평탄화된다.
