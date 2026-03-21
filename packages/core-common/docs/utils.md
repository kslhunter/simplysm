# Utilities

Utility namespaces and directly exported functions.

Source: `src/utils/*.ts`

---

## Namespace: `obj`

Object manipulation utilities. Source: `src/utils/obj.ts`

### `obj.clone`

Deep clone. Supports circular references and custom types (DateTime, DateOnly, Time, Uuid, Uint8Array, Error, Map, Set, RegExp). Functions and Symbols maintain references. Prototype chain is maintained.

```typescript
export function clone<TObj>(source: TObj): TObj;
```

### `obj.equal`

Deep equality comparison. Supports DateTime, DateOnly, Time, Uuid, Date, RegExp, Map, Set, Array, and plain objects.

```typescript
export function equal(source: unknown, target: unknown, options?: EqualOptions): boolean;

export interface EqualOptions {
  topLevelIncludes?: string[];
  topLevelExcludes?: string[];
  ignoreArrayIndex?: boolean;
  shallow?: boolean;
}
```

### `obj.merge`

Deep merge (merge target into source as base). Returns a new object without modifying originals.

```typescript
export function merge<TSource, TMergeTarget>(
  source: TSource,
  target: TMergeTarget,
  opt?: MergeOptions,
): TSource & TMergeTarget;

export interface MergeOptions {
  arrayProcess?: "replace" | "concat";
  useDelTargetNull?: boolean;
}
```

### `obj.merge3`

3-way merge. Compares source, origin, and target to produce a merged result with conflict detection.

```typescript
export function merge3<
  S extends Record<string, unknown>,
  O extends Record<string, unknown>,
  T extends Record<string, unknown>,
>(
  source: S,
  origin: O,
  target: T,
  optionsObj?: Record<string, Merge3KeyOptions>,
): { conflict: boolean; result: O & S & T };

export interface Merge3KeyOptions {
  keys?: string[];
  excludes?: string[];
  ignoreArrayIndex?: boolean;
}
```

### `obj.omit`

Exclude specific keys from object.

```typescript
export function omit<T extends Record<string, unknown>, K extends keyof T>(item: T, omitKeys: K[]): Omit<T, K>;
```

### `obj.omitByFilter`

Exclude keys matching condition.

```typescript
export function omitByFilter<T extends Record<string, unknown>>(item: T, omitKeyFn: (key: keyof T) => boolean): T;
```

### `obj.pick`

Select specific keys from object.

```typescript
export function pick<T extends Record<string, unknown>, K extends keyof T>(item: T, pickKeys: K[]): Pick<T, K>;
```

### `obj.getChainValue`

Get value by chain path (e.g., `"a.b[0].c"`).

```typescript
export function getChainValue(obj: unknown, chain: string): unknown;
export function getChainValue(obj: unknown, chain: string, optional: true): unknown | undefined;
```

### `obj.getChainValueByDepth`

Descend by the same key for depth levels.

```typescript
export function getChainValueByDepth<TObject, TKey extends keyof TObject>(
  obj: TObject, key: TKey, depth: number,
): TObject[TKey];
export function getChainValueByDepth<TObject, TKey extends keyof TObject>(
  obj: TObject, key: TKey, depth: number, optional: true,
): TObject[TKey] | undefined;
```

### `obj.setChainValue`

Set value by chain path.

```typescript
export function setChainValue(obj: unknown, chain: string, value: unknown): void;
```

### `obj.deleteChainValue`

Delete value by chain path.

```typescript
export function deleteChainValue(obj: unknown, chain: string): void;
```

### `obj.clearUndefined`

Delete keys with `undefined` values from object. Mutates the original.

```typescript
export function clearUndefined<T extends object>(obj: T): T;
```

### `obj.clear`

Delete all keys from object. Mutates the original.

```typescript
export function clear<T extends Record<string, unknown>>(obj: T): Record<string, never>;
```

### `obj.nullToUndefined`

Convert `null` to `undefined` recursively. Mutates the original.

```typescript
export function nullToUndefined<TObject>(obj: TObject): TObject | undefined;
```

### `obj.unflatten`

Convert flattened object to nested object.

