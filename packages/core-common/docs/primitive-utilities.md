# Primitive Utilities

Imported as the `primitive` namespace. Runtime type-string inference.

```typescript
import { primitive } from "@simplysm/core-common";
```

## typeStr

```typescript
function typeStr(value: PrimitiveTypeMap[PrimitiveTypeStr]): PrimitiveTypeStr;
```

Infers the `PrimitiveTypeStr` from a runtime value. Throws `ArgumentError` if the type is not supported.

**Mapping:**
- `string` -> `"string"`
- `number` -> `"number"`
- `boolean` -> `"boolean"`
- `DateTime` -> `"DateTime"`
- `DateOnly` -> `"DateOnly"`
- `Time` -> `"Time"`
- `Uuid` -> `"Uuid"`
- `Uint8Array` -> `"Bytes"`

---

## Usage Examples

```typescript
import { primitive, DateTime, Uuid } from "@simplysm/core-common";

primitive.typeStr("hello");           // "string"
primitive.typeStr(123);               // "number"
primitive.typeStr(true);              // "boolean"
primitive.typeStr(new DateTime());    // "DateTime"
primitive.typeStr(Uuid.generate());   // "Uuid"
primitive.typeStr(new Uint8Array());  // "Bytes"
```
