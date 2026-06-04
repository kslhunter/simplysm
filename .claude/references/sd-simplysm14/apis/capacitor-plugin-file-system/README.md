# @simplysm/capacitor-plugin-file-system

Capacitor 네이티브 파일 시스템 접근 플러그인. Android 는 OS 파일 시스템(Android 11+ 는 `MANAGE_EXTERNAL_STORAGE`, 10- 는 `READ/WRITE_EXTERNAL_STORAGE` 권한), 웹은 IndexedDB 기반 가상 파일 시스템으로 동일 API 를 에뮬레이션한다. 권한 확인/요청, 디렉토리 읽기·생성, 파일 읽기·쓰기·삭제, 저장소 경로·파일 URI 조회를 모두 `FileSystem` 정적 메서드로 제공한다.

## 사용 트리거 인덱스

- **FileSystem** — 앱에서 단말 파일을 읽고 쓰거나 디렉토리·권한을 다룰 때의 진입점. 모든 메서드가 `static async` 이며 인스턴스화 불필요(abstract class). 권한·경로·읽기/쓰기·삭제 전반.
- **StorageType** — `getStoragePath` 인자. 어느 저장소(외부/앱 전용/캐시 등) 의 기준 경로를 얻을지 고를 때.
- **FileInfo** — `readdir` 결과 항목 타입. 디렉토리 나열 결과를 순회·필터할 때.
- **FileSystemPlugin** — 저수준 Capacitor 플러그인 인터페이스(옵션 객체 기반 원형). 보통 직접 쓰지 않고 `FileSystem` 래퍼를 쓰며, 커스텀 네이티브/web 구현이나 옵션·반환 타입 참조가 필요할 때만 사용.

## FileSystem

모든 파일 작업의 진입점. 추상 클래스의 정적 메서드 모음이라 `new` 없이 `FileSystem.메서드()` 로 호출한다. 내부적으로 `registerPlugin<FileSystemPlugin>("FileSystem")` 으로 얻은 네이티브 구현(웹은 `FileSystemWeb`)에 위임하고, 플러그인의 `{ ... }` 래퍼 결과를 평탄화해 반환한다.

- `static checkPermissions(): Promise<boolean>` — 파일 접근 권한 보유 여부 확인. true = 권한 있음, false = 없음. 웹은 항상 true. 읽기/쓰기 전 게이트로 호출. 플러그인의 `{ granted }` 를 boolean 으로 풀어 반환.
- `static requestPermissions(): Promise<void>` — 권한 요청. Android 11+ 는 `MANAGE_EXTERNAL_STORAGE` 설정 화면으로 이동, Android 10- 는 권한 대화상자 표시. 웹은 무동작. `checkPermissions` 가 false 일 때 호출.
- `static readdir(dirPath: string): Promise<FileInfo[]>` — 디렉토리 내 항목 나열. `dirPath` = 나열할 디렉토리 경로. 디렉토리가 없으면 throw. 폴더 내용을 훑을 때. 각 항목은 `FileInfo`(이름·디렉토리 여부).
- `static getStoragePath(type: StorageType): Promise<string>` — 표준 저장소 위치의 기준 경로 문자열 조회. `type` = 어느 저장소인지(아래 StorageType). 경로를 하드코딩하지 말고 이 메서드로 베이스 경로를 얻어 join. 웹은 `/webfs/<type>` 가상 경로를 반환하며 해당 경로를 자동 생성.
- `static getUri(filePath: string): Promise<string>` — 파일을 외부에 넘길 수 있는 URI 조회. `filePath` = 대상 파일 경로. Android 는 FileProvider content:// URI(다른 앱 공유·뷰어 인텐트용), 웹은 `URL.createObjectURL` Blob URL 반환. 웹의 Blob URL 은 사용 후 반드시 `URL.revokeObjectURL(uri)` 로 해제(미해제 시 메모리 누수). 파일이 없으면 throw.
- `static writeFile(filePath: string, data: string | Bytes): Promise<void>` — 파일 쓰기(부모 디렉토리 자동 생성). `filePath` = 대상 경로. `data` = 문자열이면 utf8 인코딩으로, `Bytes`(Uint8Array)면 base64 로 변환해 바이너리 저장(`bytes.toBase64`, cross-realm 안전). 텍스트면 string, 바이너리면 Bytes 를 넘김.
- `static readFile(filePath: string): Promise<Bytes>` / `static readFile(filePath: string, encoding: "utf8"): Promise<string>` — 파일 읽기 오버로드. `encoding` 생략 시 base64 로 읽어 `Bytes`(`bytes.fromBase64`) 반환(바이너리용), `"utf8"` 지정 시 텍스트 `string` 반환. 반환 타입이 오버로드로 갈리므로 바이너리는 인자 없이, 텍스트는 `"utf8"` 명시. 파일이 없으면 throw.
- `static remove(targetPath: string): Promise<void>` — 파일/디렉토리 재귀 삭제. `targetPath` = 삭제 대상 경로(디렉토리면 하위 전체 삭제). 실패 시 throw. 정리·덮어쓰기 전 제거 시.
- `static mkdir(targetPath: string): Promise<void>` — 디렉토리 재귀 생성. `targetPath` = 생성할 디렉토리 경로(중간 상위 경로까지 모두 생성, 이미 있으면 무동작). 쓰기 전 폴더 보장 시. (`writeFile` 은 부모를 자동 생성하므로 빈 디렉토리만 필요할 때 사용)
- `static exists(targetPath: string): Promise<boolean>` — 경로 존재 여부 확인. true = 파일·디렉토리 존재, false = 없음. 읽기/삭제 전 분기 조건.

