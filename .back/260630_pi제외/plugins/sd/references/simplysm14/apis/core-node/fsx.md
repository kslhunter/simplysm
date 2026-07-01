# @simplysm/core-node — fsx

`export * as fsx` 네임스페이스. Node `fs`, `glob`, JSON 직렬화, 재귀 복사/삭제, 부모 방향 파일 탐색을 함께 다룰 때 읽는 군.

## existsSync / exists

`function existsSync(targetPath: string): boolean`

- `targetPath: string` — 존재 여부를 확인할 파일 또는 디렉토리 경로.
- 반환 `boolean` — `fs.existsSync(targetPath)` 결과.

`function exists(targetPath: string): Promise<boolean>`

- `targetPath: string` — 접근 가능 여부를 확인할 파일 또는 디렉토리 경로.
- 반환 `Promise<boolean>` — `fs.promises.access` 가 성공하면 `true`, throw 하면 `false`.

## mkdirSync / mkdir

`function mkdirSync(targetPath: string): void`

- `targetPath: string` — 생성할 디렉토리 경로.
- 동작 — `fs.mkdirSync(targetPath, { recursive: true })` 로 생성하고 실패하면 `SdError(err, targetPath)` 를 throw.

`function mkdir(targetPath: string): Promise<void>`

- `targetPath: string` — 생성할 디렉토리 경로.
- 동작 — `fs.promises.mkdir(targetPath, { recursive: true })` 로 생성하고 실패하면 `SdError(err, targetPath)` 를 throw.

## rmSync / rm

`function rmSync(targetPath: string): void`

- `targetPath: string` — 삭제할 파일 또는 디렉토리 경로.
- 동작 — `fs.rmSync(targetPath, { recursive: true, force: true })` 로 삭제하고 실패하면 `SdError(err, targetPath)` 를 throw. 재시도 로직은 없다.

`function rm(targetPath: string): Promise<void>`

- `targetPath: string` — 삭제할 파일 또는 디렉토리 경로.
- Windows 디렉토리 동작 — 먼저 `lstat` 으로 디렉토리 여부를 확인하고, 디렉토리면 `cmd /c rd /s /q <targetPath>` 를 시도한다. 경로가 사라지면 즉시 반환한다.
- 공통 fallback 동작 — `fs.promises.rm(targetPath, { recursive: true, force: true, retryDelay: 500, maxRetries: 6 })` 로 삭제하고 실패하면 `SdError(err, targetPath)` 를 throw.

## copySync / copy

`function copySync(sourcePath: string, targetPath: string, filter?: (absolutePath: string) => boolean): void`

- `sourcePath: string` — 복사할 원본 파일 또는 디렉토리. 존재하지 않으면 아무 작업 없이 반환한다.
- `targetPath: string` — 복사 대상 경로. 원본이 디렉토리면 대상 디렉토리를 만들고 하위 항목을 재귀 복사한다.
- `filter?: (absolutePath: string) => boolean` — 각 하위 항목의 절대 경로를 받아 복사 여부를 반환한다. `false` 면 해당 항목을 건너뛰며, 디렉토리에 `false` 면 그 하위도 재귀 진입하지 않는다. 최상위 `sourcePath` 자체에는 적용되지 않는다.
- 파일 복사 동작 — 대상 상위 디렉토리를 만들고 `fs.copyFileSync` 를 최대 7회 시도한다. 재시도 사이에는 500ms busy-wait 한다. 최종 실패하면 `SdError(lastErr, targetPath)` 를 throw.

`function copy(sourcePath: string, targetPath: string, filter?: (absolutePath: string) => boolean): Promise<void>`

- `sourcePath: string` — 복사할 원본 파일 또는 디렉토리. 존재하지 않으면 아무 작업 없이 반환한다.
- `targetPath: string` — 복사 대상 경로. 원본이 디렉토리면 대상 디렉토리를 만들고 하위 항목을 재귀 복사한다.
- `filter?: (absolutePath: string) => boolean` — 각 하위 항목의 절대 경로를 받아 복사 여부를 반환한다. `false` 면 해당 항목을 건너뛰며, 디렉토리에 `false` 면 그 하위도 재귀 진입하지 않는다. 최상위 `sourcePath` 자체에는 적용되지 않는다.
- 디렉토리 동작 — `glob(path.resolve(sourcePath, "*"), { dot: true })` 로 숨김 항목까지 모으고 `parallelAsync` 로 하위 복사를 실행한다.
- 파일 복사 동작 — 대상 상위 디렉토리를 만들고 `fs.promises.copyFile` 을 최대 7회 시도한다. 재시도 사이에는 500ms 대기한다. 최종 실패하면 `SdError(lastErr, targetPath)` 를 throw.

## readSync / read / readBytesSync / readBytes

`function readSync(targetPath: string): string`

- `targetPath: string` — UTF-8 문자열로 읽을 파일 경로.
- 반환 `string` — `fs.readFileSync(targetPath, "utf-8")` 결과. 실패하면 `SdError(err, targetPath)` 를 throw.

