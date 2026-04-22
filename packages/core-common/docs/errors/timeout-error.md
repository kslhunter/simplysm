# TimeoutError

타임아웃 오류. 대기 시간이 초과되었을 때 발생하는 에러. [`wait.until()`](../utils/wait.md) 같은 비동기 대기 함수에서 최대 시도 횟수를 초과하면 자동으로 발생한다. [`SdError`](./sd-error.md)를 상속한다.

```typescript
export class TimeoutError extends SdError {
  /**
   * @param count 시도 횟수
   * @param message 추가 메시지
   */
  constructor(count?: number, message?: string);
}
```

메시지 형식: `"대기 시간 초과"`, `"대기 시간 초과(N회 시도)"`, `"대기 시간 초과: {message}"`, `"대기 시간 초과(N회 시도): {message}"`

## Usage

```typescript
import { TimeoutError } from "@simplysm/core-common";
import { wait } from "@simplysm/core-common";

// wait.until에서 자동 발생
try {
  await wait.until(() => isReady, 100, 50); // 100ms 간격, 최대 50회 시도
} catch (err) {
  if (err instanceof TimeoutError) {
    console.log("타임아웃 초과");
  }
}

// 직접 발생
if (elapsed > maxTime) {
  throw new TimeoutError(undefined, "API 응답 대기 초과");
}
```
