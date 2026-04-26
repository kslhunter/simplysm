# `setupConsola`

> **읽어야 하는 상황**: 서버/CLI 애플리케이션 시작 시 환경별(개발/프로덕션) 로깅을 한 번에 구성할 때. reporter를 세밀하게 커스텀 조합하려면 [`createFileReporter`](./create-file-reporter.md)/[`PrettyReporter`](./pretty-reporter.md)를 직접 사용.

환경에 따라 consola reporter를 자동 구성한다. 이 패키지의 `console.*` 사용 금지 규칙을 대체하는 표준 로깅 진입점이다.

## When to use

- ✅ 서버/CLI 애플리케이션 시작 시 환경별(개발/프로덕션) 로깅을 한 번에 구성할 때
- ❌ reporter를 세밀하게 커스텀 조합할 때 → `createFileReporter`/`PrettyReporter`를 직접 사용

```typescript
export function setupConsola(opts?: SetupConsolaOptions): void
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `opts` | `SetupConsolaOptions` (optional) | 구성 옵션 |

## Related Types

### `SetupConsolaOptions`

```typescript
export interface SetupConsolaOptions {
  cli?: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `cli` | `boolean` (optional) | CLI 모드 여부. `true`이면 프로덕션에서도 개발 경로(FileReporter + PrettyReporter)를 사용 |

## 환경별 동작

| 조건 | Reporter | 레벨 |
|------|----------|------|
| 프로덕션 (`DEV` 아님, `cli` 아님) | `FileReporter`만 | debug까지 파일 기록 |
| 개발 또는 `cli: true` + `SD_DEBUG=true` | `PrettyReporter`만 | debug까지 터미널 출력 |
| 개발 또는 `cli: true` (일반) | `FileReporter` + `PrettyReporter` (info 이하만) | debug는 파일에만 기록, info 이하는 터미널 출력 |

`DEV` 환경 변수 감지에는 `@simplysm/core-common`의 `parseBoolEnv(env("DEV"))`를 사용한다.

## `withMaxLevel`

reporter에 로그 레벨 상한선을 설정한 래퍼를 반환한다. `setupConsola()` 내부에서 PrettyReporter를 info 레벨로 제한할 때 사용된다.

```typescript
export function withMaxLevel(reporter: ConsolaReporter, maxLevel: number): ConsolaReporter
```

| Param | Type | Description |
|-------|------|-------------|
| `reporter` | `ConsolaReporter` | 감쌀 reporter |
| `maxLevel` | `number` | 이 레벨보다 높은 로그는 무시 (consola의 `LogLevels` 상수 사용 권장) |

## Usage

```typescript
import { setupConsola, withMaxLevel, PrettyReporter } from "@simplysm/core-node";
import { LogLevels } from "consola";

// 환경별 자동 구성 (일반 서버)
setupConsola();

// CLI 모드 (프로덕션에서도 터미널 출력)
setupConsola({ cli: true });

// 개별 reporter 직접 조합
import consola from "consola";
import { createFileReporter } from "@simplysm/core-node";

consola.options.reporters = [
  createFileReporter(),
  withMaxLevel(new PrettyReporter(), LogLevels.info),
];
```
