# Events

## `ServiceEventDef`

Type-safe event definition created by `defineEvent()`. The `$info` and `$data` fields are type-only markers not used at runtime.

```typescript
export interface ServiceEventDef<TInfo = unknown, TData = unknown> {
  eventName: string;
  readonly $info: TInfo;
  readonly $data: TData;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `eventName` | `string` | Event name identifier |
| `$info` | `TInfo` | Type-only marker for event filter info (not used at runtime) |
| `$data` | `TData` | Type-only marker for event data (not used at runtime) |

## `defineEvent`

Creates a type-safe service event definition with typed info and data.

```typescript
export function defineEvent<TInfo = unknown, TData = unknown>(
  eventName: string,
): ServiceEventDef<TInfo, TData>;
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `eventName` | `string` | Event name identifier |

**Type Parameters:**

| Parameter | Description |
|-----------|-------------|
| `TInfo` | Type of the event filter info |
| `TData` | Type of the event data payload |

**Returns:** `ServiceEventDef<TInfo, TData>`

**Example:**

```typescript
const OrderUpdated = defineEvent<{ orderId: number }, { status: string }>("OrderUpdated");

// Server: emit event
ctx.socket?.emitEvent(OrderUpdated, { orderId: 123 }, { status: "shipped" });

// Client: subscribe
await client.addEventListener(OrderUpdated, { orderId: 123 }, (data) => {
  console.log(data.status); // typed as string
});
```
