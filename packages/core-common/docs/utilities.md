# Utility Namespaces

All utility namespaces are exported as `export * as name` from `index.ts`. Access them as `obj.clone(...)`, `str.toPascalCase(...)`, etc.

---

## `obj` -- Object Utilities

### `clone`

Deep clone with circular reference support and custom type handling (DateTime, DateOnly, Time, Uuid, Uint8Array, RegExp, Error, Map, Set). Prototype chains are preserved. Functions and Symbols are kept by reference.

```typescript
function clone<TObj>(source: TObj): TObj;
```

### `equal`

Deep equality comparison with extensive options.

```typescript
function equal(source: unknown, target: unknown, options?: EqualOptions): boolean;
```

```typescript
interface EqualOptions {
  topLevelIncludes?: string[];
  topLevelExcludes?: string[];
  ignoreArrayIndex?: boolean;
  shallow?: boolean;
}
```

| Option | Description |
|--------|-------------|
| `topLevelIncludes` | Only compare these keys (top-level object properties only) |
| `topLevelExcludes` | Exclude these keys from comparison (top-level only) |
| `ignoreArrayIndex` | Treat arrays as unordered sets (O(n^2)) |
| `shallow` | Only compare one level deep (reference comparison for nested values) |

Supports: Date, DateTime, DateOnly, Time, Uuid, RegExp, Array, Map, Set, plain objects.

### `merge`

Deep merge. Returns a new object (immutable). Source is the base, target values override.

```typescript
function merge<TSource, TMergeTarget>(
  source: TSource,
  target: TMergeTarget,
  opt?: MergeOptions,
): TSource & TMergeTarget;
```

```typescript
interface MergeOptions {
  arrayProcess?: "replace" | "concat";
  useDelTargetNull?: boolean;
}
```

| Option | Description |
|--------|-------------|
| `arrayProcess` | `"replace"` (default): target array replaces source. `"concat"`: merge arrays with Set-based dedup. |
| `useDelTargetNull` | If `true`, `null` in target deletes the key from the result. |

### `merge3`

Three-way merge for conflict detection. Compares source, origin (base), and target.

```typescript
function merge3<
  S extends Record<string, unknown>,
  O extends Record<string, unknown>,
  T extends Record<string, unknown>,
>(
  source: S,
  origin: O,
  target: T,
  optionsObj?: Record<string, Merge3KeyOptions>,
): { conflict: boolean; result: O & S & T };
```

```typescript
interface Merge3KeyOptions {
  keys?: string[];
  excludes?: string[];
  ignoreArrayIndex?: boolean;
}
```

Rules:
- source == origin, target differs -> use target
- target == origin, source differs -> use source
- source == target -> use that value
- all three differ -> conflict (origin value kept)

### `omit`

Create a new object with specified keys removed.

```typescript
function omit<T extends Record<string, unknown>, K extends keyof T>(
  item: T,
  omitKeys: K[],
): Omit<T, K>;
```

### `omitByFilter`

Create a new object with keys matching a predicate removed.

```typescript
function omitByFilter<T extends Record<string, unknown>>(
  item: T,
  omitKeyFn: (key: keyof T) => boolean,
): T;
```

### `pick`

Create a new object with only the specified keys.

```typescript
function pick<T extends Record<string, unknown>, K extends keyof T>(
  item: T,
  pickKeys: K[],
): Pick<T, K>;
```

### `getChainValue`

Get a nested value using a dot/bracket path string.

```typescript
function getChainValue(obj: unknown, chain: string): unknown;
function getChainValue(obj: unknown, chain: string, optional: true): unknown | undefined;
```

Path syntax: `"a.b[0].c"`, `"a['key'].b"`

### `getChainValueByDepth`

Descend into a nested object by repeatedly accessing the same key.

```typescript
function getChainValueByDepth<TObject, TKey extends keyof TObject>(
  obj: TObject,
  key: TKey,
  depth: number,
): TObject[TKey];
function getChainValueByDepth<TObject, TKey extends keyof TObject>(
  obj: TObject,
  key: TKey,
  depth: number,
  optional: true,
): TObject[TKey] | undefined;
```

### `setChainValue`

Set a nested value using a dot/bracket path string. Creates intermediate objects as needed.

```typescript
function setChainValue(obj: unknown, chain: string, value: unknown): void;
```

### `deleteChainValue`

