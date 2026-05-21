## @simplysm/core-node — consola 설정

전역 `consola` 인스턴스에 reporter 를 일괄 부착하는 헬퍼와 reporter 구현체.

### setupConsola

```ts
setupConsola(opts?: { cli?: boolean }): void
```

전역 `consola.level = LogLevels.debug` 로 설정 후 환경에 따라 reporter 구성:

- `opts.cli !== true` && `env("DEV")` falsy → **프로덕션**: `createFileReporter()` 만 (JSONL 파일, 콘솔 X).
- 그 외 → **개발**:
  - `env("SD_DEBUG")` truthy → `PrettyReporter()` 만 (debug 포함 콘솔).
  - 그 외 → `createFileReporter()`(debug 포함 파일) + `PrettyReporter()`(info 이상만 콘솔, `withMaxLevel` 적용).

`opts.cli`: CLI 프로세스(`sd-cli` 등) 여부. true 면 파일 출력 없이 콘솔만 사용하도록 분기.

### withMaxLevel

```ts
withMaxLevel(reporter: ConsolaReporter, maxLevel: number): ConsolaReporter
```

기존 reporter 를 감싸 `logObj.level > maxLevel` 인 항목을 버린다. consola `LogLevels` 는 낮을수록 심각(0=fatal/error, 1=warn, 2=log, 3=info, 4=debug, 5=trace).

### PrettyReporter

`class PrettyReporter implements ConsolaReporter` — ANSI 컬러 콘솔 출력.

- 색상 활성화: `env("NO_COLOR")` 있으면 비활성, `env("FORCE_COLOR")` 있으면 강제, TTY 또는 win32 면 활성.
- level<2 (fatal/error/warn) → `stderr`, 그 외 → `stdout`.
- `type === "box"` → 박스 포맷, `type === "trace"` → 스택 첨부, level<2 또는 `badge: true` → 위아래 빈 줄.
- `Error` args → message + cwd prefix 제거된 스택 + `cause` 재귀 indent.
- `ctx.options.formatOptions.date: true` → 시각 `HH:mm:ss.SSS` 부착.

### createFileReporter

```ts
createFileReporter(options?: { maxSize?: number; maxDays?: number }): ConsolaReporter
```

- `maxSize` (기본 20MB): 파일 1개 최대 크기. 초과 시 `app.<YYYY-MM-DD>.<seq>.log` 시퀀스로 회전.
- `maxDays` (기본 14): cutoff 일자 이전 로그 파일 자동 삭제. 매일 첫 로그 시 1회 실행.
- 출력 위치: `${process.cwd()}/.logs/app.<YYYY-MM-DD>.log` (필요시 `.<seq>` 부착).
- 라인 형식: `{ time, level, tag?, err?: {message,stack}, msg? }` JSONL. `Error` arg 는 `err` 필드로 분리, 나머지는 `msg` 로 공백 연결.
- 날짜 바뀌면 자동 로테이트. `.logs` 디렉토리는 첫 쓰기 시 생성.

### 예

```ts
import { setupConsola, PrettyReporter, createFileReporter } from "@simplysm/core-node";
import consola from "consola";
setupConsola({ cli: true });

// 커스텀
consola.options.reporters = [new PrettyReporter(), createFileReporter({ maxDays: 30 })];
```
