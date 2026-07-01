# 서비스 이벤트 매뉴얼

클라이언트끼리(또는 서버 → 클라이언트로) 실시간 알림을 주고받으려 할 때 참조. 예: 한 사용자가 주문 상태를 바꾸면 같은 화면을 보는 다른 사용자에게 즉시 반영.

`@simplysm/service-common` 의 `defineEvent` 로 이벤트를 정의하고, `ServiceClient`(`@simplysm/service-client`) 또는 서버 `ServiceContext` 로 발생·구독함. WebSocket 위에서 동작하므로 연결된 클라이언트에만 전달됨.

흐름:

```
[구독측]  client.getEvent(EventDef).addListener(info, cb) 로 info + 콜백 등록

[클라이언트 발생] client.emitEvent(EventDef, selector, data)
  1) 서버에서 해당 eventName 의 listener info 목록 조회
  2) 발생 클라이언트가 selector 로 대상 key 를 고름
  3) 서버가 key 에 해당하는 연결로 data 전달

[서버 발생] ctx.server.emitEvent(EventDef, selector, data)
  1) 서버가 listener info 에 selector 를 적용해 대상 key 를 고름
  2) 서버가 key 에 해당하는 연결로 data 전달
```

- **구독(리스너 등록)은 클라이언트에만 있음**. 서버는 발생만 가능(구독 불가).
- **발생은 클라이언트·서버 양쪽 가능**. 화면 동작에서 비롯되는 변경 알림이 대부분이라 클라이언트 발생이 더 흔함.
- 클라이언트 발생의 `selector` 함수는 서버로 직렬화되지 않고 발생 클라이언트에서 실행됨. 서버 발생의 `selector` 는 서버에서 실행됨.

## 이벤트를 정의하려면

`defineEvent<TInfo, TData>(eventName)` 로 정의해 **공통 패키지(`@<workspace>/common`)에서 export**. 발생측·구독측이 같은 정의 객체를 값으로 import 하므로, 서버·클라이언트 양쪽에서 import 가능한 공통 패키지에 둠.

```ts
// @<workspace>/common 의 events.ts
import { defineEvent } from "@simplysm/service-common";

export const OrderStatusChangedEvent = defineEvent<
  { warehouseId: number }, // TInfo: 구독·필터 기준 메타데이터
  { orderId: number; status: string } // TData: 전달 페이로드
>("OrderStatusChanged");
```

- 두 제네릭의 의미:
  - `TInfo` — 구독자가 "무엇을 구독하는지" 식별하는 메타데이터. 발생측이 이 값으로 대상을 골라냄.
  - `TData` — 이벤트가 실어 나르는 페이로드.
- 인자 `eventName` 은 라우팅 키. 같은 이름이면 같은 이벤트로 취급되므로 앱 내에서 고유하게.
- **이름·타입의 단일 소스는 이 정의 객체**. 발생·구독 호출 시 정의 객체를 그대로 첫 인자로 넘기면 이름과 타입이 자동 추론됨 — 문자열 이름이나 `<typeof X>` 를 따로 적지 않음.

## 클라이언트에서 이벤트를 구독하려면

`client.getEvent(EventDef)` 로 프록시를 얻어 `addListener(info, cb)` 를 호출. 반환된 키는 해제에 사용하므로 보관.

```ts
const event = client.getEvent(OrderStatusChangedEvent);

const listenerKey = await event.addListener(
  { warehouseId: 7 }, // info: 이 구독이 받을 범위
  async (data) => {
    // data 는 { orderId, status } 로 타입 추론됨
    await this.reload();
  },
);
```

- `info` 는 정의의 `TInfo` 타입. 발생측의 selector 가 이 값을 보고 전달 여부를 결정(아래 "특정 구독자에게만").
- 콜백의 `data` 는 정의의 `TData` 로 타입이 잡힘.
- `addListener` 는 서버 연결 완료 후 등록. 앱 provider 패턴이면 `AppServiceProvider.connectAsync()`, raw `ServiceClient` 를 직접 쓰면 `client.connect()` 완료 뒤 호출.
- AppServiceProvider 에서 이벤트 프록시를 getter 로 노출하는 패턴은 [client-service.md](./client-service.md) 참조.

