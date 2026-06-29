# @simplysm/core-node — consola 설정/리포터

consola reporter 를 구성하거나, 콘솔용 pretty 출력과 파일 로그 출력을 직접 조합할 때 읽는 군. 사용법: [logging.md](../../manuals/logging.md)

## SetupConsolaOptions

`interface SetupConsolaOptions { cli?: boolean }`

- `cli?: boolean` — `true` 이면 `DEV` 환경값이 false 여도 prod 파일-only 분기를 건너뛴다.

## setupConsola

`function setupConsola(opts?: SetupConsolaOptions): void`

- `opts?: SetupConsolaOptions` — consola 설정 분기 옵션.
- prod 분기 — `!opts?.cli && !parseBoolEnv(env("DEV"))` 이면 `consola.level = LogLevels.debug`, `consola.options.reporters = [createFileReporter()]`.
- debug 분기 — prod 분기가 아니고 `parseBoolEnv(env("SD_DEBUG"))` 이면 `consola.level = LogLevels.debug`, `consola.options.reporters = [new PrettyReporter()]`.
- 기본 분기 — 그 외에는 `consola.level = LogLevels.debug`, `consola.options.reporters = [createFileReporter(), withMaxLevel(new PrettyReporter(), LogLevels.info)]`.

## withMaxLevel

`function withMaxLevel(reporter: ConsolaReporter, maxLevel: number): ConsolaReporter`

- `reporter: ConsolaReporter` — 감쌀 reporter.
- `maxLevel: number` — 통과시킬 최대 level. `logObj.level > maxLevel` 이면 내부 reporter 호출 없이 반환한다.
- 반환 `ConsolaReporter` — 필터를 통과한 로그만 원본 reporter 의 `log(logObj, ctx)` 로 전달하는 wrapper.

## PrettyReporter

`class PrettyReporter implements ConsolaReporter`

`log(logObj: LogObject, ctx: { options: ConsolaOptions }): void`

- `logObj: LogObject` — consola 가 전달한 로그 객체. `args`, `type`, `tag`, `level`, `date`, `message` 가 포맷 입력으로 쓰인다.
- `ctx.options: ConsolaOptions` — `formatOptions`, `stderr`, `stdout` 을 읽는다.
- 출력 스트림 — `logObj.level < 2` 이면 `ctx.options.stderr ?? process.stderr`, 그 외에는 `ctx.options.stdout ?? process.stdout` 에 쓴다.
- 색상 판정 — `NO_COLOR` 환경값이 있으면 끄고, `FORCE_COLOR` 환경값이 있으면 켜고, 그 외에는 `process.stdout.isTTY === true` 또는 win32 이면 켠다.
- type 처리 — `box` 는 ` > ` prefix 블록으로 출력하고, `trace` 는 `Trace: <message>` Error stack 을 덧붙인다. 그 외 type 은 tag, icon, message, date 를 한 줄로 조합한다.
- Error 처리 — args 안의 Error 는 message, stack, Error cause 체인을 들여쓰기해 문자열화한다.

`formatPlain(logObj: LogObject, formatOptions?: Partial<FormatOpts>): string`

- `logObj: LogObject` — 평문으로 포맷할 로그 객체.
- `formatOptions?: Partial<FormatOpts>` — `_formatLogObj` 에 전달할 포맷 옵션 일부.
- `formatOptions.compact?: boolean | number` — `formatWithOptions` 의 객체 출력 compact 값으로 전달된다.
- `formatOptions.errorLevel?: number` — Error stack/cause 들여쓰기 레벨 계산에 쓰인다.
- `formatOptions.colors?: boolean` — 호출자가 넘겨도 `false` 로 고정된다.
- `formatOptions.date?: boolean` — 호출자가 넘겨도 `false` 로 고정된다.
- 반환 `string` — 색, 날짜, badge 여백 없이 `_formatLogObj(...).trim()` 한 문자열.

## FileReporterOptions

`interface FileReporterOptions { maxSize?: number; maxDays?: number }`

- `maxSize?: number` — 로그 파일 1개의 최대 크기. 생략 시 `20 * 1024 * 1024`.
- `maxDays?: number` — 보관 일수. 생략 시 `14`.

## createFileReporter

`function createFileReporter(options?: FileReporterOptions): ConsolaReporter`

- `options?: FileReporterOptions` — 파일 크기와 보관일 옵션.
- `options.maxSize?: number` — 현재 파일 크기와 새 라인 길이 합이 이 값 이상이면 rotate 한다.
- `options.maxDays?: number` — cutoff 날짜 문자열보다 오래된 `app.<date>.log` 또는 `app.<date>.<seq>.log` 파일을 삭제할 때 쓴다.
- 반환 `ConsolaReporter` — `<process.cwd()>/.logs` 아래 파일에 append 하는 reporter.
- 라인 형식 — `<yyyy-MM-dd HH:mm:ss.fff> [<TYPE>] <PrettyReporter.formatPlain(...)>\n`.
- 파일명 — 기본 `app.<yyyy-MM-dd>.log`; 해당 파일이 `maxSize` 이상이면 `app.<yyyy-MM-dd>.<seq>.log` 중 없거나 크기가 작은 첫 파일.
- 디렉토리 생성 — 첫 rotate 시 `.logs` 디렉토리를 `fs.mkdirSync(outDir, { recursive: true })` 로 만든다.
- 정리 시점 — 날짜 문자열이 마지막 정리 날짜와 다를 때만 `cleanOldFiles(outDir, maxDays)` 를 호출한다.
