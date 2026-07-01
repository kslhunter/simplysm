# @simplysm/service-client — 이벤트 구독·발행

`ServiceEventDef` 기반 서버 푸시 이벤트를 클라이언트에서 구독·해제·발행할 때 함께 읽는 API 묶음. 구독은 로컬 리스너 맵에 보관되어 재연결 시 자동 재구독된다. 사용법: [client-service.md](../../manuals/client-service.md), [event.md](../../manuals/event.md)

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

- `eventDef: TEventDef` — 이벤트 정의 객체. 내부 구현은 `eventDef.eventName` 을 `evt:add`·`evt:gets` 요청의 `name` 으로 쓴다.
- `info: TEventDef["$info"]` — 리스너 등록 정보. `evt:add` body 에 `{ key, name, info }` 로 전송되고 로컬 재구독 맵에도 저장된다.
- `cb: (data) => PromiseLike<void>` — 이벤트 데이터 콜백. 서버가 보낸 key 와 로컬 리스너 key 가 일치할 때 호출된다.
- `key: string` — `addListener` 가 생성·반환하는 UUID 문자열. `removeListener` 는 이 key 로 로컬 맵을 지우고 서버에 `evt:remove` 를 보낸다.
- `infoSelector: (item) => boolean` — 서버에서 조회한 리스너 `info` 를 필터링한다. true 인 리스너 key 만 `evt:emit` 대상이 된다. 이 함수는 발행 클라이언트에서 실행되며 서버로 전달되지 않는다.
- `data: TEventDef["$data"]` — `evt:emit` body 로 보낼 이벤트 데이터.
- `getEvent(eventDef)` — `eventDef` 를 고정한 `ClientEventProxy` 를 반환한다(매번 새 객체).
- `addListener(eventDef, info, cb)` — `ServiceClient` 래퍼에서는 미연결(`connected === false`)이면 `"서버에 연결되지 않았습니다."` 를 throw 한 뒤 내부 `EventClient.addListener` 로 위임한다.
- `removeListener(key)` — 내부 `EventClient.removeListener` 로 위임한다.
- `emitEvent(eventDef, infoSelector, data)` — 내부 `EventClient.emit` 으로 위임한다.

## ClientEventProxy

```ts
interface ClientEventProxy<TEventDef extends ServiceEventDef> {
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

`getEvent(eventDef)` 가 반환하는, 특정 `eventDef` 가 고정된 프록시. `addListener`/`emit` 에서 eventDef 인자를 생략한다.

- `TEventDef` — 프록시에 고정된 이벤트 정의 타입. `$info`·`$data` 타입을 각 메서드 인자에 전파한다.
- `addListener(info, cb)` — 고정된 eventDef 로 리스너를 등록하고 key 를 반환한다.
- `removeListener(key)` — 고정 eventDef 와 무관하게 key 로 리스너를 제거한다(`EventClient.removeListener` 와 동일).
- `emit(infoSelector, data)` — 고정된 eventDef 로 이벤트를 발행한다.

## EventClient / createEventClient

```ts
interface EventClient {
  getEvent<TEventDef extends ServiceEventDef>(eventDef: TEventDef): ClientEventProxy<TEventDef>;
  addListener<TEventDef extends ServiceEventDef>(
    eventDef: TEventDef,
    info: TEventDef["$info"],
    cb: (data: TEventDef["$data"]) => PromiseLike<void>,
  ): Promise<string>;
  removeListener(key: string): Promise<void>;
  emit<TEventDef extends ServiceEventDef>(
    eventDef: TEventDef,
    infoSelector: (item: TEventDef["$info"]) => boolean,
    data: TEventDef["$data"],
  ): Promise<void>;
  resubscribeAll(): Promise<void>;
}
function createEventClient(transport: ServiceTransport): EventClient;
```

- `transport: ServiceTransport` — 이벤트 등록·조회·발행 메시지를 보내고 `"event"` 푸시를 수신하는 전송 계층.
- 생성 시 `transport.on("event", ...)` 를 구독해, 수신한 `{ keys, data }` 를 로컬 리스너 맵에서 keys 로 찾아 콜백을 순차 실행한다. 콜백 throw 는 logger 에 기록하고 다음으로 넘어간다.
- `addListener` — UUID key 생성 → `evt:add` 전송 → 로컬 맵에 `{ eventName, info, cb }` 저장 → key 반환 순서로 동작한다.
- `removeListener` — 로컬 맵을 먼저 삭제한 뒤 `evt:remove` 를 전송한다. 전송 중 throw 는 catch 후 무시한다(서버가 연결 끊김 시 리스너를 자동 정리하므로 안전).
- `emit` — `evt:gets` 로 `{ key, info }[]` 를 받아 `infoSelector` 로 key 를 추리고, 대상이 1개 이상일 때만 `evt:emit` 을 보낸다(0개면 미전송).
- `resubscribeAll()` — 로컬 맵의 모든 리스너를 기존 key 로 다시 `evt:add` 한다. 항목별 실패는 logger 에 기록하며 `Promise.allSettled` 로 전체를 순회한다. `ServiceClient` 가 소켓 `"connected"` 시 자동 호출한다.
