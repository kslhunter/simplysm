# JSON Utilities

Imported as the `json` namespace. JSON serialization/deserialization with full support for custom types.

```typescript
import { json } from "@simplysm/core-common";
```

## stringify

```typescript
function stringify(obj: unknown, options?: {
  space?: string | number;
  replacer?: (key: string | undefined, value: unknown) => unknown;
  redactBytes?: boolean;
}): string;
```

Serializes an object to JSON string with custom type support. Special types are encoded as `{ __type__: "TypeName", data: ... }`.

**Supported types:** `Date`, `DateTime`, `DateOnly`, `Time`, `Uuid`, `Set`, `Map`, `Error`, `Uint8Array`.

- `redactBytes` replaces `Uint8Array` contents with `"__hidden__"` (for logging).
- Objects with `toJSON()` are honored (except built-in special types).
- Throws `TypeError` on circular references.

---

## parse

```typescript
function parse<T = unknown>(json: string): T;
```

Deserializes a JSON string, restoring all custom types from `__type__` markers. All JSON `null` values are converted to `undefined` (simplysm framework convention).

---

## Usage Examples

```typescript
import { json, DateTime, Uuid } from "@simplysm/core-common";

const data = {
  id: Uuid.generate(),
  createdAt: new DateTime(2025, 1, 15),
  tags: new Set(["a", "b"]),
  meta: new Map([["key", "value"]]),
};

const str = json.stringify(data, { space: 2 });
const restored = json.parse(str);
// restored.id is Uuid, restored.createdAt is DateTime, etc.

// Redact binary data for logging
json.stringify({ file: new Uint8Array([1, 2, 3]) }, { redactBytes: true });
```
