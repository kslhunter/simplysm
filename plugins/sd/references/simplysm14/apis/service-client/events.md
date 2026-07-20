# @simplysm/service-client — 이벤트 구독, 발행

서버, 클라이언트 간 실시간 이벤트 메커니즘.

- `ServiceEventDef` 기반 타입 안전 구독, 발행, 해제.
- 클라이언트가 서버에 리스너 등록 후, 서버가 조건에 맞는 클라이언트에 이벤트 발행.
- 재연결 시 리스너 자동 복구.
- 사용법: [event.md](../../manuals/event.md)

## EventClient

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

내부 로직:

- 생성 시 `transport.on("event", ...)` 구독.
  - 서버에서 받은 `{ keys, data }` 를 로컬 리스너 맵의 해당 `keys` 로 찾아 콜백 순차 실행.
  - 콜백 에러는 logger 기록 후 다음 진행.
- 로컬 리스너 맵 = `Map<key, { eventName, info, cb }>`. 재연결 시 복구용 저장.

**메서드**:

- `getEvent<TEventDef>(eventDef): ClientEventProxy<TEventDef>` — 특정 이벤트에 바인딩된 프록시 생성. 프록시의 메서드 호출 시 `eventDef` 자동 포함.
  - `eventDef: TEventDef` — 이벤트 정의 객체(예: `defineEvent<{ channel: string }, string>("TestEvent")`). 내부에서 `eventDef.eventName` 을 메시지 `name` 으로 사용.
- `addListener<TEventDef>(eventDef, info, cb): Promise<string>` — 리스너 등록 및 UUID key 반환.
  - `info: TEventDef["$info"]` — 리스너 필터 정보. 예: `{ channel: "ch1" }`. 서버가 발행 시 조건 매칭에 사용.
  - `cb: (data) => PromiseLike<void>` — 이벤트 수신 콜백. 서버의 `evt:on` 메시지 수신 시 호출.
  - 동작: UUID key 생성 → `{ name: "evt:add", body: { key, name: eventName, info } }` 전송 → 로컬 맵 저장 → key 반환.
- `removeListener(key): Promise<void>` — 리스너 제거.
  - 동작: 로컬 맵에서 먼저 삭제 → `{ name: "evt:remove", body: { key } }` 전송. 전송 실패 시 예외 무시(서버 연결 끊김 시 자동 정리).
- `emit<TEventDef>(eventDef, infoSelector, data): Promise<void>` — 이벤트 발행.
  - `infoSelector: (item) => boolean` — 서버 리스너 정보 필터.
    - 예: `(info) => info.channel === "broadcast"`.
    - 발행 클라이언트에서 실행되며 서버로 전달 안 함.
  - `data: TEventDef["$data"]` — 발행 데이터. 예: `"hello"`.
  - 동작: `{ name: "evt:gets", body: { name: eventName } }` → 응답 `[{ key, info }, ...]` → `infoSelector` 필터
    → 0개면 미전송, 1개 이상이면 `{ name: "evt:emit", body: { keys: [targetKey, ...], data } }` 전송.
- `resubscribeAll(): Promise<void>` — 로컬 맵 전체를 서버에 재등록.
  - 동작: 로컬 맵의 모든 `{ key, eventName, info }` 에 대해 `evt:add` 메시지 재전송.
    - `Promise.allSettled` 사용하여 부분 실패 허용.
    - `ServiceClient` 소켓 `"state": "connected"` 이벤트에서 자동 호출.

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

`getEvent(eventDef)` 가 반환하는, 특정 이벤트 정의가 바인딩된 프록시. `addListener`, `emit` 에서 `eventDef` 인자 생략.

- `TEventDef` — 프록시에 고정된 이벤트 정의 타입. `$info`, `$data` 타입을 각 메서드에 전파.
- `addListener(info, cb): Promise<string>` — `EventClient.addListener(eventDef, info, cb)` 호출(eventDef 자동 포함).
- `removeListener(key): Promise<void>` — `EventClient.removeListener(key)` 호출(eventDef 무관).
- `emit(infoSelector, data): Promise<void>` — `EventClient.emit(eventDef, infoSelector, data)` 호출(eventDef 자동 포함).

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

`ServiceClient` 는 내부 `EventClient` 를 래핑.

- `getEvent(eventDef): ClientEventProxy<TEventDef>` — `this._eventClient.getEvent(eventDef)` 위임.
- `addListener(eventDef, info, cb): Promise<string>` — 미연결이면 `"서버에 연결되지 않았습니다."` throw. 연결되었으면 `this._eventClient.addListener(eventDef, info, cb)` 위임.
- `removeListener(key): Promise<void>` — `this._eventClient.removeListener(key)` 위임.
- `emitEvent(eventDef, infoSelector, data): Promise<void>` — `this._eventClient.emit(eventDef, infoSelector, data)` 위임.

**사용 예시** (테스트 코드 기반):

```ts
const TestEvent = defineEvent<{ channel: string }, string>("TestEvent");

// 프록시 방식
const proxy = eventClient.getEvent(TestEvent);
const key = await proxy.addListener({ channel: "ch1" }, async (data) => {
  console.log("received:", data);
});
await proxy.removeListener(key);

// 직접 호출 방식
const key = await eventClient.addListener(TestEvent, { channel: "broadcast" }, async (data) => {
  /* ... */
});
await eventClient.emit(TestEvent, (info) => info.channel === "broadcast", "hello world");
```

**재연결 동작**:

1. 소켓 `"state": "connected"` 이벤트 발생.
2. `ServiceClient` 에서 보관 토큰 있으면 `auth()` 재호출.
3. `EventClient.resubscribeAll()` 호출하여 로컬 리스너 모두 서버에 재등록.
4. 이후 서버 `evt:on` 수신 시 등록된 콜백 호출 재개.