```typescript
export function unflatten(flatObj: Record<string, unknown>): Record<string, unknown>;
// Example: unflatten({ "a.b.c": 1 }) => { a: { b: { c: 1 } } }
```

### `obj.keys`

Type-safe `Object.keys`.

```typescript
export function keys<T extends object>(obj: T): (keyof T)[];
```

### `obj.entries`

Type-safe `Object.entries`.

```typescript
export function entries<T extends object>(obj: T): { [K in keyof T]: [K, T[K]] }[keyof T][];
```

### `obj.fromEntries`

Type-safe `Object.fromEntries`.

```typescript
export function fromEntries<T extends [string, unknown]>(entryPairs: T[]): { [K in T[0]]: T[1] };
```

### `obj.map`

Transform each entry of object and return new object.

```typescript
export function map<TSource extends object, TNewKey extends string, TNewValue>(
  obj: TSource,
  fn: (key: keyof TSource, value: TSource[keyof TSource]) => [TNewKey | null, TNewValue],
): Record<TNewKey | Extract<keyof TSource, string>, TNewValue>;
```

### Type utilities from `obj`

```typescript
export type UndefToOptional<TObject> = { /* undefined props become optional */ };
export type OptionalToUndef<TObject> = { /* optional props become required + undefined */ };
```

---

## Namespace: `str`

String utility functions. Source: `src/utils/str.ts`

### `str.getKoreanSuffix`

Return the appropriate Korean particle based on the final consonant (jongseong).

```typescript
export function getKoreanSuffix(
  text: string,
  type: "을" | "은" | "이" | "와" | "랑" | "로" | "라",
): string;
```

### `str.replaceFullWidth`

Convert full-width characters to half-width (A-Z, a-z, 0-9, space, parentheses).

```typescript
export function replaceFullWidth(str: string): string;
```

### `str.toPascalCase`

```typescript
export function toPascalCase(str: string): string;
// "hello-world" -> "HelloWorld"
```

### `str.toCamelCase`

```typescript
export function toCamelCase(str: string): string;
// "hello-world" -> "helloWorld"
```

### `str.toKebabCase`

```typescript
export function toKebabCase(str: string): string;
// "HelloWorld" -> "hello-world"
```

### `str.toSnakeCase`

```typescript
export function toSnakeCase(str: string): string;
// "HelloWorld" -> "hello_world"
```

### `str.isNullOrEmpty`

Check if string is `undefined`, `null`, or empty (type guard).

```typescript
export function isNullOrEmpty(str: string | undefined): str is "" | undefined;
```

### `str.insert`

Insert a string at a specific position.

```typescript
export function insert(str: string, index: number, insertString: string): string;
```

---

## Namespace: `num`

Number utility functions. Source: `src/utils/num.ts`

### `num.parseInt`

Parse string to integer. Removes non-numeric characters before parsing.

```typescript
export function parseInt(text: unknown): number | undefined;
```

### `num.parseRoundedInt`

Parse string to float, then round and return integer.

```typescript
export function parseRoundedInt(text: unknown): number | undefined;
```

### `num.parseFloat`

Parse string to float. Removes non-numeric characters before parsing.

```typescript
export function parseFloat(text: unknown): number | undefined;
```

### `num.isNullOrEmpty`

Check `undefined`, `null`, `0` (type guard).

```typescript
export function isNullOrEmpty(val: number | undefined): val is 0 | undefined;
```

### `num.format`

Format number to string with thousand separators.

```typescript
export function format(val: number, digit?: { max?: number; min?: number }): string;
export function format(val: number | undefined, digit?: { max?: number; min?: number }): string | undefined;
// num.format(1234.567, { max: 2 }) => "1,234.57"
// num.format(1234, { min: 2 })     => "1,234.00"
```

---

## Namespace: `bytes`

Uint8Array utility functions. Source: `src/utils/bytes.ts`

### `bytes.concat`

Concatenate multiple Uint8Arrays.

```typescript
export function concat(arrays: Bytes[]): Bytes;
```

### `bytes.toHex`

Convert to lowercase hex string.

```typescript
export function toHex(bytes: Bytes): string;
```

