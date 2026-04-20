# Errors

## `SdError`

트리 구조 에러 체인을 지원하는 에러 클래스. ES2024 `cause` 속성을 활용한다.

```typescript
export class SdError extends Error {
  override cause?: Error;

  /** 원인 에러를 감싸서 생성. 메시지는 역순으로 결합됨 */
  constructor(cause: Error, ...messages: string[]);
  /** 메시지만으로 생성 */
  constructor(...messages: string[]);
}
```

생성자에 전달된 메시지들은 역순으로 결합된다. `cause`가 `Error` 인스턴스이면 그 메시지도 체인 끝에 추가된다.

```typescript
throw new SdError(err, "API 호출 실패", "사용자 로드 실패");
// message: "사용자 로드 실패 => API 호출 실패 => 원본 에러 메시지"

throw new SdError("잘못된 상태", "처리 불가");
// message: "처리 불가 => 잘못된 상태"
```

## `ArgumentError`

유효하지 않은 인자를 전달받았을 때 발생하는 에러. 인자 객체를 YAML 형식으로 메시지에 포함하여 디버깅을 용이하게 한다.

```typescript
export class ArgumentError extends SdError {
  /** 기본 메시지("잘못된 인자입니다.")와 함께 인자 객체를 YAML 형식으로 출력 */
  constructor(argObj: Record<string, unknown>);
  /** 커스텀 메시지와 함께 인자 객체를 YAML 형식으로 출력 */
  constructor(message: string, argObj: Record<string, unknown>);
}
```

```typescript
throw new ArgumentError({ userId: 123, name: null });
// message: "잘못된 인자입니다.\n\nuserId: 123\nname: null"

throw new ArgumentError("잘못된 사용자", { userId: 123 });
// message: "잘못된 사용자\n\nuserId: 123"
```

## `NotImplementedError`

아직 구현되지 않은 기능이 호출되었을 때 발생하는 에러.

```typescript
export class NotImplementedError extends SdError {
  constructor(message?: string);
}
```

```typescript
throw new NotImplementedError("서브클래스에서 구현 필요");
// message: "미구현: 서브클래스에서 구현 필요"
```

## `TimeoutError`

대기 시간이 초과되었을 때 발생하는 에러. `wait.until()`에서 최대 시도 횟수를 초과하면 자동으로 발생한다.

```typescript
export class TimeoutError extends SdError {
  constructor(count?: number, message?: string);
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `count` | `number \| undefined` | 시도 횟수 |
| `message` | `string \| undefined` | 추가 메시지 |

```typescript
throw new TimeoutError(50, "API 응답 대기 초과");
// message: "대기 시간 초과(50회 시도): API 응답 대기 초과"
```