Delete a nested value using a dot/bracket path string. Silently returns if intermediate path does not exist.

```typescript
function deleteChainValue(obj: unknown, chain: string): void;
```

### `clearUndefined`

Remove all keys with `undefined` values from an object. **Mutates** the original.

```typescript
function clearUndefined<T extends object>(obj: T): T;
```

### `clear`

Remove all keys from an object. **Mutates** the original.

```typescript
function clear<T extends Record<string, unknown>>(obj: T): Record<string, never>;
```

### `nullToUndefined`

Recursively convert all `null` values to `undefined`. **Mutates** arrays and objects in place. Handles circular references.

```typescript
function nullToUndefined<TObject>(obj: TObject): TObject | undefined;
```

### `unflatten`

Convert a flat object with dot-separated keys into a nested object.

```typescript
function unflatten(flatObj: Record<string, unknown>): Record<string, unknown>;
```

### `keys`

Type-safe `Object.keys`.

```typescript
function keys<T extends object>(obj: T): (keyof T)[];
```

### `entries`

Type-safe `Object.entries`.

```typescript
function entries<T extends object>(obj: T): { [K in keyof T]: [K, T[K]] }[keyof T][];
```

### `fromEntries`

Type-safe `Object.fromEntries`.

```typescript
function fromEntries<T extends [string, unknown]>(entryPairs: T[]): { [K in T[0]]: T[1] };
```

### `map`

Transform each entry of an object. Return `[null, newValue]` to keep the original key.

```typescript
function map<TSource extends object, TNewKey extends string, TNewValue>(
  obj: TSource,
  fn: (key: keyof TSource, value: TSource[keyof TSource]) => [TNewKey | null, TNewValue],
): Record<TNewKey | Extract<keyof TSource, string>, TNewValue>;
```

### Type Utilities (from obj namespace)

#### `UndefToOptional<T>`

Convert properties that include `undefined` in their type to optional properties.

```typescript
type UndefToOptional<TObject> = {
  [K in keyof TObject as undefined extends TObject[K] ? K : never]?: TObject[K];
} & { [K in keyof TObject as undefined extends TObject[K] ? never : K]: TObject[K] };
```

#### `OptionalToUndef<T>`

Convert optional properties to required properties with `| undefined`.

```typescript
type OptionalToUndef<TObject> = {
  [K in keyof TObject]-?: {} extends Pick<TObject, K> ? TObject[K] | undefined : TObject[K];
};
```

#### `EqualOptions`

See `equal` above.

#### `MergeOptions`

See `merge` above.

#### `Merge3KeyOptions`

See `merge3` above.

---

## `str` -- String Utilities

### `getKoreanSuffix`

Return the correct Korean particle (suffix) based on the final consonant of the preceding text.

```typescript
function getKoreanSuffix(
  text: string,
  type: "을" | "은" | "이" | "와" | "랑" | "로" | "라",
): string;
```

| Type | With final consonant | Without |
|------|---------------------|---------|
| `"을"` | 을 | 를 |
| `"은"` | 은 | 는 |
| `"이"` | 이 | 가 |
| `"와"` | 과 | 와 |
| `"랑"` | 이랑 | 랑 |
| `"로"` | 으로 | 로 |
| `"라"` | 이라 | 라 |

### `replaceFullWidth`

Convert full-width characters to half-width. Covers A-Z, a-z, 0-9, space, and parentheses.

```typescript
function replaceFullWidth(str: string): string;
```

### `toPascalCase`

Convert to PascalCase. Recognizes `-`, `_`, `.` as separators.

```typescript
function toPascalCase(str: string): string;
```

### `toCamelCase`

Convert to camelCase. Recognizes `-`, `_`, `.` as separators.

```typescript
function toCamelCase(str: string): string;
```

### `toKebabCase`

Convert to kebab-case. Inserts `-` before uppercase letters.

```typescript
function toKebabCase(str: string): string;
```

### `toSnakeCase`

Convert to snake_case. Inserts `_` before uppercase letters.

```typescript
function toSnakeCase(str: string): string;
```

### `isNullOrEmpty`

Type guard: returns `true` if the string is `undefined`, `null`, or `""`.

```typescript
function isNullOrEmpty(str: string | undefined): str is "" | undefined;
```

### `insert`

Insert a string at a specific index.

```typescript
function insert(str: string, index: number, insertString: string): string;
```

