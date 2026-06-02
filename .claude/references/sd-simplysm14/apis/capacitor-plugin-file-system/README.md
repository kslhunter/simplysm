# @simplysm/capacitor-plugin-file-system

Capacitor 기반 네이티브 파일 시스템 접근 플러그인. Android 는 외부/앱 저장소 직접 접근(11+ 는 `MANAGE_EXTERNAL_STORAGE`, 10- 는 `READ/WRITE_EXTERNAL_STORAGE` 권한), Browser 는 IndexedDB 기반 에뮬레이션으로 동작.

## 사용 트리거 인덱스

- **FileSystem** — 파일 읽기/쓰기, 디렉토리 조회/생성, 삭제, 권한 확인/요청, 저장소 경로 조회가 필요할 때 쓰는 정적(static) 진입점 클래스(주 사용처).
- **StorageType** — `FileSystem.getStoragePath` 인자로 넘기는 저장소 위치 유형 리터럴을 고를 때.
- **FileInfo** — `FileSystem.readdir` 가 반환하는 항목 정보(이름 + 디렉토리 여부). 디렉토리 순회 시.
- **FileSystemPlugin** — Capacitor 네이티브 브릿지 원형 인터페이스 타입. 보통 `FileSystem` 가 래핑하므로 직접 호출 불필요. 커스텀 web 구현 작성이나 타입 참조 시에만.

## FileSystem (static 클래스)

모든 메서드 `static async`. 인스턴스 생성 없이 `FileSystem.xxx()` 호출. 내부적으로 `registerPlugin<FileSystemPlugin>("FileSystem")` 으로 얻은 네이티브/web 구현에 위임하고, 플러그인의 `{ ... }` 래퍼 결과를 평탄화해 반환.

- `checkPermissions(): Promise<boolean>` — 파일 접근 권한 보유 여부. true 면 권한 있음. 읽기/쓰기 전 사전 확인용. 플러그인의 `{ granted }` 를 boolean 으로 풀어 반환.
- `requestPermissions(): Promise<void>` — 권한 요청. Android 11+ 는 설정 화면으로 이동, Android 10- 는 권한 대화상자 표시. `checkPermissions()` 가 false 일 때 호출.
- `readdir(dirPath: string): Promise<FileInfo[]>` — 디렉토리 하위 항목 목록 조회. `dirPath` = 조회할 디렉토리 경로. 각 항목은 `FileInfo`(이름·디렉토리 여부).
- `getStoragePath(type: StorageType): Promise<string>` — 지정 유형 저장소의 절대 경로 조회. 경로를 직접 조립하지 말고 이 메서드로 베이스 경로를 얻어 join. `type` 풀이는 아래 StorageType 참조.
- `getUri(filePath: string): Promise<string>` — 파일을 FileProvider 기반 content URI 로 변환. 다른 앱(공유·열기 인텐트)에 파일을 넘길 때. `filePath` = 대상 파일 경로.
- `writeFile(filePath: string, data: string | Bytes): Promise<void>` — 파일 쓰기. `data` 가 `string` 이면 utf8 인코딩으로, `Bytes`(Uint8Array)면 base64 로 인코딩해(`bytes.toBase64`, cross-realm 안전) 저장. 텍스트면 string, 바이너리면 Bytes 를 넘김.
- `readFile(filePath: string): Promise<Bytes>` / `readFile(filePath: string, encoding: "utf8"): Promise<string>` — 파일 읽기 오버로드. `encoding` 생략 시 base64 로 읽어 `Bytes`(`bytes.fromBase64`) 반환(바이너리용), `"utf8"` 지정 시 텍스트 `string` 반환. 반환 타입이 오버로드로 갈리므로 바이너리는 인자 없이, 텍스트는 `"utf8"` 명시.
- `remove(targetPath: string): Promise<void>` — 파일 또는 디렉토리 삭제(재귀). `targetPath` = 삭제 대상 경로. 디렉토리면 하위까지 모두 제거.
- `mkdir(targetPath: string): Promise<void>` — 디렉토리 생성(재귀). `targetPath` = 생성할 경로. 중간 상위 디렉토리가 없으면 함께 생성.
- `exists(targetPath: string): Promise<boolean>` — 경로 존재 여부 확인. true 면 존재. 쓰기 전 충돌 확인이나 읽기 전 가드용.

