# @simplysm/core-common — 에러 클래스

원인(cause) 체인을 메시지에 누적하는 `SdError` 와 그 파생 에러들, 그리고 catch 블록에서 메시지를 안전하게 뽑는 `err.message`. 예외를 throw 하거나 잡아 사용자 메시지를 만들 때 함께 참조.

## SdError

```ts
class SdError extends Error {
  override cause?: Error;
  constructor(cause: Error, ...messages: string[]);
  constructor(...messages: string[]);
}
```

ES `cause` 를 활용해 트리 형태로 에러를 감싸는 기반 클래스.

- 첫 인자가 `Error` 면 그것을 `cause` 로 보존하고, `cause.stack` 을 자기 stack 뒤에 `---- cause stack ----` 로 이어 붙임.
- 메시지들은 **역순으로 `" => "` 결합** — 상위(가장 마지막 인자)부터 하위·원인 순으로 읽힘. null 메시지는 제외.
- V8(Node/Chrome)에서는 `Error.captureStackTrace` 로 생성자 프레임을 stack 에서 제거.
- `name` 은 `"SdError"`.

```ts
try {
  await fetch(url);
} catch (err) {
  throw new SdError(err as Error, "API 호출 실패", "사용자 로드 실패");
  // message: "사용자 로드 실패 => API 호출 실패 => <원본 메시지>"
}
```

주의: 첫 인자가 `Error` 가 아니면 메시지로 취급되므로, 원인 보존이 목적이면 `Error` 인스턴스를 첫 인자로 넘길 것.

## ArgumentError

```ts
class ArgumentError extends SdError {
  constructor(argObj: Record<string, unknown>);
  constructor(message: string, argObj: Record<string, unknown>);
}
```

유효하지 않은 인자에 대한 에러. 디버깅을 위해 인자 객체를 **YAML 로 직렬화해 메시지에 첨부**.

- 첫 인자가 객체면 기본 메시지 `"잘못된 인자입니다."` + YAML.
- 첫 인자가 문자열이면 커스텀 메시지 + 둘째 인자 객체의 YAML.
- `name` 은 `"ArgumentError"`. 패키지 내부 검증 실패(잘못된 UUID, hex 홀수 길이, 중복 key, 빈 chain 등)에서 광범위하게 throw 됨.

```ts
throw new ArgumentError("잘못된 사용자", { userId: 123 });
// message: "잘못된 사용자\n\nuserId: 123\n"
```

## NotImplementedError

```ts
class NotImplementedError extends SdError {
  constructor(message?: string);
}
```

미구현 분기·추상 메서드 스텁에서 throw. 메시지는 `"미구현"` 뒤에 `message` 가 있으면 `": " + message` 를 덧붙임. `name` 은 `"NotImplementedError"`.

## TimeoutError

```ts
class TimeoutError extends SdError {
  constructor(count?: number, message?: string);
}
```

대기 시간 초과 에러. 메시지는 `"대기 시간 초과"` + `count` 있으면 `"(N회 시도)"` + `message` 있으면 `": " + message`. `name` 은 `"TimeoutError"`. `wait.until` 이 최대 시도 횟수 초과 시 자동으로 던지며, `err instanceof TimeoutError` 로 분기 가능.

## err.message

`import { err } from "@simplysm/core-common"` 네임스페이스.

- `message(err: unknown): string` — `unknown` 에러에서 메시지 추출. `Error` 면 `.message`, 아니면 `String(err)`. catch 블록에서 타입 좁히기 없이 메시지를 얻을 때.

```ts
import { err } from "@simplysm/core-common";
try { /* ... */ } catch (e) {
  toast.danger(err.message(e));
}
```
