## @simplysm/core-node — consola

`consola` 전역 인스턴스 셋업 + 컬러 콘솔 리포터 + JSON 파일 회전 리포터. Node 앱(서버·CLI) 진입점에서 `setupConsola()` 1회 호출하면 환경에 맞게 reporter 가 구성됨.

### setupConsola

```ts
interface SetupConsolaOptions { cli?: boolean; }
setupConsola(opts?: SetupConsolaOptions): void;
```

- `cli: true` 또는 `env.DEV` 가 truthy → dev 모드.
  - `SD_DEBUG` truthy: `PrettyReporter` 하나만, debug 까지.
  - 아니면: `createFileReporter()` + `withMaxLevel(new PrettyReporter(), LogLevels.info)` — 파일에는 debug 까지, 콘솔에는 info 이상만.
- 그 외 (prod): `createFileReporter()` 하나만, debug 까지.

모든 경로에서 `consola.level = LogLevels.debug`.

### PrettyReporter

```ts
class PrettyReporter implements ConsolaReporter {}
```

- 색상 자동 감지: `NO_COLOR` 있으면 off, `FORCE_COLOR` 있으면 on, TTY 면 on, win32 면 on.
- 타입별 아이콘/색 (info=cyan, success/ready=green, warn=yellow, error/fatal/fail=red, start=magenta, debug=gear, trace=arrow).
- `logObj.type === "box"` 면 `> tag`, `> title`, `> 각 줄` 형태로 박스 렌더.
- `logObj.tag !== ""` 면 `[tag]` 가 회색으로 prefix.
- level < 2 (error/fatal/warn) 는 `stderr`, 그 외 `stdout` 으로 출력. 추가로 badge 처리(앞뒤 빈 줄).
- args 중 `Error.stack` 가진 객체는 재귀적으로 cause 체인까지 풀어서 stack 정리 (cwd 제거, `file://` 제거, 들여쓰기).
- `type === "trace"` 면 즉시 stack 첨부.

### createFileReporter

```ts
interface FileReporterOptions {
  maxSize?: number;   // default 20MB
  maxDays?: number;   // default 14
}
createFileReporter(options?: FileReporterOptions): ConsolaReporter;
```

- 출력 디렉토리: `<cwd>/.logs` (자동 mkdir).
- 파일명: `app.<YYYY-MM-DD>.log` → 크기 초과 시 `app.<YYYY-MM-DD>.<n>.log` 로 순번.
- 로그 1줄 = JSON: `{ time(ISO), level, tag?, err?: {message,stack}, msg? }`. `Error` arg 는 `err` 필드로, 그 외는 모두 `String` 화 후 공백 조인되어 `msg`.
- 날짜 바뀌면 회전 + 그날 첫 write 에서 `maxDays` 이전 `app.YYYY-MM-DD.*.log` 정리.

### withMaxLevel

```ts
withMaxLevel(reporter: ConsolaReporter, maxLevel: number): ConsolaReporter;
```

`logObj.level > maxLevel` 인 항목을 drop. `setupConsola` 가 dev 콘솔 리포터에 `LogLevels.info` 로 적용.

### 사용 예

```ts
import { setupConsola } from "@simplysm/core-node";

setupConsola({ cli: true });   // 진입점 1회
consola.info("server started");
consola.withTag("db").debug({ sql, params });
```
