# Byte Utilities

Imported as the `bytes` namespace. Provides `Uint8Array` manipulation utilities.

```typescript
import { bytes } from "@simplysm/core-common";
```

## concat

```typescript
function concat(arrays: Bytes[]): Bytes;
```

Concatenates multiple `Uint8Array` instances into a single new array.

---

## toHex / fromHex

```typescript
function toHex(bytes: Bytes): string;
function fromHex(hex: string): Bytes;
```

Converts between `Uint8Array` and lowercase hex strings. `fromHex` throws `ArgumentError` for odd-length strings or invalid hex characters.

---

## toBase64 / fromBase64

```typescript
function toBase64(bytes: Bytes): string;
function fromBase64(base64: string): Bytes;
```

Converts between `Uint8Array` and base64 strings. `fromBase64` throws `ArgumentError` for invalid characters or length.

---

## Usage Examples

```typescript
import { bytes } from "@simplysm/core-common";

const a = new Uint8Array([1, 2]);
const b = new Uint8Array([3, 4]);
bytes.concat([a, b]); // Uint8Array [1, 2, 3, 4]

bytes.toHex(new Uint8Array([255, 0, 127]));  // "ff007f"
bytes.fromHex("ff007f"); // Uint8Array [255, 0, 127]

bytes.toBase64(new Uint8Array([72, 101, 108, 108, 111])); // "SGVsbG8="
bytes.fromBase64("SGVsbG8="); // Uint8Array [72, 101, 108, 108, 111]
```
