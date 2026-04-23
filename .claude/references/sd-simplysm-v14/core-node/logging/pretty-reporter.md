# PrettyReporter

터미널 출력용 consola reporter. 로그 타입별 아이콘과 색상을 지원하며, 에러 스택 트레이스를 포맷팅한다.

## When to use

- ✅ 터미널에 아이콘/색상이 포함된 가독성 좋은 로그를 출력할 때
- ✅ `setupConsola()`의 기본 동작 대신 reporter를 직접 조합할 때
- ❌ 로그를 파일로 저장 → [`createFileReporter`](./create-file-reporter.md) 사용

```typescript
export class PrettyReporter implements ConsolaReporter {
  log(logObj: LogObject, ctx: { options: ConsolaOptions }): void
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `log` | method | `(logObj: LogObject, ctx: { options: ConsolaOptions }) => void` | 로그 항목을 터미널에 출력 |

## 동작 방식

- `logObj.level < 2` (error/fatal)이면 `stderr`, 그 외이면 `stdout`에 출력
- 컬러 지원 자동 감지: `NO_COLOR` 환경 변수 → `FORCE_COLOR` 환경 변수 → `process.stdout.isTTY` → Windows 여부 순으로 판단
- 로그 타입별 아이콘: `error`/`fatal`/`fail` = `✖`, `ready`/`success` = `✔`, `warn` = `⚠`, `info` = `ℹ`, `debug` = `⚙`, `trace` = `→`
- `Error` 객체는 메시지 + 스택 트레이스로 포맷팅되며, `cause` 체인도 재귀적으로 표시됨
- `badge` 옵션이나 error/fatal 레벨이면 로그 앞뒤에 빈 줄을 추가 (시각적 강조)

## Usage

```typescript
import { PrettyReporter } from "@simplysm/core-node";
import consola from "consola";

consola.options.reporters = [new PrettyReporter()];
```
