# @simplysm/core-common — 에러 클래스

원인 체인(`cause`)을 가진 에러를 throw 하거나 타입별로 분기할 때 함께 읽히는 묶음. 모두 `SdError` 를 베이스로 하며 각 클래스는 `name` 을 자기 클래스명으로 설정해 `instanceof`·`name` 양쪽으로 식별 가능.

## SdError

ES2024 `cause` 를 활용해 에러를 트리로 감싸는 베이스 클래스. 메시지는 **역순으로 결합**되어 상위(가장 바깥) 메시지가 앞에 온다.

```typescript
class SdError extends Error {
  override cause?: Error;
  constructor(cause: Error, ...messages: string[]); // 원인 에러 + 상위 메시지들
  constructor(...messages: string[]);               // 메시지들만
}
```

- `cause: Error` — 첫 인자가 `Error` 면 원인으로 저장되고 그 stack 이 현재 stack 뒤에 `---- cause stack ----` 로 이어붙음. 첫 인자가 문자열/기타면 일반 메시지로 취급.
- `...messages` — 추가 설명 메시지들. 결합 시 `messages` 가 먼저 reverse 되어 `상위 => 하위 => 원인` 순으로 `" => "` 결합. null/undefined 메시지는 제외.

```typescript
throw new SdError(err, "API 호출 실패", "사용자 로드 실패");
// message: "사용자 로드 실패 => API 호출 실패 => 원본 에러 메시지"

throw new SdError("잘못된 상태", "처리 불가");
// message: "처리 불가 => 잘못된 상태"
```

주의: 하위 에러를 잡아 컨텍스트를 덧붙여 다시 throw 할 때 사용. 원본 에러를 삼키지 말고 첫 인자로 넘겨 체인을 보존.

## ArgumentError

유효하지 않은 인자를 받았을 때 throw. 인자 객체를 YAML 로 직렬화해 메시지에 포함(디버깅용). `SdError` 상속.

```typescript
class ArgumentError extends SdError {
  constructor(argObj: Record<string, unknown>);             // 기본 메시지 + 인자
  constructor(message: string, argObj: Record<string, unknown>); // 커스텀 메시지 + 인자
}
```

- `argObj` — 문제가 된 인자들을 담은 객체. `YAML.stringify` 결과가 메시지 본문 뒤에 두 줄 띄고 붙음. 어떤 값이 잘못됐는지 그대로 노출하려는 의도.
- `message` — 생략 시 `"잘못된 인자입니다."` 가 기본값.

```typescript
throw new ArgumentError("잘못된 사용자", { userId: 123, name: null });
// "잘못된 사용자\n\nuserId: 123\nname: null"
```

이 패키지 내부(`Uuid`, `bytes`, `num` 파싱, `obj` 체인 함수 등)에서 입력 검증 실패 시 광범위하게 사용된다.

## NotImplementedError

아직 구현되지 않은 코드 경로가 호출됐을 때 throw. `SdError` 상속.

```typescript
class NotImplementedError extends SdError {
  constructor(message?: string); // "미구현" 또는 "미구현: <message>"
}
```

- `message` — 어떤 기능이 미구현인지 보조 설명. 생략 시 메시지는 `"미구현"`.

```typescript
switch (type) {
  case "A": return handleA();
  case "B": throw new NotImplementedError(`타입 ${type} 처리`); // "미구현: 타입 B 처리"
}
```

추상 메서드 스텁이나 미완성 분기에 의도적 throw 로 두어 silent skip 을 막는 용도.

## TimeoutError

대기 시간이 초과됐을 때 throw. `wait.until()` 이 `maxCount` 초과 시 자동으로 발생시킨다. `SdError` 상속.

```typescript
class TimeoutError extends SdError {
  constructor(count?: number, message?: string); // "대기 시간 초과(<count>회 시도): <message>"
}
```

- `count` — 시도 횟수. 지정 시 `(N회 시도)` 가 메시지에 삽입됨.
- `message` — 무엇을 대기하다 실패했는지 보조 설명.

```typescript
try {
  await wait.until(() => isReady, 100, 50);
} catch (e) {
  if (e instanceof TimeoutError) { /* 타임아웃 분기 */ }
}
```