`function read(targetPath: string): Promise<string>`

- `targetPath: string` — UTF-8 문자열로 읽을 파일 경로.
- 반환 `Promise<string>` — `fs.promises.readFile(targetPath, "utf-8")` 결과. 실패하면 `SdError(err, targetPath)` 를 throw.

`function readBytesSync(targetPath: string): Uint8Array`

- `targetPath: string` — 바이트 배열로 읽을 파일 경로.
- 반환 `Uint8Array` — `fs.readFileSync` 결과를 감싼 새 `Uint8Array`. 실패하면 `SdError(err, targetPath)` 를 throw.

`function readBytes(targetPath: string): Promise<Uint8Array>`

- `targetPath: string` — 바이트 배열로 읽을 파일 경로.
- 반환 `Promise<Uint8Array>` — `fs.promises.readFile` 결과를 감싼 새 `Uint8Array`. 실패하면 `SdError(err, targetPath)` 를 throw.

## readJsonSync / readJson

`function readJsonSync<TData = unknown>(targetPath: string): TData`

- `TData` — 반환값에 부여할 JSON 데이터 타입.
- `targetPath: string` — 읽을 JSON 파일 경로.
- 반환 `TData` — `readSync` 결과를 `json.parse` 로 파싱한 값. 파싱 실패 시 경로와 내용 프리뷰를 넣은 `SdError` 를 throw.

`function readJson<TData = unknown>(targetPath: string): Promise<TData>`

- `TData` — 반환값에 부여할 JSON 데이터 타입.
- `targetPath: string` — 읽을 JSON 파일 경로.
- 반환 `Promise<TData>` — `read` 결과를 `json.parse<TData>` 로 파싱한 값. 파싱 실패 시 경로와 내용 프리뷰를 넣은 `SdError` 를 throw.

## writeSync / write / writeJsonSync / writeJson

`function writeSync(targetPath: string, data: string | Uint8Array): void`

- `targetPath: string` — 쓸 파일 경로. 상위 디렉토리는 `mkdirSync(path.dirname(targetPath))` 로 먼저 생성된다.
- `data: string | Uint8Array` — 파일에 쓸 문자열 또는 바이트 배열.
- 동작 — `fs.writeFileSync(targetPath, data, { flush: true })` 로 기록하고 실패하면 `SdError(err, targetPath)` 를 throw.

`function write(targetPath: string, data: string | Uint8Array): Promise<void>`

- `targetPath: string` — 쓸 파일 경로. 상위 디렉토리는 `mkdir(path.dirname(targetPath))` 로 먼저 생성된다.
- `data: string | Uint8Array` — 파일에 쓸 문자열 또는 바이트 배열.
- 동작 — `fs.promises.writeFile(targetPath, data, { flush: true })` 로 기록하고 실패하면 `SdError(err, targetPath)` 를 throw.

`function writeJsonSync(targetPath: string, data: unknown, options?: { replacer?: (this: unknown, key: string | undefined, value: unknown) => unknown; space?: string | number }): void`

- `targetPath: string` — 쓸 JSON 파일 경로.
- `data: unknown` — `json.stringify` 로 직렬화할 값.
- `options.replacer?: (this: unknown, key: string | undefined, value: unknown) => unknown` — 직렬화 중 각 값 변환에 쓰는 함수.
- `options.space?: string | number` — 직렬화 결과의 들여쓰기 값.
- 동작 — `json.stringify(data, options)` 결과를 `writeSync` 로 쓴다.

`function writeJson(targetPath: string, data: unknown, options?: { replacer?: (this: unknown, key: string | undefined, value: unknown) => unknown; space?: string | number }): Promise<void>`

- `targetPath: string` — 쓸 JSON 파일 경로.
- `data: unknown` — `json.stringify` 로 직렬화할 값.
- `options.replacer?: (this: unknown, key: string | undefined, value: unknown) => unknown` — 직렬화 중 각 값 변환에 쓰는 함수.
- `options.space?: string | number` — 직렬화 결과의 들여쓰기 값.
- 동작 — `json.stringify(data, options)` 결과를 `write` 로 쓴다.

## readdirSync / readdir

`function readdirSync(targetPath: string): string[]`

- `targetPath: string` — 읽을 디렉토리 경로.
- 반환 `string[]` — `fs.readdirSync` 결과. 실패하면 `SdError(err, targetPath)` 를 throw.

`function readdir(targetPath: string): Promise<string[]>`

- `targetPath: string` — 읽을 디렉토리 경로.
- 반환 `Promise<string[]>` — `fs.promises.readdir` 결과. 실패하면 `SdError(err, targetPath)` 를 throw.

## statSync / stat / lstatSync / lstat

`function statSync(targetPath: string): fs.Stats`

- `targetPath: string` — 조회할 파일 또는 디렉토리 경로.
- 반환 `fs.Stats` — 심볼릭 링크를 따라간 `fs.statSync` 결과. 실패하면 `SdError(err, targetPath)` 를 throw.

`function stat(targetPath: string): Promise<fs.Stats>`

