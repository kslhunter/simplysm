# @simplysm/core-node — consola 로깅 설정

전역 `consola` 로거의 level/reporter 를 환경(prod/dev/cli)에 맞춰 구성한다. 콘솔용 pretty 출력과 일자별 회전 파일 로그(콘솔과 동일한 평문, 색만 제거)를 제공한다.

## setupConsola

- `setupConsola(opts?: SetupConsolaOptions): void` — 전역 `consola` 의 `level`/`options.reporters` 를 환경에 맞게 설정. 앱·CLI 부트스트랩 시 1회 호출. level 은 모든 분기에서 `debug` 포함.
  - `opts.cli?: boolean` — true 면 CLI 모드로 취급해 dev 분기를 사용(prod 파일 전용 분기를 건너뜀).
- `SetupConsolaOptions` — `{ cli?: boolean }`.

환경별 동작:
- **prod** (`cli` 아님 + `DEV` env 가 truthy 아님): `createFileReporter()` 만 — 콘솔 출력 없이 파일에만 debug 포함 기록.
- **dev + `SD_DEBUG` truthy**: `PrettyReporter` 만 — 콘솔에 debug 포함 출력.
- **dev** (그 외): `createFileReporter()` + `withMaxLevel(new PrettyReporter(), info)` — 파일엔 debug 까지, 콘솔엔 info 이하까지만.

```ts
setupConsola({ cli: true });
import consola from "consola";
consola.info("started");
```

## PrettyReporter

- `class PrettyReporter implements ConsolaReporter` — 컬러·아이콘·태그·스택 정리 콘솔 리포터. `new PrettyReporter()` 로 사용.
  - level < 2(error/warn)는 stderr, 그 외는 stdout 으로 출력.
  - 컬러 지원은 `NO_COLOR`(있으면 끔) → `FORCE_COLOR`(있으면 켬) → TTY → Windows 순으로 자동 판정.
  - Error 인자는 메시지 + 정리된 스택(cwd 접두 제거, `file://` 제거)으로 출력하고, `cause` 체인을 들여쓰기로 재귀 출력.
  - `box`/`trace` 타입 로그는 별도 포맷(box 는 ` > ` 접두, trace 는 스택 부착).
  - `formatPlain(logObj, formatOptions?): string` — 색·날짜·뱃지 여백 없이 한 엔트리를 평문(멀티라인 가능)으로 포맷. 파일 리포터 등에서 콘솔과 동일한 표현(아이콘·tag·객체 inspect·스택)을 재사용하기 위한 진입점. `formatOptions` 에 `ctx.options.formatOptions` 를 넘기면 객체 펼침(`compact`) 등이 콘솔과 일치.

## createFileReporter

- `createFileReporter(options?: FileReporterOptions): ConsolaReporter` — `<cwd>/.logs/app.<YYYY-MM-DD>.log` 에 평문 라인으로 기록하는 리포터 생성. 일자 변경·크기 초과 시 회전(`app.<date>.<seq>.log`).
  - `options.maxSize?: number` — 파일 회전 임계 바이트. 기본 20MB(`20 * 1024 * 1024`).
  - `options.maxDays?: number` — 로그 보존 일수. 초과 일자 파일은 일자가 바뀔 때 정리됨. 기본 14.
- `FileReporterOptions` — `{ maxSize?: number; maxDays?: number }`.

라인 포맷: `<로컬시각> [<LEVEL>] <PrettyReporter 평문>` — 예 `2026-06-02 14:23:01.123 [ERROR] [api] ✖ 메시지 { id: 1 }`. 타임스탬프는 로컬 `YYYY-MM-DD HH:mm:ss.SSS`, `[<LEVEL>]` 은 `logObj.type` 대문자(`INFO`/`ERROR`/`WARN`/`DEBUG` 등 — grep 필터용). 본문은 `PrettyReporter.formatPlain` 으로 색만 제거하고 콘솔과 동일하게 생성되어 객체·배열은 `util` inspect 로 펼쳐지고 Error 는 메시지+스택으로 기록됨.

## withMaxLevel

- `withMaxLevel(reporter: ConsolaReporter, maxLevel: number): ConsolaReporter` — 리포터 래핑. `logObj.level > maxLevel` 인 로그는 위임하지 않고 버림. 특정 리포터에 최대 상세도 상한을 둘 때 사용(예: 콘솔엔 info 까지만).

```ts
const reporter = withMaxLevel(new PrettyReporter(), LogLevels.info);
```

## 주의사항

- prod 에서는 콘솔 출력이 없고 `.logs` 파일로만 남음 — 운영 로그 확인은 파일 기준.
- 파일 리포터는 `process.cwd()` 기준 `.logs` 에 기록하므로 작업 디렉토리에 의존.
