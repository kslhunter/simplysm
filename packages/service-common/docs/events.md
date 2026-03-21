# Events and Types

## ServiceEventDef

Event definition created by `defineEvent()`. `$info` and `$data` are type-only markers (not used at runtime).

```typescript
interface ServiceEventDef<TInfo = unknown, TData = unknown> {
  eventName: string;
  /** Type extraction only (not used at runtime) */
  readonly $info: TInfo;
  /** Type extraction only (not used at runtime) */
  readonly $data: TData;
}
```

## `defineEvent`

Define a service event with type-safe info and data.

```typescript
function defineEvent<TInfo = unknown, TData = unknown>(
  eventName: string,
): ServiceEventDef<TInfo, TData>;
```

### Example

```typescript
import { defineEvent } from "@simplysm/service-common";

const OrderUpdated = defineEvent<{ orderId: number }, { status: string }>("OrderUpdated");

// Server emit
ctx.socket?.emitEvent(OrderUpdated, { orderId: 123 }, { status: "shipped" });

// Client subscribe
await client.addEventListener(OrderUpdated, { orderId: 123 }, (data) => {
  console.log(data.status); // typed as string
});
```

---

## ServiceUploadResult

File upload result. Contains information about a file uploaded to the server.

```typescript
interface ServiceUploadResult {
  /** Storage path on the server */
  path: string;
  /** Original filename */
  filename: string;
  /** File size (bytes) */
  size: number;
}
```
