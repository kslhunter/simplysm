# `defineEvent`

> **읽어야 하는 상황**: 서버-클라이언트 간 타입 안전 이벤트를 정의할 때. 이벤트 구독·발생 API는 `@simplysm/service-server`와 `@simplysm/service-client`에서 제공한다.

## When to use

- 서버에서 이벤트를 정의하고, 클라이언트에서 `import type`으로 타입 안전하게 구독할 때

타입 안전한 서비스 이벤트를 정의하는 팩토리 함수.

```typescript
export function defineEvent<TInfo = unknown, TData = unknown>(
  eventName: string,
): ServiceEventDef<TInfo, TData>;
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `eventName` | `string` | 이벤트 이름 (고유해야 함) |

| Type Parameter | Default | Description |
|---------------|---------|-------------|
| `TInfo` | `unknown` | 이벤트 필터링 조건의 타입. 구독 시 필터로 사용 |
| `TData` | `unknown` | 이벤트 페이로드의 타입. 이벤트 발생/수신 시 데이터 타입 |

## Returns

`ServiceEventDef<TInfo, TData>` — 이벤트 정의 인스턴스.

## Related Types

### `ServiceEventDef`

`defineEvent()`로 생성된 이벤트 정의. `$info`와 `$data`는 런타임에서 사용되지 않는 타입 전용 마커다.

```typescript
export interface ServiceEventDef<TInfo = unknown, TData = unknown> {
  eventName: string;
  readonly $info: TInfo;
  readonly $data: TData;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `eventName` | `string` | 이벤트 이름 |
| `$info` | `TInfo` | 타입 추출 전용 마커 (런타임에서 사용하지 않음). 이벤트 필터링 조건 타입 |
| `$data` | `TData` | 타입 추출 전용 마커 (런타임에서 사용하지 않음). 이벤트 페이로드 타입 |

## Usage

```typescript
import { defineEvent } from "@simplysm/service-common";

// 서버에서 이벤트 정의 + 타입 export
export const OrderUpdated = defineEvent<{ orderId: number }, { status: string }>("OrderUpdated");

// 서버에서 이벤트 발생 — getEvent() 프록시 방식 (권장)
const orderEvt = server.getEvent<typeof OrderUpdated>("OrderUpdated");
await orderEvt.emit((info) => info.orderId === 123, { status: "shipped" });

// 클라이언트에서 구독 (import type으로 타입만 가져옴)
import type { OrderUpdated } from "@server-package";
const orderEvt = client.getEvent<typeof OrderUpdated>("OrderUpdated");
const key = await orderEvt.addListener({ orderId: 123 }, async (data) => {
  // data.status는 string으로 타입 추론됨
});

// 직접 호출 방식 (하위 호환)
await server.emitEvent<typeof OrderUpdated>("OrderUpdated", (info) => info.orderId === 123, { status: "shipped" });
await client.addListener<typeof OrderUpdated>("OrderUpdated", { orderId: 123 }, async (data) => { /* ... */ });
```
