# Type Utilities

Type aliases and utility types used across the framework.

## Type\<T\>

Constructor type interface used throughout the framework to represent a class/constructor.

```ts
interface Type<T> extends Function {
  new (...args: any[]): T;
}
```

### Example

```ts
function createInstance<T>(ctor: Type<T>): T {
  return new ctor();
}
```

## TFlatType

Union of all "flat" (non-nested, leaf) types recognized by the framework. Used as boundary conditions for recursive type operations like `DeepPartial`.

```ts
type TFlatType =
  | undefined
  | number
  | string
  | boolean
  | Number
  | String
  | Boolean
  | DateOnly
  | DateTime
  | Time
  | Uuid
  | Buffer;
```

## DeepPartial\<T\>

Recursively makes all properties optional. Flat types (`TFlatType`) are kept as-is without recursion.

```ts
type DeepPartial<T> = Partial<{
  [K in keyof T]: T[K] extends TFlatType ? T[K] : DeepPartial<T[K]>;
}>;
```

### Example

```ts
interface Config {
  server: {
    host: string;
    port: number;
    ssl: {
      cert: string;
      key: string;
    };
  };
}

// All nested properties become optional
const partial: DeepPartial<Config> = {
  server: { port: 8080 },
};
```

## Uuid

UUID v4 generator and container. Uses `crypto.getRandomValues()` when available, with a `Math.random()` fallback.

### Static Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `new` | `static new(): Uuid` | Generate a new v4 UUID using `crypto.getRandomValues()`. Falls back to `Math.random()`. |
| `fromBuffer` | `static fromBuffer(buffer: Buffer): Uuid` | Create a Uuid from a 16-byte `Buffer`. Throws if buffer length is not 16. |

### Constructor

```ts
new Uuid(uuid: string)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `uuid` | `string` | An existing UUID string to wrap. |

### Instance Methods

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `toString` | `toString()` | `string` | The UUID string (e.g., `"550e8400-e29b-41d4-a716-446655440000"`). |
| `toBuffer` | `toBuffer()` | `Buffer` | Convert to a 16-byte Buffer. |

### Example

```ts
import { Uuid } from "@simplysm/sd-core-common";

const id = Uuid.new();
console.log(id.toString()); // "550e8400-e29b-41d4-a716-446655440000"

const buf = id.toBuffer();
const restored = Uuid.fromBuffer(buf);
```

## WrappedType\<T\>

Type-level conversion from primitive types to their object wrapper types.

```ts
type WrappedType<T> = T extends string
  ? String
  : T extends number
    ? Number
    : T extends boolean
      ? Boolean
      : T;
```

| Input | Output |
|-------|--------|
| `string` | `String` |
| `number` | `Number` |
| `boolean` | `Boolean` |
| any other `T` | `T` (unchanged) |

## UnwrappedType\<T\>

Type-level conversion from object wrapper types to their primitive types. Inverse of `WrappedType`.

```ts
type UnwrappedType<T> = T extends String
  ? string
  : T extends Number
    ? number
    : T extends Boolean
      ? boolean
      : T;
```

| Input | Output |
|-------|--------|
| `String` | `string` |
| `Number` | `number` |
| `Boolean` | `boolean` |
| any other `T` | `T` (unchanged) |
