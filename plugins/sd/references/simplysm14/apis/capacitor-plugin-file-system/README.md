# @simplysm/capacitor-plugin-file-system

Capacitor 파일 시스템 플러그인의 공개 정적 래퍼(`FileSystem`)와 저수준 계약 타입(`FileSystemPlugin`/`StorageType`/`FileInfo`)을 제공한다. 권한 확인·요청, 디렉토리 읽기/생성, 저장소 경로·URI 조회, 파일 읽기/쓰기, 삭제, 존재 확인을 한 묶음으로 다룬다.

플러그인은 `registerPlugin<FileSystemPlugin>("FileSystem", { web: () => new FileSystemWeb() })` 로 등록된다. 네이티브(Android)는 네이티브 구현에, Browser 는 IndexedDB 기반 에뮬레이션(`FileSystemWeb`)에 위임한다.

## 사용 트리거 인덱스

- **FileSystem** — 앱/웹 파일 시스템의 권한·경로·파일·디렉토리 작업을 `static async` 메서드로 호출할 때.
- **StorageType** — `FileSystem.getStoragePath()` 에 넘길 저장소 위치 리터럴을 고를 때.
- **FileInfo** — `readdir` 결과 항목의 이름·디렉토리 여부를 처리할 때.
- **FileSystemPlugin** — Capacitor 저수준 옵션/반환 객체 계약을 구현하거나 타입으로 참조할 때.

## FileSystem

`abstract class FileSystem` — 인스턴스화하지 않고 정적 메서드만 호출하는 래퍼다. 등록된 플러그인에 위임하고, 플러그인의 `{ key: value }` 반환 객체를 단일 값으로 평탄화해 돌려준다. 클래스 JSDoc 기준 Android 11+ 는 `MANAGE_EXTERNAL_STORAGE` 권한으로 전체 파일 시스템에, Android 10- 는 `READ/WRITE_EXTERNAL_STORAGE` 권한으로 접근하며, Browser 는 IndexedDB 에뮬레이션으로 접근한다. `Bytes` 는 `@simplysm/core-common` 의 바이트 배열 타입이다.

- `static checkPermissions(): Promise<boolean>` — 권한 확인. 플러그인 `checkPermissions()` 의 `{ granted }` 중 `granted` 만 반환한다.
- `static requestPermissions(): Promise<void>` — 권한 요청. JSDoc 기준 Android 11+ 는 설정 화면으로 이동하고, Android 10- 는 권한 대화상자를 표시한다.
- `static readdir(dirPath: string): Promise<FileInfo[]>` — 디렉토리 읽기. 결과 `{ files }` 의 항목 배열을 반환한다.
  - `dirPath: string` — 읽을 디렉토리 경로. 플러그인 `readdir` 의 `path` 옵션으로 전달된다.
- `static getStoragePath(type: StorageType): Promise<string>` — 저장소 경로 조회. 결과 `{ path }` 의 경로 문자열을 반환한다.
  - `type: StorageType` — 조회할 저장소 유형. 아래 `StorageType` 리터럴 중 하나(값별 의미는 StorageType 절 참조).
- `static getUri(filePath: string): Promise<string>` — 파일 URI 조회. JSDoc 기준 네이티브는 FileProvider URI 를 반환한다. 결과 `{ uri }` 를 반환한다.
  - `filePath: string` — URI 를 조회할 파일 경로. 플러그인 `getUri` 의 `path` 옵션으로 전달된다.
  - 주의: Browser 에뮬레이션은 `URL.createObjectURL` 로 만든 Blob URL 을 반환하므로, 사용 후 `URL.revokeObjectURL(uri)` 로 해제하지 않으면 메모리 누수가 발생한다(`FileSystemWeb.getUri` JSDoc).
- `static writeFile(filePath: string, data: string | Bytes): Promise<void>` — 파일 쓰기.
  - `filePath: string` — 쓸 파일 경로. 플러그인 `writeFile` 의 `path` 옵션으로 전달된다.
  - `data: string | Bytes` — 쓸 데이터. `string` 이면 `encoding: "utf8"` 로 그대로 전달하고, `Bytes` 이면 `bytes.toBase64(data)` 로 변환해 `encoding: "base64"` 로 전달한다. `Bytes` 경로는 cross-realm 환경에서도 안전하게 동작한다(코드 주석).
- `static readFile(filePath: string): Promise<Bytes>` / `static readFile(filePath: string, encoding: "utf8"): Promise<string>` — 파일 읽기 오버로드.
  - `filePath: string` — 읽을 파일 경로. 플러그인 `readFile` 의 `path` 옵션으로 전달된다.
  - `encoding: "utf8"` — 지정 시 `encoding: "utf8"` 로 읽어 `string` 을 그대로 반환한다. 생략 시 `encoding: "base64"` 로 읽은 뒤 `bytes.fromBase64()` 로 변환해 `Bytes` 를 반환한다.
- `static remove(targetPath: string): Promise<void>` — 파일/디렉토리 재귀 삭제.
  - `targetPath: string` — 삭제할 파일 또는 디렉토리 경로. 플러그인 `remove` 의 `path` 옵션으로 전달된다.
- `static mkdir(targetPath: string): Promise<void>` — 디렉토리 재귀 생성.
  - `targetPath: string` — 생성할 디렉토리 경로. 플러그인 `mkdir` 의 `path` 옵션으로 전달된다.
- `static exists(targetPath: string): Promise<boolean>` — 존재 여부 확인. 결과 `{ exists }` 의 `exists` 만 반환한다.
  - `targetPath: string` — 확인할 경로. 플러그인 `exists` 의 `path` 옵션으로 전달된다.

## StorageType

