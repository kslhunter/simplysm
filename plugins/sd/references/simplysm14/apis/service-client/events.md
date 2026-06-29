# @simplysm/service-client — 이벤트 구독·발행

`ServiceEventDef` 기반 서버 푸시 이벤트를 클라이언트에서 구독·해제·발행할 때 함께 읽는 API 묶음. 사용법: [client-service.md](../../manuals/client-service.md), [event.md](../../manuals/event.md)

## ServiceClient 이벤트 메서드

```ts
getEvent<TEventDef extends ServiceEventDef>(eventDef: TEventDef): ClientEventProxy<TEventDef>;
addListener<TEventDef extends ServiceEventDef>(
  eventDef: TEventDef,
  info: TEventDef["$info"],
  cb: (data: TEventDef["$data"]) => PromiseLike<void>,
): Promise<string>;
removeListener(key: string): Promise<void>;
emitEvent<TEventDef extends ServiceEventDef>(
  eventDef: TEventDef,
  infoSelector: (item: TEventDef["$info"]) => boolean,
  data: TEventDef["$data"],
): Promise<void>;
```

- `eventDef: TEventDef` — 이벤트 정의 객체. 내부 구현은 `eventDef.eventName` 을 `evt:add`·`evt:gets` 요청의 `name` 으로 사용한다.
- `info: TEventDef["$info"]` — 리스너 등록 정보. `evt:add` body 에 `{ key, name, info }` 로 전송되고 로컬 재구독 맵에 저장된다.
- `cb: (data) => PromiseLike<void>` — 이벤트 데이터 콜백. 서버에서 받은 key 와 로컬 리스너 key 가 일치할 때 호출된다.
- `key: string` — `addListener` 가 생성·반환하는 UUID 문자열. `removeListener` 가 이 key 로 로컬 맵을 삭제하고 서버에 `evt:remove` 를 보낸다.
- `infoSelector: (item) => boolean` — 서버에서 조회한 리스너 `info` 를 필터링한다. true 인 리스너 key 만 `evt:emit` 대상으로 보낸다.
- `data: TEventDef["$data"]` — `evt:emit` body 의 이벤트 데이터.
- `getEvent` — `eventDef` 를 고정한 `ClientEventProxy` 를 반환한다.
- `addListener` — `ServiceClient` 래퍼에서는 미연결이면 `"서버에 연결되지 않았습니다."` 를 throw 한다.
- `removeListener` — 서버 제거 요청 실패는 무시한다.
- `emitEvent` — 필터 결과 key 가 0개면 `evt:emit` 요청을 보내지 않는다.

## ClientEventProxy

```ts
interface ClientEventProxy<TEventDef extends ServiceEventDef> {
  addListener(info: TEventDef["$info"], cb: (data: TEventDef["$data"]) => PromiseLike<void>): Promise<string>;
  removeListener(key: string): Promise<void>;
  emit(infoSelector: (item: TEventDef["$info"]) => boolean, data: TEventDef["$data"]): Promise<void>;
}
```

- `TEventDef` — 프록시에 고정된 이벤트 정의 타입. `$info` 와 `$data` 타입을 각 메서드 인자에 전파한다.
- `addListener(info, cb)` — 고정된 `eventDef` 로 리스너를 등록한다.
- `removeListener(key)` — 고정 eventDef 와 무관하게 key 로 리스너를 제거한다.
- `emit(infoSelector, data)` — 고정된 `eventDef` 로 이벤트를 발행한다.

## EventClient / createEventClient

```ts
interface EventClient {
  getEvent<TEventDef extends ServiceEventDef>(eventDef: TEventDef): ClientEventProxy<TEventDef>;
  addListener<TEventDef extends ServiceEventDef>(eventDef: TEventDef, info: TEventDef["$info"], cb: (data: TEventDef["$data"]) => PromiseLike<void>): Promise<string>;
  removeListener(key: string): Promise<void>;
  emit<TEventDef extends ServiceEventDef>(eventDef: TEventDef, infoSelector: (item: TEventDef["$info"]) => boolean, data: TEventDef["$data"]): Promise<void>;
  resubscribeAll(): Promise<void>;
}
function createEventClient(transport: ServiceTransport): EventClient;
```

- `transport: ServiceTransport` — 이벤트 등록·조회·발행 메시지를 보내고 `"event"` 푸시를 수신하는 전송 계층.
- `listenerMap: Map<string, { eventName; info; cb }>` — 구현 내부 저장소. 등록 성공 후 저장되고, 재연결 복구와 key 기반 dispatch 에 사용된다.
- `addListener` — UUID key 생성 → `evt:add` 전송 → 로컬 맵 저장 → key 반환 순서로 동작한다.
- `removeListener` — 로컬 맵을 먼저 삭제한 뒤 `evt:remove` 를 전송한다. 전송 중 throw 는 catch 후 무시한다.
- `emit` — `evt:gets` 로 `{ key, info }[]` 를 받고 `infoSelector` 로 key 를 추린 뒤, 대상이 있으면 `evt:emit` 을 보낸다.
- `resubscribeAll()` — 로컬 맵의 모든 리스너를 기존 key 로 다시 `evt:add` 한다. 항목별 실패는 logger 에 기록하고 `Promise.allSettled` 로 전체 순회를 끝낸다.
- 서버 push 처리 — `transport.on("event", { keys, data })` 를 받아 keys 와 일치하는 로컬 콜백을 실행한다. 콜백 throw 는 logger 에 기록한다.
