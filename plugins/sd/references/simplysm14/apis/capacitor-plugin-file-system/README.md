# @simplysm/capacitor-plugin-file-system

Capacitor 플랫폼에서 네이티브 파일 시스템 접근(읽기, 쓰기, 삭제, 디렉토리 관리)을 추상화한 플러그인.
Android는 MANAGE_EXTERNAL_STORAGE/READ_WRITE_EXTERNAL_STORAGE 권한으로, 브라우저는 IndexedDB로 에뮬레이션.

## 사용 트리거 인덱스

- **FileSystem** — 파일 시스템 작업(읽기, 쓰기, 삭제, 권한 관리). 정적 메서드로만 제공.
- **StorageType** — 저장소 경로 타입(external, app 특정 경로들).
- **FileInfo** — 디렉토리 조회 결과 항목(파일명, 디렉토리 여부).
- **FileSystemPlugin** — 플러그인 인터페이스 정의(Capacitor 플랫폼 통합용).

## FileSystem

추상 클래스로 정적 메서드만 제공. Capacitor 플러그인을 통해 네이티브, 웹 구현을 분기 실행.

### `checkPermissions(): Promise<boolean>`

파일 시스템 권한 확인 여부.

- Android 11+: MANAGE_EXTERNAL_STORAGE 권한 확인.
- Android 10 이하: READ_WRITE_EXTERNAL_STORAGE 권한 확인.
- 브라우저: 항상 true 반환.

**반환**: 권한 허가 여부(`true` = 허가됨, `false` = 거부됨).

### `requestPermissions(): Promise<void>`

파일 시스템 권한 요청.

- Android 11+: 설정 앱 화면으로 이동(사용자 직접 허가).
- Android 10 이하: 시스템 권한 대화상자 표시.
- 브라우저: 무동작.

### `readdir(dirPath: string): Promise<FileInfo[]>`

디렉토리 내 직접 하위 파일, 디렉토리 목록 조회.

**매개변수**:
- `dirPath` (string) — 조회할 디렉토리 경로.

**반환**: 파일, 디렉토리 정보 배열(`FileInfo[]`). 빈 디렉토리면 빈 배열 반환.

### `getStoragePath(type: StorageType): Promise<string>`

저장소 경로 조회.

**매개변수**:
- `type` (StorageType) — 조회 대상 저장소 유형.

**반환**: 절대 경로 문자열. 브라우저는 가상 경로(`/webfs/<type>`) 반환.

### `getUri(filePath: string): Promise<string>`

파일의 URI 조회(네이티브 앱에서 FileProvider 접근용, 브라우저에서 Blob URL 생성).

**매개변수**:
- `filePath` (string) — 파일 경로.

**반환**: 파일 URI(Android: FileProvider URI, 브라우저: Blob URL).

**주의**: 브라우저 반환 Blob URL은 사용 후 반드시 `URL.revokeObjectURL(uri)` 호출해 메모리 누수 방지.

### `writeFile(filePath: string, data: string | Bytes): Promise<void>`

파일 쓰기(경로 상위 디렉토리 자동 생성).

**매개변수**:
- `filePath` (string) — 쓸 파일 경로.
- `data` (string | Bytes) — 파일 내용.
  - string 또는 Uint8Array 바이너리.
  - Cross-realm 환경(예: iframe)에서도 안전.

내부적으로:
- string: UTF-8 텍스트로 인코딩.
- Bytes(Uint8Array): Base64 인코딩 후 전달.

### `readFile(filePath: string): Promise<Bytes>` / `readFile(filePath: string, encoding: "utf8"): Promise<string>`

파일 읽기(오버로드 2가지).

**매개변수**:
- `filePath` (string) — 읽을 파일 경로.
- `encoding` ("utf8", 선택) — 문자 인코딩.
  - 미지정(또는 "base64"): Bytes(Uint8Array) 반환.
  - "utf8": string 반환.

**반환**: UTF-8 텍스트(encoding="utf8" 지정 시) 또는 바이너리(Bytes, 기본값).

### `remove(targetPath: string): Promise<void>`

파일 또는 디렉토리 삭제(디렉토리는 재귀 삭제).

**매개변수**:
- `targetPath` (string) — 삭제할 파일, 디렉토리 경로.

### `mkdir(targetPath: string): Promise<void>`

디렉토리 생성(상위 경로 자동 생성).

**매개변수**:
- `targetPath` (string) — 생성할 디렉토리 경로.

### `exists(targetPath: string): Promise<boolean>`

파일, 디렉토리 존재 여부 확인.

**매개변수**:
- `targetPath` (string) — 확인할 파일, 디렉토리 경로.

**반환**: 존재 여부(`true` = 존재, `false` = 없음).

## StorageType

저장소 경로 타입. `getStoragePath()` 메서드의 type 매개변수 값.

각 값의 의미:

- `"external"` (string) — 외부 저장소 루트 경로(Android: `Environment.getExternalStorageDirectory()`).
- `"externalFiles"` (string) — 앱 전용 외부 파일 디렉토리(`/Android/data/<package>/files`).
- `"externalCache"` (string) — 앱 전용 외부 캐시 디렉토리(`/Android/data/<package>/cache`).
- `"externalMedia"` (string) — 앱 전용 외부 미디어 디렉토리(`/Android/media/<package>`).
- `"appData"` (string) — 앱 내부 데이터 디렉토리(`/data/data/<package>/`).
- `"appFiles"` (string) — 앱 내부 파일 디렉토리.
- `"appCache"` (string) — 앱 내부 캐시 디렉토리.

## FileInfo

디렉토리 조회 결과(`readdir()`) 각 항목.

- `name` (string) — 파일 또는 디렉토리 이름.
- `isDirectory` (boolean) — 디렉토리 여부(`true` = 디렉토리, `false` = 파일).

## FileSystemPlugin

Capacitor 플러그인 인터페이스. 일반 앱에서 직접 사용하지 않음(FileSystem 정적 메서드 사용).

플랫폼별 구현:
- 네이티브(Android): `FileSystemPlugin.kt` 에서 Android API 호출.
- 웹: `FileSystemWeb` 에서 IndexedDB 에뮬레이션.