`getStoragePath` 에 넘기는 저장소 유형 리터럴 유니언. 값별 의미는 `getStoragePath` JSDoc 기준이다.

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

- `"external"` — 외부 저장소 루트(`Environment.getExternalStorageDirectory`). 외부 저장소 최상위 경로가 필요할 때.
- `"externalFiles"` — 앱 전용 외부 파일 디렉토리. 앱 전용 외부 파일을 둘 경로가 필요할 때.
- `"externalCache"` — 앱 전용 외부 캐시 디렉토리. 앱 전용 외부 캐시 경로가 필요할 때.
- `"externalMedia"` — 앱 전용 외부 미디어 디렉토리. 앱 전용 외부 미디어 경로가 필요할 때.
- `"appData"` — 앱 데이터 디렉토리. 앱 내부 데이터 경로가 필요할 때.
- `"appFiles"` — 앱 파일 디렉토리. 앱 내부 파일 경로가 필요할 때.
- `"appCache"` — 앱 캐시 디렉토리. 앱 내부 캐시 경로가 필요할 때.

## FileInfo

`readdir` 가 반환하는 디렉토리 항목 타입.

```ts
interface FileInfo {
  name: string;
  isDirectory: boolean;
}
```

- `name: string` — 항목 이름. 디렉토리 안의 개별 파일/디렉토리를 식별할 때.
- `isDirectory: boolean` — 디렉토리 여부. `true` 면 디렉토리, `false` 면 그 외 항목(파일 등)으로 분기할 때.

## FileSystemPlugin

Capacitor 플러그인의 저수준 계약 인터페이스. 공개 래퍼 `FileSystem` 이 내부에서 이 옵션/반환 객체 형태로 호출한다. 네이티브 구현 또는 웹 에뮬레이션이 이 인터페이스를 구현한다.

- `checkPermissions(): Promise<{ granted: boolean }>` — 권한 확인 결과를 객체로 반환한다.
  - `granted: boolean` — 권한 부여 여부. `FileSystem.checkPermissions()` 가 이 값만 평탄화해 반환한다.
- `requestPermissions(): Promise<void>` — 권한 요청을 수행한다.
- `readdir(options: { path: string }): Promise<{ files: FileInfo[] }>` — 디렉토리 항목 배열을 객체로 반환한다.
  - `options.path: string` — 읽을 디렉토리 경로. `FileSystem.readdir(dirPath)` 의 `dirPath` 가 전달된다.
  - `files: FileInfo[]` — 읽기 결과 항목 배열. `FileSystem.readdir()` 가 이 값만 평탄화해 반환한다.
- `getStoragePath(options: { type: StorageType }): Promise<{ path: string }>` — 저장소 유형 경로를 객체로 반환한다.
  - `options.type: StorageType` — 조회할 저장소 유형 리터럴.
  - `path: string` — 조회된 경로. `FileSystem.getStoragePath()` 가 이 값만 평탄화해 반환한다.
- `getUri(options: { path: string }): Promise<{ uri: string }>` — 파일 URI 를 객체로 반환한다.
  - `options.path: string` — URI 를 조회할 파일 경로. `FileSystem.getUri(filePath)` 의 `filePath` 가 전달된다.
  - `uri: string` — 조회된 URI. `FileSystem.getUri()` 가 이 값만 평탄화해 반환한다.
- `writeFile(options: { path: string; data: string; encoding?: "utf8" | "base64" }): Promise<void>` — 파일에 문자열 데이터를 기록한다.
  - `options.path: string` — 쓸 파일 경로. `FileSystem.writeFile(filePath, data)` 의 `filePath` 가 전달된다.
  - `options.data: string` — 기록할 문자열 데이터. 래퍼는 `Bytes` 입력을 base64 문자열로 변환해 채운다.
  - `options.encoding?: "utf8" | "base64"` — `data` 문자열 해석 방식. `"utf8"` 은 `data` 를 UTF-8 텍스트로, `"base64"` 는 base64 인코딩 바이트로 해석한다. 래퍼는 `string` 입력에 `"utf8"`, `Bytes` 입력에 `"base64"` 를 쓴다.
- `readFile(options: { path: string; encoding?: "utf8" | "base64" }): Promise<{ data: string }>` — 파일을 문자열 데이터로 읽어 객체로 반환한다.
  - `options.path: string` — 읽을 파일 경로. `FileSystem.readFile(filePath, ...)` 의 `filePath` 가 전달된다.
  - `options.encoding?: "utf8" | "base64"` — 반환 `data` 문자열 형식. `"utf8"` 은 UTF-8 텍스트, `"base64"` 는 base64 문자열. 래퍼는 `encoding: "utf8"` 호출 결과를 `string` 으로, `"base64"` 호출 결과를 `bytes.fromBase64()` 로 변환한다.
  - `data: string` — 읽은 문자열 데이터. `FileSystem.readFile()` 이 형식에 맞게 그대로 반환하거나 `Bytes` 로 변환한다.
- `remove(options: { path: string }): Promise<void>` — 파일/디렉토리를 삭제한다.
  - `options.path: string` — 삭제할 경로. `FileSystem.remove(targetPath)` 의 `targetPath` 가 전달된다.
- `mkdir(options: { path: string }): Promise<void>` — 디렉토리를 생성한다.
  - `options.path: string` — 생성할 디렉토리 경로. `FileSystem.mkdir(targetPath)` 의 `targetPath` 가 전달된다.
- `exists(options: { path: string }): Promise<{ exists: boolean }>` — 경로 존재 여부를 객체로 반환한다.
  - `options.path: string` — 확인할 경로. `FileSystem.exists(targetPath)` 의 `targetPath` 가 전달된다.
  - `exists: boolean` — 존재 여부. `FileSystem.exists()` 가 이 값만 평탄화해 반환한다.
