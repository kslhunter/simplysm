# createFileReporter

파일 기반 consola reporter를 생성한다. `.logs/` 디렉토리에 `app.YYYY-MM-DD.log` 형식으로 JSON 라인을 기록하며, 날짜별 로테이션과 크기 제한을 지원한다.

```typescript
export function createFileReporter(options?: FileReporterOptions): ConsolaReporter
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `options` | `FileReporterOptions` (optional) | 파일 reporter 옵션 |

## Returns

`ConsolaReporter` — consola reporter 인터페이스 구현체

## Related Types

### `FileReporterOptions`

```typescript
export interface FileReporterOptions {
  /** @default 20MB */
  maxSize?: number;
  /** @default 14 */
  maxDays?: number;
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `maxSize` | `number` (optional) | `20 * 1024 * 1024` (20MB) | 파일 1개의 최대 크기(bytes). 초과 시 `app.YYYY-MM-DD.N.log`로 순번 파일 생성 |
| `maxDays` | `number` (optional) | `14` | 보관할 최대 일수. 날짜가 바뀔 때 이전 파일을 정리 |

## 로그 파일 형식

각 라인은 JSON 객체:

```json
{"time":"2024-01-15T10:30:00.000Z","level":"INFO","msg":"서버 시작"}
{"time":"2024-01-15T10:30:01.000Z","level":"ERROR","tag":"db","err":{"message":"연결 실패","stack":"Error: ..."}}
```

| 필드 | 설명 |
|------|------|
| `time` | ISO 8601 타임스탬프 |
| `level` | 로그 타입 대문자 (INFO, ERROR, DEBUG 등) |
| `tag` | consola 태그 (있을 때만 포함) |
| `msg` | 문자열 인자를 공백으로 합친 메시지 (있을 때만 포함) |
| `err` | Error 객체 (있을 때만 포함): `{ message, stack }` |

## 파일 명명 규칙

- 기본: `.logs/app.YYYY-MM-DD.log`
- 크기 초과 시: `.logs/app.YYYY-MM-DD.1.log`, `.logs/app.YYYY-MM-DD.2.log`, ...
- `process.cwd()` 기준 `.logs/` 디렉토리에 저장

## Usage

```typescript
import { createFileReporter } from "@simplysm/core-node";
import consola from "consola";

// 기본 옵션
consola.options.reporters = [createFileReporter()];

// 크기/기간 커스텀
const reporter = createFileReporter({ maxSize: 10 * 1024 * 1024, maxDays: 7 });
consola.options.reporters = [reporter];
```
