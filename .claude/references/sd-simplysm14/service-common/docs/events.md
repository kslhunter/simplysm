# Events

## `ServiceEventDef`

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

`TInfo`와 `TData`는 제네릭 파라미터로, `defineEvent<TInfo, TData>()` 호출 시 지정된 타입이 할당된다. 기본값은 `unknown`.

## `defineEvent`

타입 안전한 서비스 이벤트를 정의하는 팩토리 함수.

```typescript
export function defineEvent<TInfo = unknown, TData = unknown>(
  eventName: string,
): ServiceEventDef<TInfo, TData>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `eventName` | `string` | 이벤트 이름 (고유해야 함) |

| Type Parameter | Default | Description |
|---------------|---------|-------------|
| `TInfo` | `unknown` | 이벤트 필터링 조건의 타입. 구독 시 필터로 사용 |
| `TData` | `unknown` | 이벤트 페이로드의 타입. 이벤트 발생/수신 시 데이터 타입 |

반환: `ServiceEventDef<TInfo, TData>` 인스턴스.

사용 예:

```typescript
// 이벤트 정의
const OrderUpdated = defineEvent<{ orderId: number }, { status: string }>(OrderUpdated);

// 서버에서 이벤트 발생
ctx.socket?.emitEvent(OrderUpdated, { orderId: 123 }, { status: shipped });

// 클라이언트에서 구독
await client.addEventListener(OrderUpdated, { orderId: 123 }, (data) => {
  // data.status는 string으로 타입 추론됨
});
```