`data` 의 `Bytes` 는 `@simplysm/core-common` 의 바이트 배열 타입(Uint8Array 계열). 텍스트는 문자열로 그대로 전달, 바이너리는 `Bytes` 로 전달하면 내부에서 base64 왕복 처리한다.

사용 예:

```ts
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

if (!(await FileSystem.checkPermissions())) await FileSystem.requestPermissions();

const base = await FileSystem.getStoragePath("externalFiles");
await FileSystem.mkdir(`${base}/notes`);
await FileSystem.writeFile(`${base}/notes/memo.txt`, "hello"); // utf8
const text = await FileSystem.readFile(`${base}/notes/memo.txt`, "utf8"); // string
const raw = await FileSystem.readFile(`${base}/notes/memo.txt`); // Bytes
for (const f of await FileSystem.readdir(`${base}/notes`)) {
  if (!f.isDirectory) console.log(f.name);
}
const uri = await FileSystem.getUri(`${base}/notes/memo.txt`); // 웹: 사용 후 URL.revokeObjectURL(uri)
```

## StorageType

`getStoragePath(type)` 가 받는 저장소 유형 리터럴. 직접 경로를 만들지 말고 이 유형으로 플랫폼 표준 위치를 얻는다.

```ts
type StorageType =
  | "external" | "externalFiles" | "externalCache" | "externalMedia"
  | "appData" | "appFiles" | "appCache";
```

- `"external"` — 외부 저장소 루트(`Environment.getExternalStorageDirectory`). 사용자/타 앱과 공유되는 공용 영역 전체에 접근할 때. `MANAGE_EXTERNAL_STORAGE` 권한 필요.
- `"externalFiles"` — 앱 전용 외부 파일 디렉토리. 앱이 소유하는 외부 영속 파일(앱 제거 시 함께 삭제)을 둘 때.
- `"externalCache"` — 앱 전용 외부 캐시 디렉토리. 공간 부족 시 OS 가 회수할 수 있는 외부 임시 캐시를 둘 때.
- `"externalMedia"` — 앱 전용 외부 미디어 디렉토리. 이미지·동영상 등 미디어 산출물을 외부 미디어 영역에 둘 때.
- `"appData"` — 앱 데이터 디렉토리(내부 저장소). 앱 비공개 데이터 루트가 필요할 때.
- `"appFiles"` — 앱 파일 디렉토리(내부 저장소). 앱 비공개 영속 파일을 둘 때.
- `"appCache"` — 앱 캐시 디렉토리(내부 저장소). 재생성 가능한 내부 임시 캐시를 둘 때.

웹에서는 각 유형이 `/webfs/<type>` 가상 경로로 매핑되며 호출 시 해당 디렉토리를 자동 생성한다.

## FileInfo

`readdir` 가 반환하는 디렉토리 항목 1건.

```ts
interface FileInfo {
  name: string;
  isDirectory: boolean;
}
```

- `name: string` — 항목 이름(경로가 아닌 파일/디렉토리명). 표시·필터·경로 결합 시.
- `isDirectory: boolean` — 디렉토리 여부. true = 하위 디렉토리(재귀 탐색 대상), false = 파일. 파일만 처리할지 폴더로 내려갈지 분기할 때.

## FileSystemPlugin

저수준 Capacitor 플러그인 인터페이스. `FileSystem` 정적 메서드가 내부에서 위임하는 원형으로, 메서드가 옵션 객체(`{ path }`, `{ type }`, `{ path, data, encoding }`)를 받고 결과도 래핑 객체(`{ granted }`, `{ files }`, `{ path }`, `{ uri }`, `{ data }`, `{ exists }`)로 반환한다. 보통 직접 호출하지 않으며, 커스텀 web 구현(`FileSystemPlugin` 구현)을 작성하거나 옵션/반환 타입을 참조해야 할 때만 사용한다.

- `checkPermissions(): Promise<{ granted: boolean }>` — 권한 보유 여부를 `granted` 로 반환.
- `requestPermissions(): Promise<void>` — 권한 요청.
- `readdir(options: { path: string }): Promise<{ files: FileInfo[] }>` — `path` 디렉토리 항목 목록을 `files` 로 반환.
- `getStoragePath(options: { type: StorageType }): Promise<{ path: string }>` — `type` 저장소의 실제 경로를 `path` 로 반환.
- `getUri(options: { path: string }): Promise<{ uri: string }>` — `path` 파일의 외부 전달용 `uri` 반환.
- `writeFile(options: { path: string; data: string; encoding?: "utf8" | "base64" }): Promise<void>` — `path` 에 `data`(문자열) 기록. `encoding` = 입력 데이터 해석 방식. `"utf8"` = 텍스트 그대로, `"base64"` = base64 문자열을 바이너리로 디코드해 기록. 래퍼 `FileSystem.writeFile` 이 문자열은 `"utf8"`, `Bytes` 는 `"base64"` 로 자동 지정.
- `readFile(options: { path: string; encoding?: "utf8" | "base64" }): Promise<{ data: string }>` — `path` 읽어 `data`(문자열) 반환. `encoding` = 반환 문자열 형식. `"utf8"` = 텍스트, `"base64"` = 바이너리를 base64 문자열로 인코딩. 플러그인 레벨에서 바이너리는 항상 base64 문자열로 주고받고, `FileSystem` 가 `Bytes` ↔ base64 변환을 담당.
- `remove(options: { path: string }): Promise<void>` — `path` 파일/디렉토리 재귀 삭제.
- `mkdir(options: { path: string }): Promise<void>` — `path` 디렉토리 재귀 생성.
- `exists(options: { path: string }): Promise<{ exists: boolean }>` — `path` 존재 여부를 `exists` 로 반환.
