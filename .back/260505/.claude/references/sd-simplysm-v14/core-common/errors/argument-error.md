# `ArgumentError`

> **읽어야 하는 상황**: 유효하지 않은 인자를 전달받았을 때 인자 객체를 YAML 형식으로 메시지에 포함하여 디버깅을 용이하게 할 때.

인자 유효성 오류. 유효하지 않은 인자를 전달받았을 때 발생하는 에러. 디버깅을 용이하게 하기 위해 인자 객체를 YAML 형식으로 메시지에 포함한다. [`SdError`](./sd-error.md)를 상속한다.

```typescript
export class ArgumentError extends SdError {
  /** 기본 메시지("잘못된 인자입니다.")와 함께 인자 객체를 YAML 형식으로 출력 */
  constructor(argObj: Record<string, unknown>);
  /** 커스텀 메시지와 함께 인자 객체를 YAML 형식으로 출력 */
  constructor(message: string, argObj: Record<string, unknown>);
}
```

## Usage

```typescript
import { ArgumentError } from "@simplysm/core-common";

// 인자 객체만 전달
throw new ArgumentError({ userId: 123, name: null });
// message: "잘못된 인자입니다.\n\nuserId: 123\nname: null"

// 커스텀 메시지와 인자 객체를 전달
throw new ArgumentError("잘못된 사용자", { userId: 123 });
// message: "잘못된 사용자\n\nuserId: 123"
```