---

## `num` -- Number Utilities

### `parseInt`

Parse a value to integer. Non-numeric characters (except `0-9`, `-`, `.`) are stripped first. Returns `undefined` if unparseable.

```typescript
function parseInt(text: unknown): number | undefined;
```

### `parseFloat`

Parse a value to float. Non-numeric characters are stripped first.

```typescript
function parseFloat(text: unknown): number | undefined;
```

### `parseRoundedInt`

Parse to float then round to nearest integer.

```typescript
function parseRoundedInt(text: unknown): number | undefined;
```

### `isNullOrEmpty`

Type guard: returns `true` if the value is `undefined`, `null`, or `0`.

```typescript
function isNullOrEmpty(val: number | undefined): val is 0 | undefined;
```

### `format`

Format a number with thousand separators and optional decimal precision.

```typescript
function format(val: number, digit?: { max?: number; min?: number }): string;
function format(val: number | undefined, digit?: { max?: number; min?: number }): string | undefined;
```

| Option | Description |
|--------|-------------|
| `digit.max` | Maximum decimal places |
| `digit.min` | Minimum decimal places (pads with zeros) |

---

## `bytes` -- Uint8Array Utilities

### `concat`

Concatenate multiple `Uint8Array` into one.

```typescript
function concat(arrays: Bytes[]): Bytes;
```

### `toHex`

Convert `Uint8Array` to lowercase hex string.

```typescript
function toHex(bytes: Bytes): string;
```

### `fromHex`

Convert hex string to `Uint8Array`. Throws `ArgumentError` on odd length or invalid hex characters.

```typescript
function fromHex(hex: string): Bytes;
```

### `toBase64`

Convert `Uint8Array` to base64 string.

```typescript
function toBase64(bytes: Bytes): string;
```

### `fromBase64`

Convert base64 string to `Uint8Array`. Whitespace is stripped, padding is optional. Throws `ArgumentError` on invalid characters or length.

```typescript
function fromBase64(base64: string): Bytes;
```

---

## `path` -- Path Utilities

POSIX-style path utilities for browser environments. Only forward slashes (`/`) are supported. No backslash support.

### `join`

Join path segments with `/`.

```typescript
function join(...segments: string[]): string;
```

### `basename`

Extract the file name from a path. Optionally strip an extension.

```typescript
function basename(filePath: string, ext?: string): string;
```

### `extname`

Extract the file extension (including the dot). Hidden files (e.g., `.gitignore`) return `""`.

```typescript
function extname(filePath: string): string;
```

---

## `json` -- JSON Utilities

Custom JSON serialization/deserialization that preserves Simplysm types.

### `stringify`

Serialize an object to JSON string. Custom types are encoded as `{ __type__: "...", data: ... }`.

Supported types: Date, DateTime, DateOnly, Time, Uuid, Set, Map, Error, Uint8Array.

```typescript
function stringify(
  obj: unknown,
  options?: {
    space?: string | number;
    replacer?: (key: string | undefined, value: unknown) => unknown;
    redactBytes?: boolean;
  },
): string;
```

| Option | Description |
|--------|-------------|
| `space` | JSON indentation (number of spaces or string) |
| `replacer` | Custom replacer called before built-in type conversion |
| `redactBytes` | If `true`, Uint8Array contents are replaced with `"__hidden__"` (for logging). Cannot be parsed back. |

Circular references throw `TypeError`.

### `parse`

Deserialize a JSON string, restoring custom types. All JSON `null` values are converted to `undefined` (Simplysm null-free convention).

```typescript
function parse<TResult = unknown>(json: string): TResult;
```

In dev mode (`env.DEV`), parse errors include the full JSON string. In production, only the JSON length is included.

---

## `xml` -- XML Utilities

Built on `fast-xml-parser`.

### `parse`

Parse XML string to object.

```typescript
function parse(str: string, options?: { stripTagPrefix?: boolean }): unknown;
```

Output conventions:
- Attributes are grouped under `$`
- Text nodes are stored under `_`
- Child elements are wrapped in arrays (except root)

| Option | Description |
|--------|-------------|
| `stripTagPrefix` | Remove namespace prefixes from tag names (attributes are kept) |

### `stringify`

Serialize object to XML string.

```typescript
function stringify(obj: unknown, options?: XmlBuilderOptions): string;
```

---

## `wait` -- Async Wait Utilities