```ts
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

if (!(await FileSystem.checkPermissions())) await FileSystem.requestPermissions();

const base = await FileSystem.getStoragePath("externalFiles");
await FileSystem.mkdir(`${base}/notes`);
await FileSystem.writeFile(`${base}/notes/memo.txt`, "hello"); // utf8
const text = await FileSystem.readFile(`${base}/notes/memo.txt`, "utf8"); // string
const raw = await FileSystem.readFile(`${base}/notes/memo.txt`); // Bytes
for (const f of await FileSystem.readdir(`${base}/notes`)) {
  console.log(f.name, f.isDirectory);
}
```

## StorageType / FileInfo / FileSystemPlugin

- `StorageType` — `getStoragePath(type)` 의 저장소 위치 선택 유니온. 값별 디렉토리 매핑:
  - `"external"` — 외부 저장소 루트(`Environment.getExternalStorageDirectory`). 사용자에게 노출되는 공용 영역 전체 접근 시. MANAGE_EXTERNAL_STORAGE 권한 필요.
  - `"externalFiles"` — 앱 전용 외부 파일 디렉토리. 앱이 소유하는 외부 영속 파일용(앱 제거 시 함께 삭제).
  - `"externalCache"` — 앱 전용 외부 캐시 디렉토리. 시스템이 공간 부족 시 회수할 수 있는 임시 캐시용.
  - `"externalMedia"` — 앱 전용 외부 미디어 디렉토리. 이미지·동영상 등 미디어 산출물용.
  - `"appData"` — 앱 데이터 디렉토리(내부 저장소). 앱 비공개 데이터용.
  - `"appFiles"` — 앱 파일 디렉토리(내부 저장소). 앱 비공개 영속 파일용.
  - `"appCache"` — 앱 캐시 디렉토리(내부 저장소). 앱 비공개 임시 캐시용.
- `FileInfo` — `readdir` 결과 배열의 각 항목.
  - `name: string` — 항목(파일·디렉토리) 이름.
  - `isDirectory: boolean` — 디렉토리 여부. true 면 디렉토리, false 면 파일. 재귀 순회 시 분기 기준.
- `FileSystemPlugin` — `registerPlugin` 에 넘기는 네이티브 브릿지 인터페이스. 메서드는 `FileSystem` 정적 메서드의 저수준 원형으로, 옵션 객체를 받고 래핑 전 결과를 `{ ... }` 로 반환:
  - `checkPermissions(): Promise<{ granted: boolean }>` — 권한 보유 여부를 `granted` 로 반환.
  - `requestPermissions(): Promise<void>` — 권한 요청.
  - `readdir(options: { path: string }): Promise<{ files: FileInfo[] }>` — `path` 디렉토리 항목 목록을 `files` 로 반환.
  - `getStoragePath(options: { type: StorageType }): Promise<{ path: string }>` — `type` 저장소의 실제 경로를 `path` 로 반환.
  - `getUri(options: { path: string }): Promise<{ uri: string }>` — `path` 파일의 FileProvider URI 를 `uri` 로 반환.
  - `writeFile(options: { path: string; data: string; encoding?: "utf8" | "base64" }): Promise<void>` — `data`(문자열)를 `encoding`(`"utf8"`=텍스트, `"base64"`=바이너리 디코드, 생략 시 구현 기본)으로 `path` 에 기록.
  - `readFile(options: { path: string; encoding?: "utf8" | "base64" }): Promise<{ data: string }>` — `path` 내용을 `encoding`(`"utf8"`=텍스트, `"base64"`=바이너리 인코딩 문자열)으로 읽어 `data` 로 반환.
  - `remove(options: { path: string }): Promise<void>` — `path` 파일/디렉토리 재귀 삭제.
  - `mkdir(options: { path: string }): Promise<void>` — `path` 디렉토리 재귀 생성.
  - `exists(options: { path: string }): Promise<{ exists: boolean }>` — `path` 존재 여부를 `exists` 로 반환.
  - 직접 호출 대신 `FileSystem` 사용 권장. 커스텀 web 구현 작성 시 이 인터페이스를 구현.