## 구독을 해제하려면

등록 때 받은 키로 `removeListener` 호출. 화면 컴포넌트면 파기 시점에 해제.

```ts
await client.removeListener(listenerKey);
```

- 키 없이 일괄 해제하는 API 는 없음. 등록 시 받은 키를 화면·프로바이더 상태로 들고 있다가 해제.

## 클라이언트에서 이벤트를 발생시키려면

화면 동작으로 생긴 변경을 다른 클라이언트에 알리는 가장 흔한 경우. `client.emitEvent(EventDef, infoSelector, data)` 호출. 프록시의 `.emit()` 도 동일.

```ts
// 7번 창고를 구독 중인 클라이언트에게만 전달
await client.emitEvent(
  OrderStatusChangedEvent,
  (info) => info.warehouseId === 7,
  { orderId: 1024, status: "shipped" },
);

// 프록시 형태
await client.getEvent(OrderStatusChangedEvent).emit(
  (info) => info.warehouseId === 7,
  { orderId: 1024, status: "shipped" },
);
```

- `infoSelector` 는 각 구독의 `info` 를 받아 전달 대상인지 판정하는 함수.
- 자기 자신이 같은 이벤트를 구독 중이고 selector 에 걸리면 자신의 콜백도 실행됨.

## 서버에서 이벤트를 발생시키려면

서버 측 처리(예: 외부 시스템 연동 결과 반영)에서 알릴 때. 서비스 메서드의 `ctx.server` 로 발생.

```ts
export const OrderService = defineService("Order", (ctx) => ({
  ship: async (orderId: number) => {
    // ... 처리 ...
    await ctx.server.emitEvent(
      OrderStatusChangedEvent,
      (info) => info.warehouseId === 7,
      { orderId, status: "shipped" },
    );
  },
}));
```

- 발생 시그니처는 클라이언트와 동일(`emitEvent(EventDef, infoSelector, data)`).
- `defineService` / `ServiceContext` 의 전반은 서버 패키지 작성 시 참조.

## 특정 구독자에게만 전달하려면

이벤트는 구독자의 `info` 와 발생측의 `infoSelector` 매칭으로 대상을 좁힘. 같은 이벤트라도 selector 가 `true` 를 돌려준 구독만 콜백을 받음.

```ts
// 구독: 자신이 보는 창고를 info 로 등록
await event.addListener({ warehouseId: 7 }, cb7);
await event.addListener({ warehouseId: 9 }, cb9);

// 발생: warehouseId === 7 인 구독만 전달 → cb7 만 실행, cb9 는 무시
await client.emitEvent(OrderStatusChangedEvent, (info) => info.warehouseId === 7, data);
```

- 전체에게 보내려면 `() => true` 를 selector 로.
- selector 가 어떤 구독에도 걸리지 않으면 아무 콜백도 실행되지 않음(전송 자체가 생략됨).

## 지킬 것

- 이벤트 정의는 공통 패키지에 두고 정의 객체를 그대로 발생·구독에 넘김. 발생·구독 호출부에 이벤트 이름 문자열이나 `<typeof X>` 제네릭을 중복으로 적지 않음.
- 구독은 클라이언트에서만. 서버는 발생 전용이며 `addListener` 가 없음 — 서버가 다른 서버 동작을 기다려야 한다면 이벤트가 아닌 다른 수단을 사용.
- `addListener` 로 받은 키는 반드시 보관하고 화면·프로바이더 파기 시 `removeListener` 로 해제. 미해제 리스너는 재연결 때마다 누적됨.
- 재연결 시 등록된 리스너는 자동으로 재구독되므로, 연결 복구를 감지해 수동으로 다시 `addListener` 하지 않음.
- 전달은 그 시점에 연결된 클라이언트에만 일어남. 오프라인 클라이언트를 위한 보관·재전송은 없으므로, 놓치면 안 되는 상태는 이벤트가 아니라 조회(재로딩)로 확정.
