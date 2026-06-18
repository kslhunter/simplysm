# @simplysm/core-common — errors

원인 체인을 ES2024 `cause` 로 묶는 에러 클래스군과, catch 블록의 `unknown` 에러에서 메시지를 안전 추출하는 `err` 네임스페이스. `import { SdError, ArgumentError, NotImplementedError, TimeoutError, err } from "@simplysm/core-common"`.

## SdError

```ts
class SdError extends Error {
  override cause?: Error;
  constructor(cause: Error, ...messages: string[]);
  constructor(...messages: string[]);
}
```

트리 구조 조합형 에러. 모든 하위 에러 클래스의 베이스.

- 첫 인자가 `Error` 면 그것을 `cause` 로 보관하고, 나머지 가변 인자(`...messages`)와 함께 메시지를 **역순으로** `" => "` 결합. 결과: `상위 메시지 => 하위 메시지 => 원본 에러 메시지`.
- 첫 인자가 문자열이면 cause 없이 메시지만 역순 결합.
- 첫 인자가 `Error`/문자열이 아니어도 null 이 아니면 `String()` 변환해 메시지로 사용.
- V8 엔진(Node/Chrome)에서는 `Error.captureStackTrace` 로 생성자 프레임 제거. cause 의 stack 이 있으면 현재 stack 끝에 `---- cause stack ----` 구분선과 함께 이어붙임.
- `name` 은 `"SdError"`.

```ts
try {
  await fetch(url);
} catch (e) {
  throw new SdError(e as Error, "API 호출 실패", "사용자 로드 실패");
  // message: "사용자 로드 실패 => API 호출 실패 => <원본 메시지>"
}
```

## ArgumentError

```ts
class ArgumentError extends SdError {
  constructor(argObj: Record<string, unknown>);
  constructor(message: string, argObj: Record<string, unknown>);
}
```

유효하지 않은 인자 전달 시 throw. 인자 객체를 `yaml` 라이브러리로 직렬화해 메시지에 첨부(트리 구조를 사람이 읽기 쉽게).

- 첫 인자가 객체면 기본 메시지 `"잘못된 인자입니다."` + 빈 줄 + `YAML.stringify(argObj)`.
- 첫 인자가 문자열이면 그 메시지 + 빈 줄 + 둘째 인자 객체의 YAML. argObj 가 null 이면 YAML 없이 메시지만.
- `name` 은 `"ArgumentError"`. 패키지 내부의 인자 검증 실패(Uuid 형식·hex 길이·중복 key·`orderBy` 불가 타입 등)가 이 에러로 throw 됨.

```ts
throw new ArgumentError("잘못된 사용자", { userId: 123, name: null });
// "잘못된 사용자\n\nuserId: 123\nname: null\n"
```

## NotImplementedError

```ts
class NotImplementedError extends SdError {
  constructor(message?: string);
}
```

아직 구현되지 않은 분기·추상 스텁에서 throw. 메시지는 `"미구현"` 에 인자가 있으면 `": " + message` 를 덧붙임. `name` 은 `"NotImplementedError"`.

```ts
throw new NotImplementedError(`타입 ${type} 처리`); // "미구현: 타입 B 처리"
```

## TimeoutError

```ts
class TimeoutError extends SdError {
  constructor(count?: number, message?: string);
}
```

대기 시간 초과 시 throw. 메시지는 `"대기 시간 초과"` 에 `count` 가 있으면 `(N회 시도)`, `message` 가 있으면 `: message` 를 덧붙임. `name` 은 `"TimeoutError"`. `wait.until` 이 최대 시도 횟수를 초과하면 `new TimeoutError(count)` 로 자동 throw 한다([async-runtime.md](./async-runtime.md) 참조).

```ts
try {
  await wait.until(() => isReady, 100, 50);
} catch (e) {
  if (e instanceof TimeoutError) { /* ... */ }
}
```

## err (에러 메시지 추출)

`import { err } from "@simplysm/core-common"` 네임스페이스.

- `message(error: unknown): string` — `Error` 인스턴스면 `.message`, 아니면 `String(error)`. catch 블록의 `unknown` 에러에서 메시지를 안전하게 뽑을 때.

```ts
import { err } from "@simplysm/core-common";
try { /* ... */ } catch (e) {
  logger.error(err.message(e));
}
```