- `targetPath: string` — 조회할 파일 또는 디렉토리 경로.
- 반환 `Promise<fs.Stats>` — 심볼릭 링크를 따라간 `fs.promises.stat` 결과. 실패하면 `SdError(err, targetPath)` 를 throw.

`function lstatSync(targetPath: string): fs.Stats`

- `targetPath: string` — 조회할 파일 또는 디렉토리 경로.
- 반환 `fs.Stats` — 심볼릭 링크를 따라가지 않는 `fs.lstatSync` 결과. 실패하면 `SdError(err, targetPath)` 를 throw.

`function lstat(targetPath: string): Promise<fs.Stats>`

- `targetPath: string` — 조회할 파일 또는 디렉토리 경로.
- 반환 `Promise<fs.Stats>` — 심볼릭 링크를 따라가지 않는 `fs.promises.lstat` 결과. 실패하면 `SdError(err, targetPath)` 를 throw.

## globSync / glob

`function globSync(pattern: string, options?: GlobOptions): string[]`

- `pattern: string` — 검색할 glob 패턴. 내부에서 `\\` 를 `/` 로 바꾼다.
- `options?: GlobOptions` — `globSync` 에 전달할 옵션. 생략하면 빈 객체를 전달한다.
- 반환 `string[]` — 매칭 결과를 `path.resolve(item.toString())` 로 절대 경로화한 배열.

`function glob(pattern: string, options?: GlobOptions): Promise<string[]>`

- `pattern: string` — 검색할 glob 패턴. 내부에서 `\\` 를 `/` 로 바꾼다.
- `options?: GlobOptions` — `glob` 에 전달할 옵션. 생략하면 빈 객체를 전달한다.
- 반환 `Promise<string[]>` — 매칭 결과를 `path.resolve(item.toString())` 로 절대 경로화한 배열.

## clearEmptyDirectory

`function clearEmptyDirectory(dirPath: string): Promise<void>`

- `dirPath: string` — 비어 있는 하위 디렉토리를 정리할 시작 디렉토리.
- 동작 — 경로가 없으면 반환한다. 하위 항목을 순회해 디렉토리는 재귀 처리하고, 파일이 있는 디렉토리는 보존한다. 처리 뒤 현재 디렉토리의 항목이 0개이면 `rm(dirPath)` 로 삭제한다.

## findUpSync / findUp

`function findUpSync(fileGlob: string, fromPath: string, stopAt?: string): string | undefined`

- `fileGlob: string` — 각 현재 디렉토리에서 찾을 glob 패턴.
- `fromPath: string` — 검색을 시작할 경로. 이 값을 첫 `current` 로 사용한다.
- `stopAt?: string` — `current === stopAt` 이 되면 다음 부모로 올라가지 않고 중단한다. 생략하면 파일시스템 루트까지 올라간다.
- 반환 `string | undefined` — 첫 디렉토리에서 매칭이 있으면 그 배열의 첫 번째 절대 경로, 루트 또는 `stopAt` 까지 없으면 `undefined`.

`function findUp(fileGlob: string, fromPath: string, stopAt?: string): Promise<string | undefined>`

- `fileGlob: string` — 각 현재 디렉토리에서 찾을 glob 패턴.
- `fromPath: string` — 검색을 시작할 경로. 이 값을 첫 `current` 로 사용한다.
- `stopAt?: string` — `current === stopAt` 이 되면 다음 부모로 올라가지 않고 중단한다. 생략하면 파일시스템 루트까지 올라간다.
- 반환 `Promise<string | undefined>` — 첫 디렉토리에서 매칭이 있으면 그 배열의 첫 번째 절대 경로, 루트 또는 `stopAt` 까지 없으면 `undefined`.

## findUpAllSync / findUpAll

`function findUpAllSync(fileGlob: string, fromPath: string, stopAt?: string): string[]`

- `fileGlob: string` — 각 현재 디렉토리에서 찾을 glob 패턴.
- `fromPath: string` — 검색을 시작할 경로. 이 값을 첫 `current` 로 사용한다.
- `stopAt?: string` — `current === stopAt` 이 되면 다음 부모로 올라가지 않고 중단한다. 생략하면 파일시스템 루트까지 올라간다.
- 반환 `string[]` — 시작 경로부터 부모 방향으로 각 디렉토리의 매칭 절대 경로를 모두 누적한 배열.

`function findUpAll(fileGlob: string, fromPath: string, stopAt?: string): Promise<string[]>`

- `fileGlob: string` — 각 현재 디렉토리에서 찾을 glob 패턴.
- `fromPath: string` — 검색을 시작할 경로. 이 값을 첫 `current` 로 사용한다.
- `stopAt?: string` — `current === stopAt` 이 되면 다음 부모로 올라가지 않고 중단한다. 생략하면 파일시스템 루트까지 올라간다.
- 반환 `Promise<string[]>` — 시작 경로부터 부모 방향으로 수집한 디렉토리 목록에 대해 `glob` 을 병렬 실행한 뒤 평탄화한 배열.
