# @simplysm/core-common — 에러 클래스

`throw` 를 던지거나, 에러 원인을 체인으로 감싸거나, catch 에서 `instanceof` 로 분기할 때 함께 읽히는 묶음. 모두 `SdError` 를 상속하므로 `instanceof SdError` 로 한꺼번에 잡을 수 있음.

## SdError

```ts
class SdError extends Error {
  override cause?: Error;
  constructor(cause: Error, ...messages: string[]); // 원인 에러를 감싸기
  constructor(...messages: string[]);                // 메시지만으로 생성
}
```

ES2024 `cause` 를 활용한 트리형 에러. 메시지는 **역순으로** `" => "` 로 결합됨(상위 메시지가 앞).

- cause: Error — 첫 인자가 Error 면 원인 에러로 보존(`this.cause`). 원인 에러의 stack 이 현재 stack 뒤에 `---- cause stack ----` 로 이어 붙음. 하위 호출에서 받은 에러를 상위 문맥으로 감쌀 때.
- ...messages: string[] — 문맥 메시지들. `new SdError(err, "API 호출 실패", "사용자 로드 실패")` → `"사용자 로드 실패 => API 호출 실패 => 원본 메시지"`. null/undefined 메시지는 제외됨.
- `name` 은 `"SdError"`. V8(Node·Chrome)에서 `captureStackTrace` 로 생성자 프레임 제거.

```ts
import { SdError } from "@simplysm/core-common";
try {
  await fetch(url);
} catch (err) {
  throw new SdError(err, "API 호출 실패", "사용자 로드 실패");
}
```

주의: 첫 인자가 Error 가 아니면(문자열·기타) cause 없이 메시지로만 취급됨. `new SdError("잘못된 상태", "처리 불가")` → `"처리 불가 => 잘못된 상태"`.

## ArgumentError

```ts
class ArgumentError extends SdError {
  constructor(argObj: Record<string, unknown>);
  constructor(message: string, argObj: Record<string, unknown>);
}
```

유효하지 않은 인자를 받았을 때 던지는 에러. 디버깅을 위해 인자 객체를 **YAML 형식**으로 메시지에 붙임. `name` 은 `"ArgumentError"`.

- argObj: Record<string, unknown> — 메시지에 YAML 로 직렬화해 포함할 인자값들. 어떤 입력이 문제였는지 드러낼 때.
- message: string — 커스텀 머리말. 생략 시 `"잘못된 인자입니다."` 사용.

```ts
import { ArgumentError } from "@simplysm/core-common";
throw new ArgumentError("유효하지 않은 UUID 형식입니다.", { uuid });
// 메시지: "유효하지 않은 UUID 형식입니다.\n\nuuid: ..."
```

이 패키지 내부 검증(Uuid·bytes·obj 체인 등)에서 이미 광범위하게 throw 하므로, 유효성 위반은 직접 처리하지 말고 그대로 전파하는 편이 일관적.

## NotImplementedError

```ts
class NotImplementedError extends SdError {
  constructor(message?: string);
}
```

아직 구현되지 않은 기능이 호출됐을 때. 메시지는 `"미구현"` 또는 `"미구현: <message>"`. `name` 은 `"NotImplementedError"`. 추상 메서드 스텁, 미구현 분기에 사용.

- message?: string — 무엇이 미구현인지 추가 설명. 예: `throw new NotImplementedError(\`타입 ${type} 처리\`)`.

## TimeoutError

```ts
class TimeoutError extends SdError {
  constructor(count?: number, message?: string);
}
```

대기 시간 초과 에러. 메시지는 `"대기 시간 초과"` + (count 있으면 `(N회 시도)`) + (message 있으면 `: <message>`). `name` 은 `"TimeoutError"`.

- count?: number — 시도 횟수. `wait.until(...)` 이 최대 시도 초과 시 자동으로 이 에러를 throw(시도 횟수를 넣어).
- message?: string — 무엇을 기다리다 초과했는지 추가 설명.

```ts
import { TimeoutError, wait } from "@simplysm/core-common";
try {
  await wait.until(() => isReady, 100, 50);
} catch (err) {
  if (err instanceof TimeoutError) { /* 타임아웃 처리 */ }
}
```
