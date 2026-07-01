# @simplysm/core-node — fsx

`export * as fsx` 네임스페이스 (`utils/fs.ts`). Node `fs`, `glob`, JSON 직렬화, 재귀 복사/삭제, 부모 방향 파일 탐색을 함께 다룰 때 읽는 군. 대부분 함수는 실패 시 경로를 담은 `SdError(err, targetPath)` 를 throw 한다.

## existsSync / exists

`function existsSync(targetPath: string): boolean` / `function exists(targetPath: string): Promise<boolean>`

- `targetPath: string` — 확인할 파일 또는 디렉토리 경로.
- 동기는 `fs.existsSync` 결과. 비동기는 `fs.promises.access` 성공이면 `true`, throw 하면 `false`.

## mkdirSync / mkdir

`function mkdirSync(targetPath: string): void` / `function mkdir(targetPath: string): Promise<void>`

- `targetPath: string` — 생성할 디렉토리 경로.
- 동작 — `{ recursive: true }` 로 생성하고 실패하면 `SdError` 를 throw.

## rmSync / rm

`function rmSync(targetPath: string): void`

- `targetPath: string` — 삭제할 파일 또는 디렉토리 경로.
- 동작 — `fs.rmSync(targetPath, { recursive: true, force: true })`. 재시도 없이 즉시 실패하므로 일시적 잠금이 우려되면 `rm` 사용.

`function rm(targetPath: string): Promise<void>`

- `targetPath: string` — 삭제할 파일 또는 디렉토리 경로.
- Windows 디렉토리 — `lstat` 으로 디렉토리 여부 확인(없으면 무시하고 반환), 디렉토리면 `cmd /c rd /s /q <targetPath>` 우선 시도. 경로가 사라지면 즉시 반환.
- 공통 fallback — `fs.promises.rm(targetPath, { recursive: true, force: true, retryDelay: 500, maxRetries: 6 })`. 실패하면 `SdError` 를 throw.

## copySync / copy

`function copySync(sourcePath: string, targetPath: string, filter?: (absolutePath: string) => boolean): void`
`function copy(sourcePath: string, targetPath: string, filter?: (absolutePath: string) => boolean): Promise<void>`

- `sourcePath: string` — 복사 원본. 존재하지 않으면 아무 작업 없이 반환.
- `targetPath: string` — 대상 경로. 원본이 디렉토리면 대상 디렉토리를 만들고 `glob(.../*, { dot: true })` 로 숨김 항목까지 모아 재귀 복사(비동기는 `parallelAsync`).
- `filter?: (absolutePath: string) => boolean` — 각 하위 항목의 절대 경로를 받아 복사 여부 반환. `false` 면 건너뛰고, 디렉토리에 `false` 면 하위까지 진입하지 않음. 최상위 `sourcePath` 자체에는 적용되지 않음.
- 파일 복사 — 대상 상위 디렉토리를 만든 뒤 copyFile 을 최대 7회(`i <= 6`) 시도, 재시도 사이 500ms 대기(동기는 busy-wait). 최종 실패 시 `SdError(lastErr, targetPath)`.

## readSync / read / readBytesSync / readBytes

`function readSync(targetPath: string): string` / `function read(targetPath: string): Promise<string>`

- `targetPath: string` — 읽을 파일 경로.
- 반환 — UTF-8 문자열(`readFile(..., "utf-8")`).

`function readBytesSync(targetPath: string): Uint8Array` / `function readBytes(targetPath: string): Promise<Uint8Array>`

- `targetPath: string` — 읽을 파일 경로.
- 반환 — `readFile` 결과를 감싼 새 `Uint8Array`.

## readJsonSync / readJson

`function readJsonSync<TData = unknown>(targetPath: string): TData`
`function readJson<TData = unknown>(targetPath: string): Promise<TData>`

- `TData` — 반환값에 부여할 JSON 데이터 타입.
- `targetPath: string` — 읽을 JSON 파일 경로.
- 반환 — 파일 내용을 `json.parse` (core-common JsonConvert) 한 값. 파싱 실패 시 경로 + 내용 프리뷰(500자 초과 시 절단)를 담은 `SdError`.

## writeSync / write

