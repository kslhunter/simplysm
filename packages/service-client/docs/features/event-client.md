# EventClient

서버 이벤트 구독/발행 관리 인터페이스. 재연결 시 자동 재구독된다. 팩토리 함수 `createEventClient`로 생성한다.

```typescript
export interface EventClient {
  getEvent<TEventDef extends ServiceEventDef>(
    eventName: string,
  ): ClientEventProxy<TEventDef>;
  addListener<TEventDef extends ServiceEventDef>(
    eventName: string,
    info: TEventDef["$info"],
    cb: (data: TEventDef["$data"]) => PromiseLike<void>,
  ): Promise<string>;
  removeListener(key: string): Promise<void>;
  emit<TEventDef extends ServiceEventDef>(
    eventName: string,
    infoSelector: (item: TEventDef["$info"]) => boolean,
    data: TEventDef["$data"],
  ): Promise<void>;
  resubscribeAll(): Promise<void>;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `getEvent(eventName)` | method | `ClientEventProxy<TEventDef>` | 이벤트 이름과 타입을 캡처한 프록시 반환 |
| `addListener(eventName, info, cb)` | method | `Promise<string>` | 이벤트 리스너 등록. 반환값은 `key` (제거 시 사용) |
| `removeListener(key)` | method | `Promise<void>` | 등록된 이벤트 리스너 제거 |
| `emit(eventName, infoSelector, data)` | method | `Promise<void>` | `infoSelector`가 참인 대상에게 데이터 발행 |
| `resubscribeAll()` | method | `Promise<void>` | 재연결 시 모든 리스너를 서버에 재등록. `ServiceClient`가 자동 호출 |

## Related Types

### `ClientEventProxy`

`getEvent()`가 반환하는 이벤트 프록시 인터페이스. 이벤트 이름과 제네릭 타입이 캡처되어 있어 호출 시 반복 지정이 불필요하다.

```typescript
export interface ClientEventProxy<TEventDef extends ServiceEventDef> {
  addListener(
    info: TEventDef["$info"],
    cb: (data: TEventDef["$data"]) => PromiseLike<void>,
  ): Promise<string>;
  removeListener(key: string): Promise<void>;
  emit(
    infoSelector: (item: TEventDef["$info"]) => boolean,
    data: TEventDef["$data"],
  ): Promise<void>;
}
```

| Member | Type | Description |
|--------|------|-------------|
| `addListener(info, cb)` | `Promise<string>` | 이벤트 리스너 등록. 반환값은 `key` (제거 시 사용) |
| `removeListener(key)` | `Promise<void>` | 등록된 이벤트 리스너 제거 |
| `emit(infoSelector, data)` | `Promise<void>` | `infoSelector`가 참인 대상에게 데이터 발행 |

## `createEventClient`

`EventClient` 팩토리 함수.

```typescript
export function createEventClient(transport: ServiceTransport): EventClient;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `transport` | [`ServiceTransport`](../transport/service-transport.md) | 서비스 전송 계층 |

## Usage

```typescript
// getEvent() 방식 (권장 — 이벤트 이름과 타입이 캡처됨)
const chatEvt = client.getEvent<typeof ChatEvent>("Chat");
const key = await chatEvt.addListener({ roomId: "room-1" }, async (data) => {
  console.log("메시지:", data.message);
});
await chatEvt.removeListener(key);

// 이벤트 발행
await chatEvt.emit(
  (info) => info.roomId === "room-1",
  { message: "hello" },
);
```
