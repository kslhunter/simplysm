# @simplysm/capacitor-plugin-file-system

Capacitor 파일 시스템 접근 플러그인. Android 에서는 OS 파일 시스템(11+ `MANAGE_EXTERNAL_STORAGE`, 10- `READ/WRITE_EXTERNAL_STORAGE` 권한)에, 웹에서는 IndexedDB 기반 가상 파일 시스템 에뮬레이션(`capacitor_web_virtual_fs`)에 동일 API 로 접근한다. 진입점은 `FileSystem` 정적 클래스이며, 입출력 형태는 `StorageType`·`FileInfo`·`FileSystemPlugin` 타입으로 기술된다.

## 사용 트리거 인덱스

- **FileSystem** — 앱/웹에서 파일을 읽고 쓰거나 디렉토리·권한·저장소 경로·파일 URI 를 다룰 때의 진입점. 모든 메서드가 `static async` 이며 `new` 없이 `FileSystem.메서드()` 로 호출(abstract class).
- **StorageType** — `getStoragePath` 인자. 외부/앱 전용/캐시 등 어느 표준 저장소의 기준 경로를 얻을지 고를 때.
- **FileInfo** — `readdir` 결과 항목 1건의 타입(이름 + 디렉토리 여부). 디렉토리 나열 결과를 순회·분기할 때.
- **FileSystemPlugin** — 저수준 Capacitor 플러그인 계약 인터페이스(옵션 객체 기반 원형). 보통 직접 쓰지 않고 `FileSystem` 래퍼를 쓰며, 커스텀 web 구현이나 옵션·반환 타입 참조가 필요할 때만 사용.

## FileSystem

모든 파일 작업의 진입점인 abstract class. 정적 메서드만 모여 있어 인스턴스화 없이 호출한다. 내부적으로 `registerPlugin<FileSystemPlugin>("FileSystem", { web: () => new FileSystemWeb() })` 로 얻은 구현에 위임하고, 플러그인의 래핑 객체(`{ granted }` 등) 결과를 평탄화해 반환한다. 모든 메서드는 Promise 반환.

- `static checkPermissions(): Promise<boolean>` — 파일 접근 권한 보유 여부. `true` = 권한 있음, `false` = 없음. 웹은 항상 `true`. 읽기/쓰기 전 게이트로 호출. 플러그인의 `{ granted }` 를 boolean 으로 풀어 반환.
- `static requestPermissions(): Promise<void>` — 권한 요청. Android 11+ 는 설정 화면으로 이동, Android 10- 는 권한 대화상자 표시. 웹은 무동작. `checkPermissions()` 가 `false` 일 때 호출.
- `static readdir(dirPath: string): Promise<FileInfo[]>` — `dirPath` 디렉토리의 직접 하위 항목을 나열. 각 항목은 `FileInfo`(이름·디렉토리 여부). 웹 구현은 디렉토리 항목 자체가 없어도 하위에 파일 경로가 있으면 중간 경로를 `isDirectory: true` 로 취급(암시적 디렉토리). 대상이 디렉토리가 아니거나 없으면 throw.
- `static getStoragePath(type: StorageType): Promise<string>` — `type` 에 해당하는 표준 저장소 위치의 기준 경로 문자열. 경로를 하드코딩하지 말고 이 값으로 베이스를 얻어 join. 웹은 `/webfs/<type>` 가상 경로를 자동 생성 후 반환.
- `static getUri(filePath: string): Promise<string>` — 파일을 외부에 넘길 수 있는 URI. Android 는 FileProvider URI(타 앱 공유·뷰어 인텐트용), 웹은 파일 내용으로 만든 Blob 의 `URL.createObjectURL` Blob URL. 웹의 Blob URL 은 사용 후 반드시 `URL.revokeObjectURL(uri)` 로 해제(미해제 시 메모리 누수). 웹은 파일이 없으면 throw.
- `static writeFile(filePath: string, data: string | Bytes): Promise<void>` — 파일 쓰기. `data` 가 `string` 이면 `encoding: "utf8"` 로, `Bytes`(Uint8Array)이면 `bytes.toBase64` 로 base64 변환 후 `encoding: "base64"` 로 기록(cross-realm 안전). 텍스트면 문자열, 바이너리면 `Bytes` 를 넘김. 웹은 상위 디렉토리를 자동 생성.
- `static readFile(filePath: string): Promise<Bytes>` / `static readFile(filePath: string, encoding: "utf8"): Promise<string>` — 파일 읽기(오버로드). 반환 타입이 인자로 갈리므로 바이너리는 인자 없이, 텍스트는 `"utf8"` 명시. 파일이 없으면 throw.
  - `encoding` 생략 — base64 로 읽어 `bytes.fromBase64` 로 디코드한 `Bytes` 반환. 이미지·바이너리 파일용.
  - `encoding: "utf8"` — utf8 텍스트 `string` 반환. 텍스트 파일을 문자열로 바로 다룰 때.
- `static remove(targetPath: string): Promise<void>` — 파일/디렉토리 재귀 삭제(디렉토리면 하위 전체). 웹은 경로 접두사 매칭으로 하위 전체 삭제, 실패 시 throw. 정리·덮어쓰기 전 제거 시.
- `static mkdir(targetPath: string): Promise<void>` — 디렉토리 재귀 생성(중간 상위 경로까지, 이미 있으면 무동작). `writeFile` 은 부모를 자동 생성하므로 빈 디렉토리만 보장하면 될 때 사용.
- `static exists(targetPath: string): Promise<boolean>` — 경로 존재 여부. `true` = 파일·디렉토리 존재, `false` = 없음. 읽기/삭제 전 분기 조건.

