# @simplysm/service-common — messages

`ServiceProtocol` 위에 실리는 메시지 식별자(`name`) 별 바디 스키마. 모든 인터페이스는 `name` discriminator 로 좁힌다.

## 유니언

```ts
type ServiceMessage =
  | ServiceRequestMessage | ServiceAuthMessage
  | ServiceProgressMessage | ServiceResponseMessage | ServiceErrorMessage
  | ServiceAddEventListenerMessage | ServiceRemoveEventListenerMessage
  | ServiceGetEventListenerInfosMessage
  | ServiceEmitEventMessage | ServiceEventMessage;

type ServiceClientMessage =      // 클라이언트 → 서버
  | ServiceRequestMessage | ServiceAuthMessage
  | ServiceAddEventListenerMessage | ServiceRemoveEventListenerMessage
  | ServiceGetEventListenerInfosMessage | ServiceEmitEventMessage;

type ServiceServerMessage =      // 서버 → 클라이언트 (디스패치 대상)
  | ServiceResponseMessage | ServiceErrorMessage | ServiceEventMessage;

type ServiceServerRawMessage =   // 서버 → 클라이언트 (progress 포함 전체)
  | ServiceProgressMessage | ServiceServerMessage;
```

## 시스템

- `ServiceProgressMessage` — `name: "progress"`, `body: { totalSize, completedSize }`. 서버가 청크 수신 진행률 알림.
- `ServiceErrorMessage` — `name: "error"`, `body: { name, message, code, stack?, detail?, cause? }`. 처리 중 에러 알림.
- `ServiceAuthMessage` — `name: "auth"`, `body: string` (토큰). 클라이언트 인증.

## 서비스 메서드

- `ServiceRequestMessage` — `` name: `${string}.${string}` `` (예: `"User.findOne"`), `body: unknown[]` (매개변수 배열).
- `ServiceResponseMessage` — `name: "response"`, `body?: unknown` (반환값).

## 이벤트

- `ServiceAddEventListenerMessage` — `name: "evt:add"`, `body: { key, name, info }`. `key` 는 uuid (remove 키).
- `ServiceRemoveEventListenerMessage` — `name: "evt:remove"`, `body: { key }`.
- `ServiceGetEventListenerInfosMessage` — `name: "evt:gets"`, `body: { name }`. 동일 이벤트 구독자들의 `info` 목록 요청.
- `ServiceEmitEventMessage` — `name: "evt:emit"`, `body: { keys, data }`. 클라이언트 발생.
- `ServiceEventMessage` — `name: "evt:on"`, `body: { keys, data }`. 서버 알림.

## 사용

```ts
function dispatch(msg: ServiceServerMessage) {
  switch (msg.name) {
    case "response": return resolveCall(msg.body);
    case "error":    return rejectCall(msg.body);
    case "evt:on":   return notifyListeners(msg.body.keys, msg.body.data);
  }
}
```
