# @simplysm/core-common — errors

원인 체인을 보존하는 에러 클래스와 catch 값 처리 유틸 묶음. `throw` 할 도메인 오류를 만들거나 `unknown` 에러를 메시지·스택·Error 로 되살릴 때 함께 본다.

## SdError

```ts
class SdError extends Error {
  override cause?: Error;
  constructor(cause: Error, ...messages: string[]);
  constructor(...messages: string[]);
}
```

- `cause: Error` — 첫 인자가 Error 이면 ES `cause` 로 저장한다. cause 의 stack 이 있으면 현재 stack 뒤에 `---- cause stack ----` 와 함께 붙인다.
- `messages: string[]` — cause 메시지 또는 첫 문자열 인자와 함께 역순으로 `" => "` 결합해 최종 message 를 만든다.
- `arg1?: unknown` — 구현은 Error·string 외 null 이 아닌 값도 `String(arg1)` 로 메시지화한다.
- `name` — 생성 후 `"SdError"` 로 설정된다.
- `captureStackTrace` — V8 환경에 있으면 생성자 프레임을 제거한다.

## ArgumentError

```ts
class ArgumentError extends SdError {
  constructor(argObj: Record<string, unknown>);
  constructor(message: string, argObj: Record<string, unknown>);
}
```

- `argObj: Record<string, unknown>` — 인자 상태를 YAML 문자열로 바꿔 메시지 뒤에 붙인다.
- `message: string` — 지정하면 커스텀 메시지를 사용하고, 객체만 전달하면 기본 메시지 `"잘못된 인자입니다."` 를 사용한다.
- `arg2?: Record<string, unknown>` — 문자열 메시지 뒤에 전달되는 인자 객체다. 없으면 YAML 없이 메시지만 사용한다.
- `name` — `"ArgumentError"` 로 설정된다.

## NotImplementedError

```ts
class NotImplementedError extends SdError {
  constructor(message?: string);
}
```

- `message?: string` — 있으면 `"미구현: " + message`, 없으면 `"미구현"` 메시지를 만든다.
- `name` — `"NotImplementedError"` 로 설정된다.

## TimeoutError

```ts
class TimeoutError extends SdError {
  constructor(count?: number, message?: string);
}
```

- `count?: number` — 있으면 메시지에 `(<count>회 시도)` 를 붙인다. `wait.until` 이 최대 시도 횟수에 도달했을 때 전달한다.
- `message?: string` — 있으면 메시지 뒤에 `: <message>` 를 붙인다.
- `name` — `"TimeoutError"` 로 설정된다.

## err

`import { err } from "@simplysm/core-common"` 네임스페이스.

- `message(err: unknown): string` — Error 인스턴스면 `err.message`, 아니면 `String(err)` 를 반환한다. catch 값의 사용자 메시지만 필요할 때.
- `stack(err: unknown): string` — Error 인스턴스면 `err.stack ?? err.message`, 아니면 `String(err)` 를 반환한다. 로그용 스택 문자열이 필요할 때.
- `fromObject(obj: Record<string, unknown>): Error` — `obj["message"]` 로 Error 를 만들고 나머지 속성을 `Object.assign` 으로 복사한다. JSON/RPC 등으로 plain object 가 된 에러를 Error 인스턴스로 복원할 때.
