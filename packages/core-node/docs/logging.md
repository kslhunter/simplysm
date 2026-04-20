# Logging (consola)

## `setupConsola`

환경에 따라 consola의 reporter를 자동으로 구성한다.

```typescript
export function setupConsola(opts?: SetupConsolaOptions): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `opts` | SetupConsolaOptions (optional) | 옵션 객체 |

### SetupConsolaOptions

```typescript
export interface SetupConsolaOptions {
  cli?: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `cli` | boolean (optional) | CLI 모드 여부. true이면 프로덕션에서도 PrettyReporter 사용 (기본값: false) |

### Behavior by Environment

| Condition | Reporters | Debug Level |
|-----------|-----------|------------|
| Production (not DEV, not cli) | FileReporter | debug 레벨 포함 |
| Development or cli + SD_DEBUG | PrettyReporter | debug 레벨 포함 |
| Development or cli (일반) | FileReporter + PrettyReporter (info 이하) | debug는 파일에만 기록 |

**Note**: 
- `DEV` 환경변수 또는 `SD_DEBUG` 환경변수의 값을 `parseBoolEnv()`로 파싱한다.
- `env("...")`는 @simplysm/core-common의 함수를 사용한다.

**Example**:
```typescript
// 환경별 자동 구성
setupConsola();

// CLI 모드
setupConsola({ cli: true });
```

---

## `withMaxLevel`

Consola reporter를 지정된 로그 레벨 이하로 제한하는 래퍼.

```typescript
export function withMaxLevel(reporter: ConsolaReporter, maxLevel: number): ConsolaReporter
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `reporter` | ConsolaReporter | 원본 reporter |
| `maxLevel` | number | 최대 로그 레벨 (LogLevels 상수 참고) |

**Return**: 제한된 reporter

**Consola LogLevels**:
```
0: fatal
1: error
2: warn
3: info
4: success
5: log
6: debug
7: trace
```

**Example**:
```typescript
import { withMaxLevel, PrettyReporter, LogLevels } from "@simplysm/core-node";

// info 레벨 이하만 출력
const limitedReporter = withMaxLevel(new PrettyReporter(), LogLevels.info);
```

---

## `PrettyReporter`

터미널 출력용 consola reporter.

아이콘, 색상, 에러 스택 포맷팅을 지원한다.

```typescript
export class PrettyReporter implements ConsolaReporter {
  log(logObj: LogObject, ctx: { options: ConsolaOptions }): void
}
```

**Features**:
- 로그 레벨별 아이콘 표시
- 컬러 출력
- 에러 객체의 스택 포맷팅
- 타임스탐프 표시 (선택적)

**Example**:
```typescript
import { PrettyReporter } from "@simplysm/core-node";
import consola from "consola";

consola.options.reporters = [new PrettyReporter()];
```

---

## `createFileReporter`

파일 기반 consola reporter를 생성한다.

JSON 라인 형식으로 로그를 기록하며, 날짜별 로테이션과 크기 제한을 지원한다.

```typescript
export function createFileReporter(options?: FileReporterOptions): ConsolaReporter
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | FileReporterOptions (optional) | 옵션 객체 |

### FileReporterOptions

```typescript
export interface FileReporterOptions {
  maxSize?: number;    // 로그 파일 최대 크기 (바이트, 기본값: 20MB)
  maxDays?: number;    // 로그 보관 기간 (일, 기본값: 14일)
}
```

| Field | Type | Description |
|-------|------|-------------|
| `maxSize` | number (optional) | 단일 로그 파일의 최대 크기 (바이트). 초과 시 롤오버됨 (기본값: 20MB = 20 * 1024 * 1024) |
| `maxDays` | number (optional) | 로그 파일 보관 기간 (일). 이 기간이 지난 로그는 자동 삭제됨 (기본값: 14) |

### Log File Format

- 디렉토리: `.logs/`
- 파일명 형식: `app.YYYY-MM-DD.log`
- 내용: JSON 라인 (각 로그는 하나의 JSON 객체)

**Example**:
```typescript
import { createFileReporter } from "@simplysm/core-node";
import consola from "consola";

const fileReporter = createFileReporter({
  maxSize: 10 * 1024 * 1024,  // 10MB
  maxDays: 7,                  // 7일 보관
});

consola.options.reporters = [fileReporter];
```

---

## Integration with setupConsola

setupConsola()는 내부적으로 PrettyReporter와 createFileReporter()를 사용하여 환경에 맞게 reporters를 구성한다.

```typescript
import { setupConsola } from "@simplysm/core-node";
import consola from "consola";

// 자동 구성
setupConsola();

// 이후 consola를 정상적으로 사용 가능
consola.info("Application started");
consola.debug("Debug information");
```

**주의**: consola는 프로젝트 루트의 `console.*` 금지 규칙을 대체하는 표준 로깅 수단이다.
