# @simplysm/core-common — errors

원인 체인을 보존하는 에러 클래스와 `unknown` catch 값 처리 유틸 묶음. `throw` 할 도메인 오류를 만들거나 직렬화된 에러를 Error 인스턴스로 되살릴 때 함께 봄. 모든 에러 클래스는 `SdError` 를 상속함.

## SdError

```ts
class SdError extends Error {
  override cause?: Error;
  constructor(cause: Error, ...messages: string[]);
  constructor(...messages: string[]);
}
```

- `cause: Error` — 첫 인자가 Error 이면 ES `cause` 로 저장함. cause 의 stack 이 있으면 현재 stack 뒤에 `\n---- cause stack ----\n` 와 함께 이어 붙임.
- `messages: string[]` — cause 메시지(또는 첫 문자열 인자)와 함께 `null` 을 걸러낸 뒤 **역순으로** `" => "` 결합해 최종 message 를 만듦(상위 → 하위 → 원인 순으로 보임).
- `arg1?: unknown` — Error·string 외 null 이 아닌 값도 `String(arg1)` 로 메시지화함.
- `name` — 생성 후 `"SdError"` 로 설정됨.
- V8(Node·Chrome)에서는 `Error.captureStackTrace` 로 생성자 프레임을 stack 에서 제거함.

## ArgumentError

```ts
class ArgumentError extends SdError {
  constructor(argObj: Record<string, unknown>);
  constructor(message: string, argObj: Record<string, unknown>);
}
```

유효하지 않은 인자를 받았을 때 throw 함. 디버깅용으로 인자 객체를 YAML 로 메시지에 첨부함.

- `argObj: Record<string, unknown>` — 인자 상태를 `YAML.stringify` 로 변환해 메시지 뒤(`\n\n`)에 붙임.
- `message: string` — 지정 시 커스텀 메시지를 사용하고, 객체만 전달하면 기본 메시지 `"잘못된 인자입니다."` 를 사용함.
- 인자 객체가 `null` 이면 YAML 없이 메시지만 사용함.
- `name` — `"ArgumentError"` 로 설정됨.

## NotImplementedError

```ts
class NotImplementedError extends SdError {
  constructor(message?: string);
}
```

아직 구현되지 않은 분기·추상 스텁에서 throw 함.

- `message?: string` — 있으면 `"미구현: " + message`, 없으면 `"미구현"` 메시지를 만듦.
- `name` — `"NotImplementedError"` 로 설정됨.

## TimeoutError

```ts
class TimeoutError extends SdError {
  constructor(count?: number, message?: string);
}
```

대기 시간 초과 시 throw 함. `wait.until` 이 최대 시도 횟수를 넘기면 자동 발생함.

- `count?: number` — 있으면 메시지에 `(<count>회 시도)` 를 붙임.
- `message?: string` — 있으면 메시지 뒤에 `: <message>` 를 붙임.
- `name` — `"TimeoutError"` 로 설정됨.

## err

`import { err } from "@simplysm/core-common"` 네임스페이스. `unknown` catch 값에서 안전하게 정보를 뽑을 때 씀.

- `message(err: unknown): string` — Error 인스턴스면 `err.message`, 아니면 `String(err)`. 사용자 메시지만 필요할 때.
- `stack(err: unknown): string` — Error 인스턴스면 `err.stack ?? err.message`, 아니면 `String(err)`. 로그용 스택 문자열이 필요할 때.
- `fromObject(obj: Record<string, unknown>): Error` — `obj["message"]` 로 Error 를 만들고 나머지 속성을 `Object.assign` 으로 복사함. JSON 역직렬화·RPC 등으로 plain object 가 된 에러를 Error 인스턴스로 복원할 때(`json.parse` 의 Error 복원에 사용됨).