### `until`

Poll a condition function until it returns `true`.

```typescript
function until(
  forwarder: () => boolean | Promise<boolean>,
  milliseconds?: number,
  maxCount?: number,
): Promise<void>;
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `forwarder` | `() => boolean \| Promise<boolean>` | -- | Condition to check |
| `milliseconds` | `number` | `100` | Polling interval in ms |
| `maxCount` | `number \| undefined` | unlimited | Max attempts. Throws `TimeoutError` when exceeded. |

### `time`

Wait for a specified duration.

```typescript
function time(millisecond: number): Promise<void>;
```

---

## `transfer` -- Transferable Utilities

Serialize/deserialize objects for Worker `postMessage` with transferable support. Handles custom types that `structuredClone` does not support.

### `encode`

Convert an object to a Worker-transferable form. Returns the converted object and a list of `ArrayBuffer` transferables.

```typescript
function encode(obj: unknown): {
  result: unknown;
  transferList: ArrayBuffer[];
};
```

Supported types: Date, DateTime, DateOnly, Time, Uuid, RegExp, Error (with cause/code/detail), Uint8Array (zero-copy via transfer), Array, Map, Set, plain objects.

Throws `TypeError` on circular references (with path info).

### `decode`

Restore an object from its transferable form.

```typescript
function decode(obj: unknown): unknown;
```

---

## `err` -- Error Utilities

### `message`

Extract a message string from an unknown error value. Returns `err.message` for Error instances, `String(err)` otherwise.

```typescript
function message(err: unknown): string;
```

---

## `dt` -- Date Format Utilities

### `normalizeMonth`

Normalize year/month/day when month is outside 1-12 range. Adjusts year and clamps day to the target month's last day.

```typescript
function normalizeMonth(year: number, month: number, day: number): DtNormalizedMonth;
```

```typescript
interface DtNormalizedMonth {
  year: number;
  month: number;
  day: number;
}
```

### `convert12To24`

Convert 12-hour format to 24-hour format.

```typescript
function convert12To24(rawHour: number, isPM: boolean): number;
```

### `format`

Format date/time components using a C#-style format string.

```typescript
function format(
  formatString: string,
  args: {
    year?: number;
    month?: number;
    day?: number;
    hour?: number;
    minute?: number;
    second?: number;
    millisecond?: number;
    timezoneOffsetMinutes?: number;
  },
): string;
```

Supported format patterns:

| Pattern | Description | Example |
|---------|-------------|---------|
| `yyyy` | 4-digit year | 2024 |
| `yy` | 2-digit year | 24 |
| `MM` | Zero-padded month | 01-12 |
| `M` | Month | 1-12 |
| `ddd` | Day of week (Korean) | 일, 월, 화, 수, 목, 금, 토 |
| `dd` | Zero-padded day | 01-31 |
| `d` | Day | 1-31 |
| `tt` | AM/PM | AM, PM |
| `hh` | Zero-padded 12-hour | 01-12 |
| `h` | 12-hour | 1-12 |
| `HH` | Zero-padded 24-hour | 00-23 |
| `H` | 24-hour | 0-23 |
| `mm` | Zero-padded minute | 00-59 |
| `m` | Minute | 0-59 |
| `ss` | Zero-padded second | 00-59 |
| `s` | Second | 0-59 |
| `fff` | Millisecond (3 digits) | 000-999 |
| `ff` | Millisecond (2 digits) | 00-99 |
| `f` | Millisecond (1 digit) | 0-9 |
| `zzz` | Timezone offset (HH:mm) | +09:00 |
| `zz` | Timezone offset (HH) | +09 |
| `z` | Timezone offset (H) | +9 |

---

## `primitive` -- Primitive Type Utilities

### `typeStr`

Get the `PrimitiveTypeStr` for a runtime value.

```typescript
function typeStr(value: PrimitiveTypeMap[PrimitiveTypeStr]): PrimitiveTypeStr;
```

| Input Type | Returns |
|------------|---------|
| `string` | `"string"` |
| `number` | `"number"` |
| `boolean` | `"boolean"` |
| `DateTime` | `"DateTime"` |
| `DateOnly` | `"DateOnly"` |
| `Time` | `"Time"` |
| `Uuid` | `"Uuid"` |
| `Uint8Array` | `"Bytes"` |

Throws `ArgumentError` for unsupported types.
