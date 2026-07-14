# @simplysm/core-node — fsx

파일시스템 조작, 내용 읽기/쓰기, glob 패턴 검색, 부모 방향 탐색. 대부분 함수는 실패 시 경로를 담은 `SdError`를 throw함. 동기/비동기 짝으로 제공됨.

## 존재 여부 확인

- `existsSync(targetPath: string): boolean` — 파일 또는 디렉토리 존재 확인 (동기). `fs.existsSync` 결과 반환.
- `exists(targetPath: string): Promise<boolean>` — 파일 또는 디렉토리 존재 확인 (비동기). `fs.promises.access` 성공하면 true, 실패하면 false.

## 디렉토리 생성

- `mkdirSync(targetPath: string): void` — 디렉토리 생성 (동기). 상위 경로도 자동 생성(`{ recursive: true }`). 실패 시 `SdError` throw.
- `mkdir(targetPath: string): Promise<void>` — 디렉토리 생성 (비동기). 상위 경로도 자동 생성. 실패 시 `SdError` throw.

## 삭제

- `rmSync(targetPath: string): void` — 파일 또는 디렉토리 삭제 (동기). 하위 항목도 재귀 삭제(`{ recursive: true, force: true }`). 재시도 없이 즉시 실패하므로 일시적 잠금 우려 시 비동기 `rm` 사용. 실패 시 `SdError` throw.
- `rm(targetPath: string): Promise<void>` — 파일 또는 디렉토리 삭제 (비동기). Windows 디렉토리는 `cmd /c rd /s /q` 우선 시도(node_modules 같은 소형 파일 대량 디렉토리에서 더 빠름). rd 실패 또는 경로 잔존 시 `fs.promises.rm`으로 폴백, 재시도 최대 6회(500ms 간격). 최종 실패 시 `SdError` throw.

## 복사

- `copySync(sourcePath: string, targetPath: string, filter?: (absolutePath: string) => boolean): void` — 파일 또는 디렉토리 복사 (동기).
  - `sourcePath` 존재하지 않으면 아무 작업 없이 반환.
  - 디렉토리면 대상 디렉토리 생성 후 `glob(.../*, { dot: true })`로 숨김 항목까지 수집해 재귀 복사.
  - `filter?(absolutePath)` — 각 하위 항목의 절대 경로 판정. true = 복사, false = 제외. 디렉토리에 false면 하위 진입 생략. 최상위 sourcePath는 필터링 대상 아님.
  - 파일 복사: 대상 상위 디렉토리 생성 후 copyFile 최대 7회 시도, 재시도 사이 500ms busy-wait. 최종 실패 시 `SdError(lastErr, targetPath)`.

- `copy(sourcePath: string, targetPath: string, filter?: (absolutePath: string) => boolean): Promise<void>` — 파일 또는 디렉토리 복사 (비동기).
  - 동기 버전과 동일한 재귀·필터 로직. 하위 항목은 `parallelAsync`로 병렬 복사.
  - 파일 복사: 재시도 사이 `setTimeout(resolve, 500)` 대기.

## 파일 읽기

- `readSync(targetPath: string): string` — 파일을 UTF-8 문자열로 읽기 (동기). 실패 시 `SdError` throw.
- `read(targetPath: string): Promise<string>` — 파일을 UTF-8 문자열로 읽기 (비동기). 실패 시 `SdError` throw.
- `readBytesSync(targetPath: string): Uint8Array` — 파일을 바이트 배열로 읽기 (동기). 실패 시 `SdError` throw.
- `readBytes(targetPath: string): Promise<Uint8Array>` — 파일을 바이트 배열로 읽기 (비동기). 실패 시 `SdError` throw.

## JSON 파일 읽기

- `readJsonSync<TData>(targetPath: string): TData` — JSON 파일을 지정 타입으로 읽기 (동기). 내부에서 파일 내용을 `json.parse` (core-common JsonConvert). 파싱 실패 시 경로 + 내용 프리뷰(500자 초과면 절단)를 담은 `SdError` throw.
- `readJson<TData>(targetPath: string): Promise<TData>` — JSON 파일을 지정 타입으로 읽기 (비동기). 파싱 로직 동일.

## 파일 쓰기

- `writeSync(targetPath: string, data: string | Uint8Array): void` — 파일에 데이터 쓰기 (동기). 상위 디렉토리 먼저 자동 생성. `fs.writeFileSync(..., { flush: true })` 사용. 실패 시 `SdError` throw.
- `write(targetPath: string, data: string | Uint8Array): Promise<void>` — 파일에 데이터 쓰기 (비동기). 상위 디렉토리 먼저 자동 생성. `fs.promises.writeFile(..., { flush: true })` 사용. 실패 시 `SdError` throw.

