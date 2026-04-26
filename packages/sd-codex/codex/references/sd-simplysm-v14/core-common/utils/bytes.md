# `bytes`

> **읽어야 하는 상황**: Uint8Array ↔ hex/base64 변환, 여러 Uint8Array 결합이 필요할 때.

`Uint8Array` 유틸리티 네임스페이스. 복잡한 변환 연산을 제공한다.

```typescript
import { bytes } from "@simplysm/core-common";
```

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `concat` | `(arrays: Bytes[]) => Bytes` | 여러 `Uint8Array` 결합 |
| `toHex` | `(bytes: Bytes) => string` | `Uint8Array`를 소문자 hex 문자열로 변환 |
| `fromHex` | `(hex: string) => Bytes` | hex 문자열을 `Uint8Array`로 변환. 홀수 길이이거나 유효하지 않은 문자가 있으면 `ArgumentError` |
| `toBase64` | `(bytes: Bytes) => string` | `Uint8Array`를 Base64 문자열로 변환 |
| `fromBase64` | `(base64: string) => Bytes` | Base64 문자열을 `Uint8Array`로 변환. 유효하지 않은 문자/길이이면 `ArgumentError` |

## Usage

```typescript
import { bytes } from "@simplysm/core-common";

// concat
const a = new Uint8Array([1, 2]);
const b = new Uint8Array([3, 4]);
bytes.concat([a, b]); // Uint8Array([1, 2, 3, 4])

// hex 변환
bytes.toHex(new Uint8Array([255, 0, 127])); // "ff007f"
bytes.fromHex("ff007f"); // Uint8Array([255, 0, 127])

// base64 변환
bytes.toBase64(new Uint8Array([72, 101, 108, 108, 111])); // "SGVsbG8="
bytes.fromBase64("SGVsbG8="); // Uint8Array([72, 101, 108, 108, 111])
```
