# @simplysm/core-node — consola 설정/리포터

`features/consola/*`. consola reporter 를 환경별로 구성하거나, 콘솔용 pretty 출력과 파일 로그 출력을 직접 조합할 때 읽는 군. 사용법: [logging.md](../../manuals/logging.md)

## SetupConsolaOptions

`interface SetupConsolaOptions { cli?: boolean }`

- `cli?: boolean` — `true` 이면 `DEV` 환경값이 false 여도 prod 파일-only 분기를 건너뛴다(CLI 처럼 콘솔 출력을 유지하고 싶을 때).

## setupConsola

`function setupConsola(opts?: SetupConsolaOptions): void`

- `opts?: SetupConsolaOptions` — 분기 옵션. consola 전역 `level` 과 `reporters` 를 설정한다.
- prod 분기 — `!opts?.cli && !parseBoolEnv(env("DEV"))` 이면 `level = LogLevels.debug`, reporters = `[createFileReporter()]`.
- debug 분기 — 위가 아니고 `parseBoolEnv(env("SD_DEBUG"))` 이면 `level = LogLevels.debug`, reporters = `[new PrettyReporter()]`.
- 기본 분기 — 그 외에는 `level = LogLevels.debug`, reporters = `[createFileReporter(), withMaxLevel(new PrettyReporter(), LogLevels.info)]` (파일에는 debug 까지, 콘솔에는 info 까지).

## withMaxLevel

`function withMaxLevel(reporter: ConsolaReporter, maxLevel: number): ConsolaReporter`

- `reporter: ConsolaReporter` — 감쌀 reporter.
- `maxLevel: number` — 통과시킬 최대 level. `logObj.level > maxLevel` 이면 내부 reporter 호출 없이 반환(드롭).
- 반환 `ConsolaReporter` — 필터를 통과한 로그만 원본 reporter 의 `log(logObj, ctx)` 로 넘기는 wrapper.

## PrettyReporter

`class PrettyReporter implements ConsolaReporter`

`log(logObj: LogObject, ctx: { options: ConsolaOptions }): void`

- 출력 스트림 — `logObj.level < 2` 이면 `ctx.options.stderr ?? process.stderr`, 그 외에는 `ctx.options.stdout ?? process.stdout`.
- 색상 판정 — `NO_COLOR` 환경값이 있으면 끔, `FORCE_COLOR` 가 있으면 켬, 그 외에는 `process.stdout.isTTY === true` 또는 win32 이면 켬.
- type 처리 — `box` 는 `>` prefix 블록, `trace` 는 `Trace: <message>` Error stack 을 덧붙임, 그 외 type 은 `[tag]` · 아이콘 · message · date 를 한 줄로 조합. level < 2(또는 badge) 인 로그는 위아래 빈 줄을 둘러싼다.
- Error 처리 — args 안의 Error 는 message · stack(cwd/`file://` 정리) · `cause` 체인을 들여쓰기해 문자열화한다.

`formatPlain(logObj: LogObject, formatOptions?: Partial<FormatOpts>): string`

- `formatOptions.compact?: boolean | number` — `formatWithOptions` 의 객체 출력 compact 값으로 전달.
- `formatOptions.errorLevel?: number` — Error stack/cause 들여쓰기 레벨.
- `formatOptions.colors` / `formatOptions.date` — 호출자가 넘겨도 `false` 로 고정된다.
- 반환 `string` — 색·날짜·badge 여백 없이 포맷한 결과를 `trim()` 한 문자열(File reporter 등이 콘솔과 동일 표현을 재사용하기 위한 진입점).

## FileReporterOptions

`interface FileReporterOptions { maxSize?: number; maxDays?: number }`

- `maxSize?: number` — 로그 파일 1개 최대 크기. 기본 `20 * 1024 * 1024`(20MB).
- `maxDays?: number` — 보관 일수. 기본 `14`.

## createFileReporter

`function createFileReporter(options?: FileReporterOptions): ConsolaReporter`

- `options.maxSize?` — 현재 파일 크기 + 새 라인 길이가 이 값 이상이면 rotate.
- `options.maxDays?` — cutoff 날짜보다 오래된 로그 파일 삭제 기준.
- 반환 `ConsolaReporter` — `<process.cwd()>/.logs` 아래 파일에 append.
- 라인 형식 — `<yyyy-MM-dd HH:mm:ss.fff> [<TYPE>] <PrettyReporter.formatPlain(...)>\n`.
- 파일명 — 기본 `app.<yyyy-MM-dd>.log`; 해당 파일이 `maxSize` 이상이면 `app.<yyyy-MM-dd>.<seq>.log` 중 없거나 크기가 작은 첫 파일.
- 디렉토리 생성 — 첫 rotate 시 `.logs` 를 `recursive: true` 로 생성.
- 정리 시점 — 날짜 문자열이 마지막 정리 날짜와 다를 때만 `app.<date>(.<seq>).log` 패턴의 오래된 파일을 삭제한다.