`data` 의 `Bytes` 와 `readFile` 반환 `Bytes` 는 `@simplysm/core-common` 의 `Bytes` 타입(`Uint8Array`). 바이너리는 내부에서 base64 왕복 처리한다.

사용 예:

```ts
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

if (!(await FileSystem.checkPermissions())) await FileSystem.requestPermissions();

const base = await FileSystem.getStoragePath("externalFiles");
await FileSystem.mkdir(`${base}/notes`);
await FileSystem.writeFile(`${base}/notes/memo.txt`, "hello"); // utf8
const text = await FileSystem.readFile(`${base}/notes/memo.txt`, "utf8"); // string
const raw = await FileSystem.readFile(`${base}/notes/memo.txt`); // Bytes (Uint8Array)
for (const f of await FileSystem.readdir(`${base}/notes`)) {
  if (!f.isDirectory) console.log(f.name);
}
const uri = await FileSystem.getUri(`${base}/notes/memo.txt`); // 웹: 사용 후 URL.revokeObjectURL(uri)
```

## StorageType

`getStoragePath(type)` 가 받는 저장소 유형 리터럴 유니언. 직접 경로를 만들지 말고 이 유형으로 플랫폼 표준 위치를 얻는다.

```ts
type StorageType =
  | "external" | "externalFiles" | "externalCache" | "externalMedia"
  | "appData" | "appFiles" | "appCache";
```

- `"external"` — 외부 저장소 루트(`Environment.getExternalStorageDirectory`). 공용 외부 영역 전체에 접근할 때.
- `"externalFiles"` — 앱 전용 외부 파일 디렉토리. 앱이 소유하는 외부 영속 파일을 둘 때.
- `"externalCache"` — 앱 전용 외부 캐시 디렉토리. 외부 임시 캐시를 둘 때.
- `"externalMedia"` — 앱 전용 외부 미디어 디렉토리. 이미지·동영상 등 미디어 산출물을 둘 때.
- `"appData"` — 앱 데이터 디렉토리. 앱 데이터 루트가 필요할 때.
- `"appFiles"` — 앱 파일 디렉토리. 앱 영속 파일을 둘 때.
- `"appCache"` — 앱 캐시 디렉토리. 재생성 가능한 내부 임시 캐시를 둘 때.

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
- `isDirectory: boolean` — 디렉토리 여부. `true` = 하위 디렉토리(재귀 탐색 대상), `false` = 파일. 파일만 처리할지 폴더로 내려갈지 분기할 때.

## FileSystemPlugin

저수준 Capacitor 플러그인 계약 인터페이스. `FileSystem` 정적 메서드가 내부에서 위임하는 원형이며, 네이티브 구현과 웹 구현(`FileSystemWeb`)이 공유한다. 메서드가 옵션 객체(`{ path }`, `{ type }`, `{ path, data, encoding }`)를 받고 결과도 래핑 객체(`{ granted }`, `{ files }`, `{ path }`, `{ uri }`, `{ data }`, `{ exists }`)로 반환한다. 보통 직접 호출하지 않으며, 커스텀 web 구현을 작성하거나 옵션·반환 타입을 참조해야 할 때만 사용.

- `checkPermissions(): Promise<{ granted: boolean }>` — 권한 보유 여부를 `granted` 로 반환.
- `requestPermissions(): Promise<void>` — 권한 요청.
- `readdir(options: { path: string }): Promise<{ files: FileInfo[] }>` — `path` 디렉토리 항목 목록을 `files` 로 반환.
- `getStoragePath(options: { type: StorageType }): Promise<{ path: string }>` — `type` 저장소의 실제 경로를 `path` 로 반환.
- `getUri(options: { path: string }): Promise<{ uri: string }>` — `path` 파일의 외부 전달용 `uri` 반환.
- `writeFile(options: { path: string; data: string; encoding?: "utf8" | "base64" }): Promise<void>` — `path` 에 `data`(문자열) 기록. `encoding` = 입력 데이터 해석 방식. `"utf8"` = 텍스트 그대로 인코딩, `"base64"` = base64 문자열을 바이너리로 디코드해 기록. 래퍼 `FileSystem.writeFile` 이 문자열은 `"utf8"`, `Bytes` 는 `"base64"` 로 자동 지정.
- `readFile(options: { path: string; encoding?: "utf8" | "base64" }): Promise<{ data: string }>` — `path` 읽어 `data`(문자열) 반환. `encoding` = 반환 문자열 형식. `"utf8"` = 텍스트, `"base64"` = 바이너리를 base64 문자열로 반환. 플러그인 레벨에서 바이너리는 항상 base64 문자열로 주고받고, `FileSystem` 가 `Bytes` ↔ base64 변환을 담당.
- `remove(options: { path: string }): Promise<void>` — `path` 파일/디렉토리 재귀 삭제.
- `mkdir(options: { path: string }): Promise<void>` — `path` 디렉토리 재귀 생성.
- `exists(options: { path: string }): Promise<{ exists: boolean }>` — `path` 존재 여부를 `exists` 로 반환.