`function writeSync(targetPath: string, data: string | Uint8Array): void`
`function write(targetPath: string, data: string | Uint8Array): Promise<void>`

- `targetPath: string` — 쓸 파일 경로. 상위 디렉토리를 먼저 `mkdir`(동기/비동기) 로 생성.
- `data: string | Uint8Array` — 쓸 문자열 또는 바이트 배열.
- 동작 — `writeFile(..., { flush: true })`. 실패 시 `SdError`.

## writeJsonSync / writeJson

`function writeJsonSync(targetPath: string, data: unknown, options?: { replacer?: (this: unknown, key: string | undefined, value: unknown) => unknown; space?: string | number }): void`
`function writeJson(targetPath: string, data: unknown, options?: {...}): Promise<void>`

- `targetPath: string` — 쓸 JSON 파일 경로.
- `data: unknown` — `json.stringify` 로 직렬화할 값.
- `options.replacer?` — 직렬화 중 각 값을 변환하는 함수.
- `options.space?: string | number` — 직렬화 결과 들여쓰기.
- 동작 — `json.stringify(data, options)` 결과를 `write`/`writeSync` 로 쓴다.

## readdirSync / readdir

`function readdirSync(targetPath: string): string[]` / `function readdir(targetPath: string): Promise<string[]>`

- `targetPath: string` — 읽을 디렉토리 경로.
- 반환 — `fs.readdir(Sync)` 결과(항목 이름 배열).

## statSync / stat / lstatSync / lstat

`function statSync(targetPath: string): fs.Stats` / `function stat(targetPath: string): Promise<fs.Stats>`

- 심볼릭 링크를 **따라간** stat 결과.

`function lstatSync(targetPath: string): fs.Stats` / `function lstat(targetPath: string): Promise<fs.Stats>`

- 심볼릭 링크를 **따라가지 않는** lstat 결과.

## globSync / glob

`function globSync(pattern: string, options?: GlobOptions): string[]`
`function glob(pattern: string, options?: GlobOptions): Promise<string[]>`

- `pattern: string` — glob 패턴. 내부에서 `\\` 를 `/` 로 치환.
- `options?: GlobOptions` — `glob` 패키지 옵션. 생략하면 빈 객체.
- 반환 — 매칭 결과를 `path.resolve(item.toString())` 로 절대 경로화한 배열.

## clearEmptyDirectory

`function clearEmptyDirectory(dirPath: string): Promise<void>`

- `dirPath: string` — 빈 하위 디렉토리를 정리할 시작 디렉토리.
- 동작 — 경로가 없으면 반환. 하위 디렉토리는 재귀 처리, 파일이 하나라도 있으면 보존. 처리 뒤 항목 수가 0이면 `rm(dirPath)` 로 삭제.

## findUpSync / findUp

`function findUpSync(fileGlob: string, fromPath: string, stopAt?: string): string | undefined`
`function findUp(fileGlob: string, fromPath: string, stopAt?: string): Promise<string | undefined>`

- `fileGlob: string` — 각 디렉토리에서 찾을 glob 패턴.
- `fromPath: string` — 검색 시작 경로(첫 `current`).
- `stopAt?: string` — `current === stopAt` 이면 더 올라가지 않고 중단. 생략하면 파일시스템 루트까지.
- 반환 — 가장 가까운 디렉토리의 첫 매칭 절대 경로(첫 매칭에서 즉시 중단), 없으면 `undefined`.

## findUpAllSync / findUpAll

`function findUpAllSync(fileGlob: string, fromPath: string, stopAt?: string): string[]`
`function findUpAll(fileGlob: string, fromPath: string, stopAt?: string): Promise<string[]>`

- `fileGlob: string` — 각 디렉토리에서 찾을 glob 패턴.
- `fromPath: string` — 검색 시작 경로.
- `stopAt?: string` — 중단 경로. **주의**: `fromPath` 가 `stopAt` 의 하위가 아니면 루트까지 검색한다.
- 반환 — 시작 경로부터 부모 방향 각 디렉토리의 매칭을 모두 누적한 배열(비동기는 디렉토리 목록에 `glob` 을 병렬 실행 후 평탄화).
