# @simplysm/core-node — consola 로깅 설정

`consola` 글로벌 로거의 reporter 를 환경별로 구성하는 셋업과 reporter 구현. 앱 진입점에서 1회 `setupConsola()` 호출이 일반적 사용. 콘솔용 `PrettyReporter`(색·아이콘·tag·날짜·에러 스택·box) 와 일자별 rotate 되는 `createFileReporter` 를 조합한다.

## setupConsola

- `setupConsola(opts?: SetupConsolaOptions): void` — 환경 변수(`DEV`, `SD_DEBUG`)에 따라 `consola.level` 과 `reporters` 를 설정. 모든 경우 level 은 `debug` 포함.
  - `opts.cli?: boolean` — CLI 모드 여부.
  - 분기:
    - `cli` 아니고 `DEV` 아님(prod) → 파일 reporter 만(`createFileReporter()`). 콘솔 출력 없음, debug 까지 파일 기록.
    - `SD_DEBUG` 참(dev+디버그) → `PrettyReporter` 만, debug 까지 콘솔 출력.
    - 그 외(dev) → 파일 reporter + `info` 까지만 콘솔 출력하는 PrettyReporter(`withMaxLevel(..., LogLevels.info)`). 파일에는 debug 전부, 콘솔에는 info 이하만.
  - `env`/`parseBoolEnv` 는 `@simplysm/core-common` 사용. `DEV`/`SD_DEBUG` 는 boolean 환경값.

```ts
setupConsola({ cli: true });
```

## withMaxLevel

- `withMaxLevel(reporter: ConsolaReporter, maxLevel: number): ConsolaReporter` — reporter 를 감싸 `logObj.level > maxLevel` 인 로그를 버리는 필터 래퍼. 콘솔에는 정보성만, 파일에는 전부 같은 패턴에 사용. consola LogLevels 숫자(작을수록 심각: error 0, warn 1, info 3 등) 기준.

## PrettyReporter

- `class PrettyReporter implements ConsolaReporter` — 색·아이콘·tag·날짜·에러 스택·box 를 직접 포맷하는 콘솔 reporter. level<2(error/warn) 는 stderr, 그 외 stdout 으로 출력. 색 지원은 `NO_COLOR`/`FORCE_COLOR`/TTY/win32 로 자동 감지.
  - `log(logObj, ctx): void` — consola 가 호출하는 reporter 인터페이스. 한 줄(또는 멀티라인) 포맷 후 스트림에 기록. error 의 `cause` 체인을 들여쓰기로 펼치고, 스택에서 cwd/`file://` 접두 제거.
  - `formatPlain(logObj, formatOptions?): string` — 색·날짜·뱃지 여백 **없이** 평문으로 포맷(trim). 아이콘·tag·객체 inspect·스택 표현은 콘솔과 동일하게 재사용. 파일 reporter 등이 콘솔과 같은 본문을 얻기 위한 진입점.
    - `formatOptions?` — 콘솔과 동일한 `ctx.options.formatOptions`(예: 객체 펼침 `compact`)를 넘기면 출력이 콘솔과 일치.

## createFileReporter

- `createFileReporter(options?: FileReporterOptions): ConsolaReporter` — `<cwd>/.logs/app.<YYYY-MM-DD>.log` 에 기록하는 reporter 생성. 본문은 `PrettyReporter.formatPlain` 으로 콘솔과 동일하게, 앞에 `타임스탬프 [TYPE]` 접두를 붙임. 날짜 변경 또는 크기 초과 시 rotate, 일자 바뀔 때 오래된 파일 정리.
  - `options.maxSize?: number` — 파일 1개 최대 바이트. 초과 시 `app.<date>.<seq>.log` 로 분할. 기본 20MB(`20 * 1024 * 1024`).
  - `options.maxDays?: number` — 보관 일수. cutoff(오늘 - maxDays) 이전 날짜 파일 삭제. 기본 14.

```ts
consola.options.reporters = [createFileReporter({ maxSize: 5 * 1024 * 1024, maxDays: 7 })];
```

## FileReporterOptions / SetupConsolaOptions

- `interface FileReporterOptions { maxSize?: number; maxDays?: number }` — 위 createFileReporter 옵션 타입.
- `interface SetupConsolaOptions { cli?: boolean }` — 위 setupConsola 옵션 타입.
