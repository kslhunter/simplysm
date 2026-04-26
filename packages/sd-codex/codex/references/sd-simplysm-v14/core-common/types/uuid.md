# `Uuid`

> **읽어야 하는 상황**: UUID v4를 생성하거나 문자열/바이트에서 UUID를 복원할 때.

UUID v4 클래스. `crypto.getRandomValues` 기반으로 암호학적으로 안전한 UUID를 생성한다 (Chrome 37+, Node.js 호환).

```typescript
export class Uuid {
  constructor(uuid: string);

  static generate(): Uuid;
  static fromBytes(bytes: Bytes): Uuid;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `generate` | static | `() => Uuid` | 새 UUID v4 인스턴스 생성 |
| `fromBytes` | static | `(bytes: Bytes) => Uuid` | 16바이트 `Uint8Array`로 UUID 생성. 바이트 크기가 16이 아니면 `ArgumentError` 발생 |
| `toString` | method | `() => string` | UUID 문자열 반환 (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`) |
| `toBytes` | method | `() => Bytes` | UUID를 16바이트 `Uint8Array`로 변환 |

## Related Types

### `Bytes`

`Uint8Array` 별칭. [`Bytes`](../type-utils/common-types.md) 참조.

## Usage

```typescript
import { Uuid } from "@simplysm/core-common";

const id = Uuid.generate();
const fromStr = new Uuid("550e8400-e29b-41d4-a716-446655440000");

console.log(id.toString()); // "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

const bytes = id.toBytes(); // Uint8Array(16)
const restored = Uuid.fromBytes(bytes);
```
