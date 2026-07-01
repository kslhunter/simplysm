# @simplysm/capacitor-plugin-file-system

Capacitor 파일 시스템 접근 플러그인. 권한 확인·요청(Android 10-/11+ 호환), 저장소 경로 조회, 파일 읽기/쓰기, 디렉토리 조작을 통일된 API로 제공. 네이티브는 Android, 브라우저는 IndexedDB 기반 에뮬레이션으로 동작.

## 사용 트리거 인덱스

- **FileSystem** — 모든 기능의 진입점인 static 클래스. 파일 읽기/쓰기, 디렉토리 생성/목록/삭제, 저장소 경로 조회, 권한 확인·요청, 공유 URI 생성 시 사용.
- **TStorage** — `getStoragePathAsync` 에 넘길 저장소 종류 리터럴 선택 시.
- **IFileInfo** — `readdirAsync` 결과 항목(이름 + 디렉토리 여부) 처리 시.
- **IFileSystemPlugin** — 네이티브 브리지 원본 계약. 직접 호출 대신 `FileSystem` 래퍼 사용. 커스텀 구현/모킹 시에만 참조.

## FileSystem

`abstract class FileSystem` — 모든 메서드 static. `registerPlugin("FileSystem")` 으로 등록된 네이티브 플러그인을 감싼다. 인스턴스화 없이 `FileSystem.xxxAsync()` 호출.

### 권한

- `static checkPermissionAsync(): Promise<boolean>` — 파일 접근 권한 부여 여부. 내부 `checkPermission().granted` 반환. 웹 구현은 항상 `true`. 작업 전 권한 게이트 확인용.
- `static requestPermissionAsync(): Promise<void>` — 권한 요청. Android 11+ 는 설정 화면으로 이동, Android 10- 는 권한 다이얼로그 표시(JSDoc). 웹 구현은 no-op. boolean을 반환하지 않으므로 이후 `checkPermissionAsync` 로 재확인.

### 파일 읽기/쓰기

- `static writeFileAsync(filePath: string, data: string | Buffer): Promise<void>` — 파일 쓰기. `data` 가 `Buffer` 면 base64로 인코딩해 전송(encoding `"base64"`), 일반 문자열이면 그대로 UTF-8(encoding `"utf8"`)로 기록. 바이너리/텍스트를 단일 메서드로 처리. 웹 구현은 부모 디렉토리를 자동 생성(`ensureDir(dirname)`).
- `static readFileStringAsync(filePath: string): Promise<string>` — 파일을 UTF-8 문자열로 읽음. 텍스트/JSON 읽기. 웹 구현은 파일 없으면 throw.
- `static readFileBufferAsync(filePath: string): Promise<Buffer>` — 파일을 base64로 받아 `Buffer` 로 디코딩해 반환. 이미지/바이너리 읽기. 웹 구현은 파일 없으면 throw.

### 디렉토리

- `static readdirAsync(dirPath: string): Promise<IFileInfo[]>` — `dirPath` 의 직접 자식 항목 목록 반환(재귀 아님 — 웹 구현은 prefix 다음 첫 세그먼트만 집계). 디렉토리 탐색 시.
- `static mkdirsAsync(targetPath: string): Promise<void>` — 디렉토리 생성(재귀, 중간 경로 포함). 웹 구현은 세그먼트를 누적해 단계별 생성하며 이미 존재하면 건너뜀. 쓰기 전 대상 디렉토리 보장 시.
- `static removeAsync(targetPath: string): Promise<void>` — 파일/디렉토리 삭제(재귀). 웹 구현은 경로 자신과 `path + "/"` 접두 항목을 모두 삭제하고, 삭제 대상이 없으면 throw.
- `static existsAsync(targetPath: string): Promise<boolean>` — 경로 존재 여부. 읽기/쓰기 전 존재 체크.

### 저장소 경로 / 공유 URI

- `static getStoragePathAsync(type: TStorage): Promise<string>` — `type` 저장소의 절대 경로 문자열 반환(TStorage 값별 의미는 아래). 파일 경로 조립 기준 디렉토리 획득 시. 웹 구현은 `/webfs/<type>` 경로를 반환하며 호출 시 해당 디렉토리를 자동 생성.
- `static getFileUriAsync(filePath: string): Promise<string>` — `filePath` 의 공유 가능한 URI 반환. 다른 앱에 파일 공유/Intent 전달 시. Android 는 FileProvider URI(JSDoc), 웹 구현은 저장된 base64를 Blob 으로 만들어 `URL.createObjectURL` 결과(object URL) 반환.

주의: 권한 미보유 상태 동작은 네이티브 구현에 위임되므로, 파일 접근 전 `checkPermissionAsync` → 필요 시 `requestPermissionAsync` 흐름 권장.

## 타입

### TStorage

`getStoragePathAsync(type)` 인자용 유니온 리터럴. JSDoc 기준 각 값의 의미:

- `"external"` — 외부 저장소 루트 (`Environment.getExternalStorageDirectory`). 공용 저장소 접근.
- `"externalFiles"` — 앱 전용 외부 파일 디렉토리.
- `"externalCache"` — 앱 전용 외부 캐시 디렉토리.
- `"externalMedia"` — 앱 전용 외부 미디어 디렉토리.
- `"appData"` — 앱 데이터 디렉토리.
- `"appFiles"` — 앱 파일 디렉토리.
- `"appCache"` — 앱 캐시 디렉토리.

(웹 구현에서는 각 값이 `/webfs/<값>` 경로로 매핑됨)

### IFileInfo

`readdirAsync` 결과 배열 항목.

- `name: string` — 항목 이름(파일명 또는 디렉토리명, 경로 제외).
- `isDirectory: boolean` — `true` 면 디렉토리, `false` 면 파일. 재귀 탐색/필터 분기용.

### IFileSystemPlugin

네이티브 브리지 원본 계약. `FileSystem` 이 내부에서 호출하는 저수준 메서드 정의. 직접 호출보다 커스텀 플랫폼 구현·테스트 모킹 시 참조.

- `checkPermission(): Promise<{ granted: boolean }>` — 권한 여부. `FileSystem.checkPermissionAsync` 가 `.granted` 추출.
- `requestPermission(): Promise<void>` — 권한 요청.
- `readdir(options: { path: string }): Promise<{ files: IFileInfo[] }>` — `path` 직접 자식 목록.
- `getStoragePath(options: { type: TStorage }): Promise<{ path: string }>` — `type` 저장소 경로.
- `getFileUri(options: { path: string }): Promise<{ uri: string }>` — `path` 의 공유 URI.
- `writeFile(options: { path: string; data: string; encoding?: "utf8" | "base64" }): Promise<void>` — `data` 문자열을 `encoding`(`"utf8"` 텍스트 / `"base64"` 바이너리)으로 기록. `encoding` optional(웹 구현은 `"base64"` 가 아니면 `btoa` 로 인코딩).
- `readFile(options: { path: string; encoding?: "utf8" | "base64" }): Promise<{ data: string }>` — `encoding` 으로 디코딩한 `data` 반환. `"base64"` 면 호출측이 Buffer로 변환.
- `remove(options: { path: string }): Promise<void>` — `path` 삭제(재귀).
- `mkdir(options: { path: string }): Promise<void>` — `path` 생성(재귀).
- `exists(options: { path: string }): Promise<{ exists: boolean }>` — `path` 존재 여부.
