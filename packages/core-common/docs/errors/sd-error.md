# SdError

트리 구조 조합을 지원하는 에러 클래스. 원인 에러를 감싸서 계층적 메시지를 구성한다. ES2024 `cause` 속성을 활용하며 V8 엔진(Node.js, Chrome)에서는 `captureStackTrace`를 통해 스택 추적을 최적화한다.

```typescript
export class SdError extends Error {
  override cause?: Error;

  /** 원인 에러를 감싸서 생성. 메시지는 역순으로 결합됨 (상위 메시지 => 하위 메시지 => 원인 메시지) */
  constructor(cause: Error, ...messages: string[]);
  /** 메시지만으로 생성. 메시지는 역순으로 결합됨 (상위 메시지 => 하위 메시지) */
  constructor(...messages: string[]);
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `cause` | property | `Error \| undefined` | 원인 에러 (override) |

## Usage

```typescript
import { SdError } from "@simplysm/core-common";

// 원인 에러를 감싸기
try {
  await fetch(url);
} catch (err) {
  throw new SdError(err, "API 호출 실패", "사용자 로드 실패");
  // message: "사용자 로드 실패 => API 호출 실패 => 원본 에러 메시지"
}

// 메시지만으로 생성
throw new SdError("잘못된 상태", "처리 불가");
// message: "처리 불가 => 잘못된 상태"
```
