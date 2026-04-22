# primitive

원시 타입 변환 유틸리티 네임스페이스.

```typescript
import { primitive } from "@simplysm/core-common";
```

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `typeStr` | `(value: PrimitiveTypeMap[PrimitiveTypeStr]) => PrimitiveTypeStr` | 값으로부터 `PrimitiveTypeStr` 추론. 지원하지 않는 타입이면 `ArgumentError` 발생 |

## Usage

```typescript
import { primitive } from "@simplysm/core-common";

primitive.typeStr("hello");          // "string"
primitive.typeStr(123);              // "number"
primitive.typeStr(true);             // "boolean"
primitive.typeStr(new DateTime());   // "DateTime"
primitive.typeStr(new DateOnly());   // "DateOnly"
primitive.typeStr(new Time());       // "Time"
primitive.typeStr(Uuid.generate()); // "Uuid"
primitive.typeStr(new Uint8Array()); // "Bytes"
```
