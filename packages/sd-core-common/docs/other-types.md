# Other Types

## Uuid

UUID v4 generator and container. Uses `crypto.getRandomValues()` when available, with a `Math.random()` fallback.

### Static Methods

| Method | Description |
|---|---|
| `Uuid.new()` | Generate a new v4 UUID. |
| `Uuid.fromBuffer(buffer)` | Create a Uuid from a 16-byte `Buffer`. |

### Constructor

```ts
new Uuid(uuid: string)   // wrap an existing UUID string
```

### Instance Methods

| Method | Returns | Description |
|---|---|---|
| `toString()` | `string` | The UUID string (e.g., `"550e8400-e29b-41d4-a716-446655440000"`). |
| `toBuffer()` | `Buffer` | Convert to a 16-byte Buffer. |

---

## LazyGcMap

A `Map`-like structure with automatic garbage collection of expired entries. Entries that have not been accessed within `expireTime` are removed by a periodic GC timer that runs at `gcInterval`. The timer is lazy: it starts when the first entry is added and stops when the map becomes empty.

### Constructor

```ts
new LazyGcMap<K, V>(options: {
  gcInterval: number;                          // GC check interval (ms)
  expireTime: number;                          // Entry expiration time (ms)
  onExpire?: (key: K, value: V) => void | Promise<void>;  // Optional callback on expiry
})
```

### Methods

| Method | Returns | Description |
|---|---|---|
| `has(key)` | `boolean` | Check if key exists. |
| `get(key)` | `V \| undefined` | Get value (refreshes access time). |
| `set(key, value)` | `void` | Set value (starts GC timer if needed). |
| `delete(key)` | `boolean` | Delete entry (stops GC timer if map becomes empty). |
| `clear()` | `void` | Remove all entries and stop GC timer. |
| `getOrCreate(key, factory)` | `V` | Get existing or create via `factory()`. |
| `values()` | `IterableIterator<V>` | Iterate over values. |

### Properties

| Property | Type | Description |
|---|---|---|
| `size` | `number` | Number of entries. |

---

## TreeMap

A nested `Map` structure that uses a key array to navigate multiple levels of maps.

### Methods

| Method | Description |
|---|---|
| `set(keys, value)` | Set a value at the given key path. Intermediate Maps are created as needed. |
| `get(keys)` | Get a value at the given key path. Returns `undefined` if not found. |
| `getOrCreate(keys, value)` | Get existing or set and return the given value. |
| `clear()` | Clear the entire tree. |

### Example

```ts
import { TreeMap } from "@simplysm/sd-core-common";

const tree = new TreeMap<number>();
tree.set(["a", "b", "c"], 42);
tree.get(["a", "b", "c"]); // 42
```

---

## Template String Tags

Tagged template literal functions that auto-trim leading/trailing blank lines and remove common indentation. Useful for embedding multi-line code strings in TypeScript.

| Tag | Intended Use |
|---|---|
| `html` | HTML templates |
| `javascript` | JavaScript code |
| `typescript` | TypeScript code |
| `string` | General text |
| `tsql` | T-SQL queries |
| `mysql` | MySQL queries |

All tags produce the same runtime behavior -- they differ only in name for IDE syntax highlighting support.

### Example

```ts
import { html } from "@simplysm/sd-core-common";

const template = html`
  <div>
    <p>Hello</p>
  </div>
`;
// Result: "<div>\n  <p>Hello</p>\n</div>"
// (leading/trailing blank lines removed, common indent stripped)
```

---

## Type Aliases

### Type<T>

Constructor type used throughout the framework:

```ts
interface Type<T> extends Function {
  new (...args: any[]): T;
}
```

### TFlatType

Union of all "flat" (non-object) types recognized by the framework:

```ts
type TFlatType =
  | undefined | number | string | boolean
  | Number | String | Boolean
  | DateOnly | DateTime | Time | Uuid | Buffer;
```

### WrappedType / UnwrappedType

Type-level conversion between primitive and wrapper types:

```ts
// string -> String, number -> Number, boolean -> Boolean
type WrappedType<T> = T extends string ? String : T extends number ? Number : T extends boolean ? Boolean : T;

// String -> string, Number -> number, Boolean -> boolean
type UnwrappedType<T> = T extends String ? string : T extends Number ? number : T extends Boolean ? boolean : T;
```

### DeepPartial

Recursively makes all properties optional, but leaves flat types as-is:

```ts
type DeepPartial<T> = Partial<{
  [K in keyof T]: T[K] extends TFlatType ? T[K] : DeepPartial<T[K]>;
}>;
```

---

## SdZip

Async zip file reader/writer powered by `@zip.js/zip.js`. Supports reading from `Blob` or `Buffer`, extracting entries, writing new entries, and compressing back.

### Constructor

```ts
new SdZip(data?: Blob | Buffer)   // open existing zip, or create empty
```

### Methods

| Method | Returns | Description |
|---|---|---|
| `extractAllAsync(progressCallback?)` | `Promise<Map<string, Buffer>>` | Extract all files. The callback receives `{ fileName, totalSize, extractedSize }`. |
| `getAsync(fileName)` | `Promise<Buffer \| undefined>` | Extract a single file by name. |
| `existsAsync(fileName)` | `Promise<boolean>` | Check if a file exists in the archive. |
| `write(fileName, buffer)` | `void` | Add or overwrite a file in the in-memory cache. |
| `compressAsync()` | `Promise<Buffer>` | Compress all cached files into a new zip Buffer. |
| `closeAsync()` | `Promise<void>` | Close the underlying reader. |

### Example

```ts
import { SdZip } from "@simplysm/sd-core-common";

// Read
const zip = new SdZip(existingBuffer);
const readme = await zip.getAsync("README.md");

// Write
zip.write("new-file.txt", Buffer.from("hello"));
const output = await zip.compressAsync();
await zip.closeAsync();
```
