# @simplysm/core-node — pathx

`export * as pathx` 네임스페이스 (`utils/path.ts`). 경로 문자열을 POSIX 슬래시로 정규화하고, 하위 경로 판정·디렉토리 치환·basename 추출·target 필터링을 할 때 읽는 군.

## PosixPath

`type PosixPath = string & { [POSIX]: never }`

- 런타임 값은 평범한 `string` 임.
- `[POSIX]: never` — 모듈 내부 `Symbol("PosixPath")` 로 표현되는 타입상 브랜드 필드. `posix` 또는 `posixResolve` 반환으로만 이 타입을 얻을 수 있음.

## posix

`function posix(p: string): PosixPath`

- `p: string` — POSIX 표기로 바꿀 경로 문자열.
- 반환 `PosixPath` — `p.replace(/\\/g, "/")`. 경로 결합이나 절대 경로 resolve 는 하지 않음.

## posixResolve

`function posixResolve(...args: string[]): PosixPath`

- `args: string[]` — `path.resolve(...args)` 에 넘길 경로 조각들.
- 반환 `PosixPath` — resolve 된 절대 경로에서 `\\` 를 `/` 로 바꾼 문자열.

## changeFileDirectory

`function changeFileDirectory(filePath: string, fromDirectory: string, toDirectory: string): string`

- `filePath: string` — 디렉토리를 바꿀 파일 경로.
- `fromDirectory: string` — 기존 기준 디렉토리.
- `toDirectory: string` — 새 기준 디렉토리.
- 반환 `string` — `filePath === fromDirectory` 이면 `toDirectory`, 아니면 `path.resolve(toDirectory, path.relative(fromDirectory, filePath))`.
- 예외 — `filePath` 가 `fromDirectory` 의 하위가 아니면 `ArgumentError` 를 throw 하고 error data 에 `filePath`, `fromDirectory` 를 담음.

## basenameWithoutExt

`function basenameWithoutExt(filePath: string): string`

- `filePath: string` — basename 을 구할 파일 경로.
- 반환 `string` — `path.basename(filePath, path.extname(filePath))` (마지막 확장자 제거).

## isChildPath

`function isChildPath(childPath: string, parentPath: string): boolean`

- `childPath: string` — 하위 여부를 확인할 경로.
- `parentPath: string` — 부모 후보 경로.
- 반환 `boolean` — 양쪽을 `posixResolve` 로 정규화한 뒤 같은 경로면 `false`, 아니면 parent 뒤에 `/` 를 붙인 prefix 로 시작하는지 여부.

## filterByTargets

`function filterByTargets(files: string[], targets: string[], cwd: string): string[]`

- `files: string[]` — 필터링할 파일 경로 배열. 주석 기준 cwd 하위의 절대 경로를 기대함(외부 경로는 `../` 상대 경로로 처리됨).
- `targets: string[]` — cwd 기준 대상 경로 배열. 각 값은 `posix` 로 정규화됨(POSIX 스타일 권장).
- `cwd: string` — `path.relative(cwd, file)` 계산 기준 경로.
- 반환 `string[]` — `targets.length === 0` 이면 원본 `files`. 그 외에는 cwd 상대 POSIX 경로가 target 과 같거나 `target + "/"` 로 시작하는 파일만 남김.
