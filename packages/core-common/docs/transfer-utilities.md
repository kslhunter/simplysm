# Transfer Utilities

Imported as the `transfer` namespace. Serialization/deserialization for Worker data transfer.

```typescript
import { transfer } from "@simplysm/core-common";
```

## encode

```typescript
function encode(obj: unknown): {
  result: unknown;
  transferList: Transferable[];
};
```

Converts objects with custom types into plain objects suitable for `postMessage`. Returns the encoded result and a list of transferable `ArrayBuffer` objects for zero-copy transfer. Throws `TypeError` on circular references (with path info).

**Supported types:** `Date`, `DateTime`, `DateOnly`, `Time`, `Uuid`, `RegExp`, `Error`, `Uint8Array`, `Array`, `Map`, `Set`, plain objects.

---

## decode

```typescript
function decode(obj: unknown): unknown;
```

Restores tagged objects (with `__type__` markers) back to their original custom types. Use this on the receiving side of Worker messages.

---

## Usage Examples

```typescript
import { transfer, DateTime, Uuid } from "@simplysm/core-common";

// Sending data to Worker
const data = {
  id: Uuid.generate(),
  timestamp: new DateTime(),
  buffer: new Uint8Array([1, 2, 3]),
};
const { result, transferList } = transfer.encode(data);
worker.postMessage(result, transferList);

// Receiving data from Worker
worker.onmessage = (event) => {
  const decoded = transfer.decode(event.data);
  // decoded.id is Uuid, decoded.timestamp is DateTime, etc.
};
```
