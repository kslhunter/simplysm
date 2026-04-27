# `NotImplementedError`

> **읽어야 하는 상황**: 아직 구현되지 않은 기능이 호출되었음을 표시할 때. 추상 메서드 스텁, 향후 구현 예정인 분기에 사용.

미구현 오류. 아직 구현되지 않은 기능이 호출되었을 때 발생하는 에러. 추상 메서드 스텁, 향후 구현 예정인 분기 등에 사용된다. [`SdError`](.$sd-error.md)를 상속한다.

```typescript
export class NotImplementedError extends SdError {
  /**
   * @param message 추가 설명 메시지
   */
  constructor(message?: string);
}
```

메시지 형식: `"미구현"` 또는 `"미구현: {message}"`

## Usage

```typescript
import { NotImplementedError } from "@simplysm/core-common";

// 추상 메서드 구현 전
class BaseService {
  process(): void {
    throw new NotImplementedError("서브클래스에서 구현 필요");
  }
}

// 향후 구현 예정인 분기
switch (type) {
  case "A": return handleA();
  case "B": throw new NotImplementedError(`타입 ${type} 처리`);
}
```