### `bytes.fromHex`

Convert from hex string to Uint8Array.

```typescript
export function fromHex(hex: string): Bytes;
```

### `bytes.toBase64`

Convert Bytes to base64 string.

```typescript
export function toBase64(bytes: Bytes): string;
```

### `bytes.fromBase64`

Convert base64 string to Bytes.

```typescript
export function fromBase64(base64: string): Bytes;
```

---

## Namespace: `path`

Path utility functions. Replacement for Node.js `path` module (supports browser environments). POSIX style paths only (slash `/`).

Source: `src/utils/path.ts`

### `path.join`

Combine paths.

```typescript
export function join(...segments: string[]): string;
```

### `path.basename`

Extract filename.

```typescript
export function basename(filePath: string, ext?: string): string;
```

### `path.extname`

Extract file extension. Hidden files (e.g., `.gitignore`) return empty string.

```typescript
export function extname(filePath: string): string;
```

---

## Namespace: `json`

JSON serialization/deserialization supporting custom types (DateTime, DateOnly, Time, Uuid, Set, Map, Error, Uint8Array).

Source: `src/utils/json.ts`

### `json.stringify`

Serialize object to JSON string. Supports custom types via `__type__` markers.

```typescript
export function stringify(
  obj: unknown,
  options?: {
    space?: string | number;
    replacer?: (key: string | undefined, value: unknown) => unknown;
    redactBytes?: boolean;
  },
): string;
```

### `json.parse`

Deserialize JSON string to object. Restores custom types from `__type__` markers. All JSON `null` values are converted to `undefined`.

```typescript
export function parse<TResult = unknown>(json: string): TResult;
```

---

## Namespace: `xml`

XML conversion utility using fast-xml-parser.

Source: `src/utils/xml.ts`

### `xml.parse`

Parse XML string into an object. Attributes grouped in `$`, text nodes in `_`, child elements as arrays.

```typescript
export function parse(str: string, options?: { stripTagPrefix?: boolean }): unknown;
```

### `xml.stringify`

Serialize object to XML string.

```typescript
export function stringify(obj: unknown, options?: XmlBuilderOptions): string;
```

---

## Namespace: `wait`

Wait utility functions. Source: `src/utils/wait.ts`

### `wait.until`

Wait until a condition becomes true.

```typescript
export async function until(
  forwarder: () => boolean | Promise<boolean>,
  milliseconds?: number,
  maxCount?: number,
): Promise<void>;
```

- `milliseconds`: Check interval (default: 100ms)
- `maxCount`: Maximum number of attempts (`undefined` for unlimited)
- Throws `TimeoutError` when maximum number of attempts is exceeded

### `wait.time`

Wait for a specified amount of time.

```typescript
export async function time(millisecond: number): Promise<void>;
```

---

## Namespace: `transfer`

Transferable conversion utility for Worker data transfer. Handles custom types that `structuredClone` does not support.

Source: `src/utils/transferable.ts`

### `transfer.encode`

Convert objects using Simplysm types to plain objects for Worker transfer.

```typescript
export function encode(obj: unknown): {
  result: unknown;
  transferList: Transferable[];
};
```

### `transfer.decode`

Convert serialized objects back to Simplysm types.

```typescript
export function decode(obj: unknown): unknown;
```

**Example:**

```typescript
const { result, transferList } = transfer.encode(data);
worker.postMessage(result, transferList);

// In worker:
const decoded = transfer.decode(event.data);
```

---

## Namespace: `err`

Error utility. Source: `src/utils/error.ts`

### `err.message`

Extract message from unknown type error.

```typescript
export function message(err: unknown): string;
```

---

## Namespace: `dt`

Date format utilities. Source: `src/utils/date-format.ts`

### `dt.normalizeMonth`

Normalize year/month/day when setting month. Adjusts year for out-of-range months, clamps day to last day of month.

```typescript
export function normalizeMonth(year: number, month: number, day: number): DtNormalizedMonth;

export interface DtNormalizedMonth {
  year: number;
  month: number;
  day: number;
}
```

### `dt.convert12To24`

Convert 12-hour format to 24-hour format.