## JSON 파일 쓰기

- `writeJsonSync(targetPath: string, data: unknown, options?: { replacer?: (this: unknown, key: string | undefined, value: unknown) => unknown; space?: string | number }): void` — JSON 파일에 데이터 쓰기 (동기). 내부에서 `json.stringify(data, options)` 후 `writeSync` 사용.
- `writeJson(targetPath: string, data: unknown, options?: { ... }): Promise<void>` — JSON 파일에 데이터 쓰기 (비동기). 내부에서 `json.stringify` 후 `write` 사용.

## 디렉토리 읽기

- `readdirSync(targetPath: string): string[]` — 디렉토리 항목 이름 배열 읽기 (동기). `fs.readdirSync` 결과. 실패 시 `SdError` throw.
- `readdir(targetPath: string): Promise<string[]>` — 디렉토리 항목 이름 배열 읽기 (비동기). `fs.promises.readdir` 결과. 실패 시 `SdError` throw.

## 파일 정보 조회

- `statSync(targetPath: string): fs.Stats` — 파일 정보 조회 (동기, 심볼릭 링크 추적). `fs.statSync` 결과. 실패 시 `SdError` throw.
- `stat(targetPath: string): Promise<fs.Stats>` — 파일 정보 조회 (비동기, 심볼릭 링크 추적). `fs.promises.stat` 결과. 실패 시 `SdError` throw.
- `lstatSync(targetPath: string): fs.Stats` — 파일 정보 조회 (동기, 심볼릭 링크 미추적). `fs.lstatSync` 결과. 실패 시 `SdError` throw.
- `lstat(targetPath: string): Promise<fs.Stats>` — 파일 정보 조회 (비동기, 심볼릭 링크 미추적). `fs.promises.lstat` 결과. 실패 시 `SdError` throw.

## Glob 검색

- `globSync(pattern: string, options?: GlobOptions): string[]` — glob 패턴으로 파일 검색 (동기). 패턴의 백슬래시를 슬래시로 변환 후 처리. 결과를 `path.resolve()`로 절대 경로화.
- `glob(pattern: string, options?: GlobOptions): Promise<string[]>` — glob 패턴으로 파일 검색 (비동기). 패턴 변환·절대 경로화 동일.

## 빈 디렉토리 정리

- `clearEmptyDirectory(dirPath: string): Promise<void>` — 하위 빈 디렉토리 재귀 삭제 (비동기). 경로 없으면 반환. 하위 디렉토리 재귀 처리하되, 파일 하나라도 있으면 보존. 처리 후 항목이 0이면 `rm(dirPath)` 으로 현재 디렉토리도 삭제.

## 부모 방향 탐색 (첫 매칭)

- `findUpSync(fileGlob: string, fromPath: string, stopAt?: string): string | undefined` — 부모 디렉토리 방향으로 glob 패턴에 매칭되는 첫 파일 찾기 (동기). 각 디렉토리에서 `glob(path.resolve(current, fileGlob))` 실행, 첫 매칭에서 즉시 중단.
  - `fromPath` — 검색 시작 경로.
  - `stopAt` — 중단 경로. 지정하면 `current === stopAt`에서 더 올라가지 않음. 생략하면 파일시스템 루트까지.
  - 반환 — 첫 매칭 절대 경로, 없으면 undefined.

- `findUp(fileGlob: string, fromPath: string, stopAt?: string): Promise<string | undefined>` — 부모 디렉토리 방향으로 glob 패턴에 매칭되는 첫 파일 찾기 (비동기). 동기 버전과 동일한 로직.

## 부모 방향 탐색 (전체 누적)

- `findUpAllSync(fileGlob: string, fromPath: string, stopAt?: string): string[]` — 부모 디렉토리 방향 모든 디렉토리에서 glob 매칭 파일 누적 (동기). 각 디렉토리의 결과를 배열에 추가.
  - `stopAt` — 중단 경로. **주의**: `fromPath`가 `stopAt`의 하위가 아니면 루트까지 검색.

- `findUpAll(fileGlob: string, fromPath: string, stopAt?: string): Promise<string[]>` — 부모 디렉토리 방향 모든 디렉토리에서 glob 매칭 파일 누적 (비동기). 디렉토리 목록을 구성 후 각 디렉토리의 glob을 병렬 실행(`Promise.all`), 결과 평탄화.
