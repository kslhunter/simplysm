# @simplysm/cordova-plugin-file-system

Cordova(Android 전용) 네이티브 파일 시스템 접근 플러그인. `CordovaFileSystem` 정적 클래스로 권한 요청, 저장소 경로 조회, 파일/디렉토리 읽기·쓰기·삭제·생성·존재확인을 수행함. (deprecated — Capacitor로 전환됨)

## 사용 트리거 인덱스

- **CordovaFileSystem.checkPermissionAsync / requestPermissionAsync** — Android 파일 접근 권한을 먼저 확인·요청해야 할 때.
- **CordovaFileSystem.getStoragePathAsync** — 외부/앱 저장소의 절대 경로 베이스를 구해 파일 경로를 조립할 때.
- **CordovaFileSystem.getFileUriAsync** — 파일 경로를 다른 앱에 넘길 수 있는 URI(content:// 등)로 변환할 때.
- **CordovaFileSystem.readdirAsync / existsAsync** — 디렉토리 목록 조회나 경로 존재 여부 확인이 필요할 때.
- **CordovaFileSystem.readFileStringAsync / readFileBufferAsync** — 파일 내용을 문자열 또는 바이너리(Buffer)로 읽을 때.
- **CordovaFileSystem.writeFileAsync** — 문자열 또는 Buffer 데이터를 파일에 쓸 때.
- **CordovaFileSystem.mkdirsAsync / removeAsync** — 디렉토리를 생성하거나 파일/디렉토리를 삭제할 때.

## CordovaFileSystem

모든 멤버는 `static async`. 내부적으로 `cordova.exec(...)`로 네이티브(`"CordovaFileSystem"` service) 액션을 호출함. `@types/cordova` 전역 `cordova` 의존. Android 플랫폼만 지원.

### 권한

- `checkPermissionAsync(): Promise<boolean>` — 파일 접근 권한 보유 여부 확인. 네이티브 `checkPermission` 액션의 문자열 결과가 `"true"`면 `true` 반환.
- `requestPermissionAsync(): Promise<void>` — 파일 접근 권한 요청. 네이티브 `requestPermission` 액션 호출. 반환값 없음(요청 완료 시 resolve).

### 저장소 경로

- `getStoragePathAsync(type): Promise<string>` — 지정 저장소 타입의 절대 경로 베이스를 반환(네이티브 `getStoragePath`). `type` 리터럴:
  - `"external"` — 외부 저장소 루트.
  - `"externalFiles"` — 앱 전용 외부 파일 디렉토리.
  - `"externalCache"` — 앱 전용 외부 캐시 디렉토리.
  - `"externalMedia"` — 앱 전용 외부 미디어 디렉토리.
  - `"appData"` — 앱 내부 데이터 디렉토리.
  - `"appFiles"` — 앱 내부 파일 디렉토리.
  - `"appCache"` — 앱 내부 캐시 디렉토리.
- `getFileUriAsync(filePath: string): Promise<string>` — `filePath`에 대응하는 파일 URI 문자열 반환(네이티브 `getFileUri`). 외부 공유/인텐트 전달용 URI가 필요할 때 사용.

### 조회

- `readdirAsync(dirPath: string): Promise<{ name: string; isDirectory: boolean }[]>` — `dirPath` 하위 항목 목록 반환(네이티브 `readdir`). 각 항목: `name`(항목 이름), `isDirectory`(디렉토리면 `true`, 파일이면 `false`).
- `existsAsync(targetPath: string): Promise<boolean>` — 파일/디렉토리 존재 여부 확인(네이티브 `exists`). 결과 문자열이 `"true"`면 `true`.

### 읽기

- `readFileStringAsync(filePath: string): Promise<string>` — 파일을 UTF-8 문자열로 읽음(네이티브 `readFileString`). 파일이 없으면 `FileNotFoundException` 에러 발생(reject).
- `readFileBufferAsync(filePath: string): Promise<Buffer>` — 파일을 바이너리로 읽음. 네이티브 `readFileBase64`가 반환한 base64를 `Buffer.from(..., "base64")`로 디코딩해 반환. 이미지·바이너리 파일 읽을 때 사용.

### 쓰기

- `writeFileAsync(filePath: string, data: string | Buffer): Promise<void>` — 파일 쓰기. `data`가 `Buffer`(`Buffer.isBuffer` 판정)면 base64로 인코딩해 네이티브 `writeFileBase64` 호출, 그 외(string)면 네이티브 `writeFileString` 호출. 문자열/바이너리 둘 다 단일 진입점.

### 디렉토리/삭제

- `mkdirsAsync(targetPath: string): Promise<void>` — 디렉토리 재귀 생성(네이티브 `mkdirs`). 중간 경로가 없어도 모두 생성.
- `removeAsync(targetPath: string): Promise<void>` — 파일 또는 디렉토리 삭제(네이티브 `remove`). 디렉토리는 재귀 삭제.