```typescript
export function convert12To24(rawHour: number, isPM: boolean): number;
```

### `dt.format`

Convert date/time components to string according to format string. Supports C#-style format specifiers:

| Format | Description | Example |
|--------|-------------|---------|
| `yyyy` | 4-digit year | 2024 |
| `yy` | 2-digit year | 24 |
| `MM` | Zero-padded month | 01-12 |
| `M` | Month | 1-12 |
| `ddd` | Day of week (Korean) | 일, 월, 화, 수, 목, 금, 토 |
| `dd` | Zero-padded day | 01-31 |
| `d` | Day | 1-31 |
| `tt` | AM/PM | AM, PM |
| `hh` / `h` | 12-hour (zero-padded / plain) | 01-12 / 1-12 |
| `HH` / `H` | 24-hour (zero-padded / plain) | 00-23 / 0-23 |
| `mm` / `m` | Minute (zero-padded / plain) | 00-59 / 0-59 |
| `ss` / `s` | Second (zero-padded / plain) | 00-59 / 0-59 |
| `fff` / `ff` / `f` | Milliseconds (3/2/1 digits) | 000-999 |
| `zzz` / `zz` / `z` | Timezone offset | +09:00 / +09 / +9 |

```typescript
export function format(
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

---

## Namespace: `primitive`

Primitive type inference. Source: `src/utils/primitive.ts`

### `primitive.typeStr`

Infer `PrimitiveTypeStr` from a value at runtime.

```typescript
export function typeStr(value: PrimitiveTypeMap[PrimitiveTypeStr]): PrimitiveTypeStr;
// primitive.typeStr("hello")          => "string"
// primitive.typeStr(new DateTime())   => "DateTime"
// primitive.typeStr(new Uint8Array()) => "Bytes"
```

---

## Direct Exports: Template Tag Functions

Template string tag functions for IDE code highlighting support. Actual behavior is string concatenation with indent normalization (leading/trailing blank lines removed, common indentation stripped).

Source: `src/utils/template-strings.ts`

```typescript
export function js(strings: TemplateStringsArray, ...values: unknown[]): string;
export function ts(strings: TemplateStringsArray, ...values: unknown[]): string;
export function html(strings: TemplateStringsArray, ...values: unknown[]): string;
export function tsql(strings: TemplateStringsArray, ...values: unknown[]): string;
export function mysql(strings: TemplateStringsArray, ...values: unknown[]): string;
export function pgsql(strings: TemplateStringsArray, ...values: unknown[]): string;
```

**Example:**

```typescript
const query = tsql`
  SELECT TOP 10 *
  FROM Users
  WHERE Name LIKE '%${keyword}%'
`;
```

---

## Direct Export: `ZipArchive`

ZIP archive processing class. Handles reading, writing, compression, and decompression of ZIP files. Uses internal caching to prevent duplicate decompression. Supports `await using` (`Symbol.asyncDispose`).

Source: `src/utils/zip.ts`

```typescript
export class ZipArchive {
  /**
   * @param data ZIP data (omit to create a new archive)
   */
  constructor(data?: Blob | Bytes);

  /** Extract all files with optional progress callback */
  async extractAll(progressCallback?: (progress: ZipArchiveProgress) => void): Promise<Map<string, Bytes | undefined>>;

  /** Extract specific file */
  async get(fileName: string): Promise<Bytes | undefined>;

  /** Check if file exists */
  async exists(fileName: string): Promise<boolean>;

  /** Write file (store in cache) */
  write(fileName: string, bytes: Bytes): void;

  /** Compress cached files to ZIP */
  async compress(): Promise<Bytes>;

  /** Close reader and clear cache */
  async close(): Promise<void>;

  async [Symbol.asyncDispose](): Promise<void>;
}

export interface ZipArchiveProgress {
  fileName: string;
  totalSize: number;
  extractedSize: number;
}
```

**Example:**

```typescript
// Read
await using archive = new ZipArchive(zipBytes);
const content = await archive.get("file.txt");

// Create
await using archive = new ZipArchive();
archive.write("file.txt", textBytes);
const zipBytes = await archive.compress();
```
