# @simplysm/core-node — consola 설정/리포터

consola reporter를 환경별로 구성하고, PrettyReporter(콘솔 출력) 및 FileReporter(로그 파일)를 직접 조합.

사용법: [logging.md](../../manuals/logging.md)

## setupConsola

`function setupConsola(opts?: SetupConsolaOptions): void`

consola 전역 `level`과 `reporters`를 환경 기반으로 설정.

### SetupConsolaOptions

- `cli?: boolean` — true이면 CLI 모드. prod 환경(DEV=false)일 때도 콘솔 출력 유지.

### 분기 로직

1. **prod**: `!opts?.cli && !parseBoolEnv(env("DEV"))`
   - `level = LogLevels.debug`
   - `reporters = [createFileReporter()]` (파일만, 콘솔 출력 없음)

2. **dev + SD_DEBUG**: `parseBoolEnv(env("SD_DEBUG")) === true`
   - `level = LogLevels.debug`
   - `reporters = [new PrettyReporter()]` (콘솔에 debug까지 모두 출력)

3. **dev 기본**: 위 모두 아님
   - `level = LogLevels.debug`
   - `reporters = [createFileReporter(), withMaxLevel(new PrettyReporter(), LogLevels.info)]`
     - 파일에는 debug까지 모두, 콘솔에는 info까지만

## withMaxLevel

`function withMaxLevel(reporter: ConsolaReporter, maxLevel: number): ConsolaReporter`

reporter 감싸서 level 필터링.

- `logObj.level > maxLevel` 이면 내부 reporter 호출 없음 (로그 드롭).
- 그 외에는 원본 reporter의 `log(logObj, ctx)` 호출.

## PrettyReporter

`class PrettyReporter implements ConsolaReporter`

콘솔 출력용 pretty 포매팅.

### log(logObj: LogObject, ctx: { options: ConsolaOptions }): void

**출력 스트림**

- `logObj.level < 2` → `ctx.options.stderr ?? process.stderr`
- 그 외 → `ctx.options.stdout ?? process.stdout`

**색상 감지**

- `NO_COLOR` 환경값 있으면 비활성화
- `FORCE_COLOR` 환경값 있으면 활성화
- 그 외 → `process.stdout.isTTY === true` 또는 `win32` 플랫폼이면 활성화

**로그 타입 처리**

- `box` — `> ` prefix로 줄 바꾼 블록 포매팅
- `trace` — `Trace: <message>` 뒤 Error stack 추가
- 기타 type — `[tag]` + 아이콘 + message + date를 한 줄로 조합
- badge 여부 — `logObj.level < 2` 또는 badge 플래그 있으면 위아래 빈 줄 추가

**Error 처리**

- args 안 Error 객체는 message + stack + cause 체인을 들여쓰기로 포매팅
- stack은 cwd 경로, `file://` prefix 정리

### formatPlain(logObj: LogObject, formatOptions?: Partial<FormatOpts>): string

색, 날짜, badge 여백 제외해 포매팅.

File reporter 등이 콘솔과 동일 포맷 재사용용.

- `formatOptions.colors` — 항상 false (색 미적용)
- `formatOptions.date` — 항상 false (날짜 미표시)
- `formatOptions.compact?: boolean | number` — Node `formatWithOptions`의 객체 출력 compact 값
- `formatOptions.errorLevel?: number` — Error 들여쓰기 레벨
- 반환: `trim()`된 문자열

## FileReporter

`function createFileReporter(options?: FileReporterOptions): ConsolaReporter`

로그 파일에 append하는 reporter.

`<process.cwd()>/.logs/` 아래에 기록.

### FileReporterOptions

- `maxSize?: number` — 파일 1개 최대 크기. 기본: 20MB. 초과하면 새 파일로 rotate.
- `maxDays?: number` — 로그 보관 기간. 기본: 14일. 초과하면 삭제.

### 동작

**라인 형식**

```
<yyyy-MM-dd HH:mm:ss.fff> [<TYPE>] <PrettyReporter.formatPlain()>
```

**파일명**

- 기본: `app.<yyyy-MM-dd>.log`
- 크기 초과 시: `app.<yyyy-MM-dd>.<seq>.log` (seq는 1부터 증가, 없거나 작은 파일 선택)

**rotate 조건**

- 날짜가 변경됨
- 현재 파일 크기 + 새 라인 길이 ≥ maxSize

**디렉토리 생성**

- 첫 rotate 시 `.logs` 디렉토리를 `{ recursive: true }`로 생성

**정리 시점**

- 날짜 변경 시 (로그 라인 기준 `logObj.date`)
- 오래된 파일 삭제: `app.<date>(.<seq>).log` 패턴에서 cutoff 날짜보다 이른 파일
