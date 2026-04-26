# `err`

> **읽어야 하는 상황**: catch 블록의 `unknown` 타입 에러에서 메시지 문자열을 추출할 때.

에러 메시지 추출 유틸리티 네임스페이스.

```typescript
import { err } from "@simplysm/core-common";
```

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `message` | `(err: unknown) => string` | `catch` 블록의 `unknown` 에러에서 메시지 추출. `Error` 인스턴스이면 `message` 속성 반환, 그렇지 않으면 `String()` 변환 결과 반환 |

## Usage

```typescript
import { err } from "@simplysm/core-common";

try {
  await doSomething();
} catch (e) {
  const msg = err.message(e); // string
  console.log(msg);
}
```
