# @simplysm/sd-core-common

Simplysm core common utilities: custom date/time types, UUID, extended built-in prototypes, error classes, decorators, object/string/number utilities, serialization, async queues, and zip support.

## Installation

```bash
npm install @simplysm/sd-core-common
```

> Importing from this package automatically applies `reflect-metadata` and prototype extensions to `Array`, `Map`, and `Set`.

---

## Decorators

### `NotifyPropertyChange`

A property decorator that calls `onPropertyChange` on the instance whenever the decorated property value changes. The class must implement `INotifyPropertyChange`.

```typescript
import { NotifyPropertyChange, INotifyPropertyChange } from "@simplysm/sd-core-common";

class MyModel implements INotifyPropertyChange {
  @NotifyPropertyChange()
  name = "";

  onPropertyChange<K extends keyof this>(key: K, oldVal: this[K], newVal: this[K]) {
    console.log(`${String(key)} changed from`, oldVal, "to", newVal);
  }
}
```

### `INotifyPropertyChange`

Interface that a class must implement when using `@NotifyPropertyChange`.

```typescript
interface INotifyPropertyChange {
  onPropertyChange<K extends keyof this>(
    propertyName: K,
    oldValue: this[K],
    newValue: this[K],
  ): void;
}
```

### `PropertyGetSetDecoratorBase`

Base function for building property decorators that intercept get/set operations. Used internally by `NotifyPropertyChange` and `PropertyValidate`.

```typescript
import {
  PropertyGetSetDecoratorBase,
  IPropertyGetSetDecoratorBaseParam,
} from "@simplysm/sd-core-common";

function MyDecorator(): TPropertyDecoratorReturn<any> {
  return PropertyGetSetDecoratorBase<any, any>({
    beforeSet: (target, key, oldVal, newVal) => {
      // transform or validate before setting; return new value or undefined
      return newVal;
    },
    afterSet: (target, key, oldVal, newVal) => {
      // side effects after setting
    },
    get: (target, key, value) => {
      // called before a get returns
    },
  });
}
```

**`IPropertyGetSetDecoratorBaseParam<O, K>`**

| Field       | Type                                          | Description                   |
| ----------- | --------------------------------------------- | ----------------------------- |
| `beforeSet` | `(target, key, old, new) => new \| undefined` | Transform/validate before set |
| `afterSet`  | `(target, key, old, new) => void`             | Side effect after set         |
| `get`       | `(target, key, value) => void`                | Called before get returns     |

### `PropertyValidate`

A property decorator that validates the incoming value using `ObjectUtils.validate` before it is stored. Throws if invalid.

```typescript
import { PropertyValidate } from "@simplysm/sd-core-common";

class MyForm {
  @PropertyValidate({ notnull: true, type: String })
  username = "";
}
```

```typescript
function PropertyValidate(
  def: TValidateDef<any>,
  replacer?: TPropertyValidateReplacer,
): TPropertyDecoratorReturn<any>;
```

- `def` — validation definition (see `TValidateDef` under ObjectUtils)
- `replacer` — optional function to transform the value before validation

**`TPropertyValidateReplacer`**: `(value: any) => any`

### `TClassDecoratorReturn<T>`

Utility type for the return type of a class decorator function.

```typescript
type TClassDecoratorReturn<T> = (classType: Type<T>) => void;
```

### `TPropertyDecoratorReturn<T, N>`

Utility type for the return type of a property decorator function.

```typescript
type TPropertyDecoratorReturn<T, N = string> = (
  target: T,
  propertyName: N,
  inputDescriptor?: PropertyDescriptor,
) => void;
```

---

## Errors

All error classes extend `SdError`, which itself extends `Error`.

### `SdError`

Base error class that supports chaining (wrapping an inner error) and correctly sets `name` and `stack`.

```typescript
import { SdError } from "@simplysm/sd-core-common";

// Wrap another error
try { ... } catch (err) {
  throw new SdError(err as Error, "high-level context message");
}

// Plain message(s)
throw new SdError("something went wrong", "additional context");
```

```typescript
class SdError extends Error {
  innerError?: Error;
  constructor(innerError: Error, ...messages: string[]);
  constructor(...messages: string[]);
}
```

When wrapping an `Error`, messages are joined in reverse with `=>` and the inner stack is appended.

### `ArgumentError`

Thrown when function arguments are invalid. Accepts an optional descriptive message and an argument object serialized as YAML.

```typescript
import { ArgumentError } from "@simplysm/sd-core-common";

throw new ArgumentError({ userId: 42 });
throw new ArgumentError("Custom message", { userId: 42 });
```

```typescript
class ArgumentError extends SdError {
  constructor(argObj: Record<string, any>);
  constructor(message: string, argObj: Record<string, any>);
}
```

### `NeverEntryError`

Thrown when code that should never be reached is actually reached. Useful as an exhaustiveness guard.

```typescript
import { NeverEntryError } from "@simplysm/sd-core-common";

throw new NeverEntryError();
throw new NeverEntryError("optional debug hint");
```

### `NotImplementError`

Thrown when a method or feature is not yet implemented.

```typescript
import { NotImplementError } from "@simplysm/sd-core-common";

throw new NotImplementError();
throw new NotImplementError("this method is a stub");
```

### `TimeoutError`

Thrown when a wait or polling operation exceeds the allowed time.

```typescript
import { TimeoutError } from "@simplysm/sd-core-common";

throw new TimeoutError();
throw new TimeoutError(5000);
throw new TimeoutError(5000, "waiting for DB connection");
```

```typescript
class TimeoutError extends SdError {
  constructor(millisecond?: number, message?: string);
}
```

---

## Array Extensions (global prototype)

Importing this package extends `Array.prototype` and `ReadonlyArray` with the following methods. No explicit import of individual methods is required after importing any symbol from this package.

### Read-only methods (return new arrays / values)

| Method                                             | Description                                                                                    |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `single(predicate?)`                               | Returns the single matching element. Throws if more than one match.                            |
| `first(predicate?)`                                | Returns the first matching element or `undefined`.                                             |
| `last(predicate?)`                                 | Returns the last matching element or `undefined`.                                              |
| `filterExists()`                                   | Filters out `null` and `undefined` values (`NonNullable<T>[]`).                                |
| `filterAsync(predicate)`                           | Async version of `filter`. Sequential.                                                         |
| `ofType(type)`                                     | Filters elements that are instances of the given type.                                         |
| `mapAsync(selector)`                               | Async version of `map`. Sequential.                                                            |
| `mapMany(selector?)`                               | Flattens one level (optionally maps first), removing nullish values.                           |
| `mapManyAsync(selector?)`                          | Async version of `mapMany`.                                                                    |
| `parallelAsync(fn)`                                | Runs async `fn` on all items in parallel (`Promise.all`).                                      |
| `groupBy(keySelector, valueSelector?)`             | Groups items into `{ key, values }` entries.                                                   |
| `toMap(keySelector, valueSelector?)`               | Converts to `Map`. Throws on duplicate keys.                                                   |
| `toMapAsync(keySelector, valueSelector?)`          | Async version of `toMap`.                                                                      |
| `toArrayMap(keySelector, valueSelector?)`          | Converts to `Map<K, T[]>` (multiple values per key).                                           |
| `toSetMap(keySelector, valueSelector?)`            | Converts to `Map<K, Set<T>>`.                                                                  |
| `toMapValues(keySelector, valueSelector)`          | Groups by key, then applies `valueSelector` to each group.                                     |
| `toObject(keySelector, valueSelector?)`            | Converts to `Record<string, T>`. Throws on duplicate keys.                                     |
| `toTree(keyProp, parentKeyProp)`                   | Converts flat list to nested tree (`ITreeArray<T>[]`).                                         |
| `distinct(matchAddress?)`                          | Returns deduplicated array. By default uses deep equality; pass `true` for reference equality. |
| `orderBy(selector?)`                               | Returns sorted copy (ascending). Supports `string`, `number`, `DateOnly`, `DateTime`, `Time`.  |
| `orderByDesc(selector?)`                           | Returns sorted copy (descending).                                                              |
| `diffs(target, options?)`                          | Returns a list of INSERT/UPDATE/DELETE diff records between source and target arrays.          |
| `oneWayDiffs(orgItems, keyPropNameOrFn, options?)` | Returns `create`/`update`/`same` diffs from the current array perspective.                     |
| `merge(target, options?)`                          | Merges target into source based on diffs; returns combined array.                              |
| `sum(selector?)`                                   | Sums numeric values (or projected values).                                                     |
| `min(selector?)`                                   | Returns the minimum `number` or `string` value.                                                |
| `max(selector?)`                                   | Returns the maximum `number` or `string` value.                                                |
| `shuffle()`                                        | Returns a new randomly shuffled copy.                                                          |

### Mutating methods (modify the array in place)

| Method                        | Description                                                       |
| ----------------------------- | ----------------------------------------------------------------- |
| `distinctThis(matchAddress?)` | Removes duplicates in-place. Returns `this`.                      |
| `orderByThis(selector?)`      | Sorts in-place ascending. Returns `this`.                         |
| `orderByDescThis(selector?)`  | Sorts in-place descending. Returns `this`.                        |
| `insert(index, ...items)`     | Inserts items at a given index. Returns `this`.                   |
| `remove(item \| selector)`    | Removes all matching items by value or predicate. Returns `this`. |
| `toggle(item)`                | Adds the item if absent, removes it if present. Returns `this`.   |
| `clear()`                     | Removes all items. Returns `this`.                                |

### Exported types

```typescript
import { TArrayDiffsResult, TArrayDiffs2Result, ITreeArray } from "@simplysm/sd-core-common";

type TArrayDiffsResult<T, P> =
  | { source: undefined; target: P } // INSERT
  | { source: T; target: undefined } // DELETE
  | { source: T; target: P }; // UPDATE

type TArrayDiffs2Result<T> =
  | { type: "create"; item: T; orgItem: undefined }
  | { type: "update"; item: T; orgItem: T }
  | { type: "same"; item: T; orgItem: T };

type ITreeArray<T> = T & { children: ITreeArray<T>[] };
```

---

## Map Extensions (global prototype)

Importing this package extends `Map.prototype`:

| Method                                     | Description                                                          |
| ------------------------------------------ | -------------------------------------------------------------------- |
| `getOrCreate(key, newValue \| newValueFn)` | Gets existing value or sets and returns `newValue` / `newValueFn()`. |
| `update(key, updateFn)`                    | Calls `updateFn(currentValue)` and stores the result.                |

---

## Set Extensions (global prototype)

Importing this package extends `Set.prototype`:

| Method                     | Description                                                                     |
| -------------------------- | ------------------------------------------------------------------------------- |
| `adds(...values)`          | Adds multiple values. Returns `this`.                                           |
| `toggle(value, addOrDel?)` | Toggles membership. Pass `"add"` or `"del"` to force direction. Returns `this`. |

---

## Template String Helpers

Tagged template functions that strip common leading indentation and remove blank first/last lines. Useful for embedding code snippets or SQL in source files.

```typescript
import { html, javascript, typescript, string, tsql, mysql } from "@simplysm/sd-core-common";

const query = tsql`
  SELECT *
  FROM Users
  WHERE Id = 1
`;
// => "SELECT *\nFROM Users\nWHERE Id = 1"
```

All six tags have the same signature:

```typescript
function html(strings: TemplateStringsArray, ...values: any[]): string;
function javascript(strings: TemplateStringsArray, ...values: any[]): string;
function typescript(strings: TemplateStringsArray, ...values: any[]): string;
function string(strings: TemplateStringsArray, ...values: any[]): string;
function tsql(strings: TemplateStringsArray, ...values: any[]): string;
function mysql(strings: TemplateStringsArray, ...values: any[]): string;
```

---

## Date/Time Types

### `DateOnly`

Represents a calendar date without time (yyyy-MM-dd).

```typescript
import { DateOnly } from "@simplysm/sd-core-common";

const today = new DateOnly();
const specific = new DateOnly(2024, 3, 15);
const fromTick = new DateOnly(Date.now());
const fromDate = new DateOnly(new Date());
const parsed = DateOnly.parse("2024-03-15"); // or "20240315"
```

**Constructors**

```typescript
new DateOnly()                              // current date
new DateOnly(year: number, month: number, day: number)
new DateOnly(tick: number)                  // milliseconds timestamp
new DateOnly(date: Date)
```

**Static methods**

| Method                                                                   | Description                                                |
| ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `DateOnly.parse(str)`                                                    | Parses `yyyy-MM-dd`, `yyyyMMdd`, or ISO 8601 date strings. |
| `DateOnly.getDateByYearWeekSeq(arg, weekStartDay?, minDaysInFirstWeek?)` | Returns the start date for a given year/week-sequence.     |

**Properties**

| Property      | Type              | Description                            |
| ------------- | ----------------- | -------------------------------------- |
| `date`        | `Date` (readonly) | Underlying `Date` object (time zeroed) |
| `year`        | `number`          | Full year (get/set)                    |
| `month`       | `number`          | Month 1–12 (get/set)                   |
| `day`         | `number`          | Day of month (get/set)                 |
| `tick`        | `number`          | Millisecond timestamp (get/set)        |
| `week`        | `number`          | Day of week 0–6 (Sun–Sat) (readonly)   |
| `isValidDate` | `boolean`         | `false` if the internal Date is NaN    |

**Instance methods**

| Method                                                              | Returns                       | Description                                                   |
| ------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------- |
| `setYear(year)`                                                     | `DateOnly`                    | New instance with year set                                    |
| `setMonth(month)`                                                   | `DateOnly`                    | New instance with month set (clamps day to last day of month) |
| `setDay(day)`                                                       | `DateOnly`                    | New instance with day set                                     |
| `addYears(n)`                                                       | `DateOnly`                    | New instance shifted by n years                               |
| `addMonths(n)`                                                      | `DateOnly`                    | New instance shifted by n months                              |
| `addDays(n)`                                                        | `DateOnly`                    | New instance shifted by n days                                |
| `toFormatString(format)`                                            | `string`                      | Format using C#-style format tokens                           |
| `toString()`                                                        | `string`                      | `"yyyy-MM-dd"`                                                |
| `getBaseYearMonthSeqForWeekSeq(weekStartDay?, minDaysInFirstWeek?)` | `{ year, monthSeq }`          | Base year/month for week-sequence calculation                 |
| `getWeekSeqStartDate(weekStartDay?, minDaysInFirstWeek?)`           | `DateOnly`                    | Start date of the week this date belongs to                   |
| `getWeekSeqOfYear(weekStartDay?, minDaysInFirstWeek?)`              | `{ year, weekSeq }`           | Year and week-of-year number (1-based)                        |
| `getWeekSeqOfMonth(weekStartDay?, minDaysInFirstWeek?)`             | `{ year, monthSeq, weekSeq }` | Year, month, and week-of-month number (1-based)               |

**Format tokens** (C# compatible): `yyyy`, `yy`, `MM`, `M`, `dd`, `d`, `ddd` (weekday name).

### `DateTime`

Represents a full date and time.

```typescript
import { DateTime } from "@simplysm/sd-core-common";

const now = new DateTime();
const specific = new DateTime(2024, 3, 15, 9, 30, 0, 0);
const fromTick = new DateTime(Date.now());
const fromDate = new DateTime(new Date());
const parsed = DateTime.parse("2024-03-15T09:30:00.000+09:00");
```

**Constructors**

```typescript
new DateTime()
new DateTime(year, month, day, hour?, minute?, second?, millisecond?)
new DateTime(tick: number)
new DateTime(date: Date)
```

**Static methods**

| Method                | Description                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| `DateTime.parse(str)` | Parses ISO 8601, `"yyyy-MM-dd HH:mm:ss"`, `"yyyyMMddHHmmss"`, `"yyyy-MM-dd 오전/오후 HH:mm:ss"` |

**Properties**: `year`, `month`, `day`, `hour`, `minute`, `second`, `millisecond`, `tick`, `week` (0–6), `timezoneOffsetMinutes` — all get/set except `week` and `timezoneOffsetMinutes`.

**Instance methods**: `setYear`, `setMonth`, `setDay`, `setHour`, `setMinute`, `setSecond`, `setMillisecond`, `addYears`, `addMonths`, `addDays`, `addHours`, `addMinutes`, `addSeconds`, `addMilliseconds`, `toFormatString(format)`, `toString()`.

- `toString()` returns `"yyyy-MM-ddTHH:mm:ss.fffzzz"`.
- `toFormatString` format tokens: all `DateOnly` tokens plus `HH`, `H`, `hh`, `h`, `mm`, `m`, `ss`, `s`, `fff`, `ff`, `f`, `zzz`, `zz`, `z`, `tt` (오전/오후).

### `Time`

Represents a time of day (HH:mm:ss.fff), wrapping at 24 hours.

```typescript
import { Time } from "@simplysm/sd-core-common";

const now = new Time();
const t = new Time(9, 30, 0, 0);
const fromTick = new Time(3600000);
const fromDate = new Time(new Date());
const parsed = Time.parse("09:30:00");
```

**Constructors**

```typescript
new Time()                                            // current time
new Time(hour, minute, second?, millisecond?)
new Time(tick: number)                                // milliseconds since midnight (mod 24h)
new Time(date: Date)
```

**Static methods**

| Method            | Description                                                                             |
| ----------------- | --------------------------------------------------------------------------------------- |
| `Time.parse(str)` | Parses `"HH:mm:ss"`, `"HH:mm:ss.fff"`, `"오전/오후 HH:mm:ss"`, or full DateTime strings |

**Properties**: `hour`, `minute`, `second`, `millisecond`, `tick` — all get/set.

**Instance methods**: `setHour`, `setMinute`, `setSecond`, `setMillisecond`, `addHours`, `addMinutes`, `addSeconds`, `addMilliseconds`, `toFormatString(format)`, `toString()`.

- `toString()` returns `"HH:mm:ss.fff"`.

---

## Type Utilities

### `TFlatType`

Union of "flat" (primitive/leaf) types used throughout the library to distinguish values that should not be recursively traversed.

```typescript
import { TFlatType } from "@simplysm/sd-core-common";

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

### `Type<T>`

Interface for constructor types (class references).

```typescript
import { Type } from "@simplysm/sd-core-common";

function create<T>(ctor: Type<T>): T {
  return new ctor();
}
```

```typescript
interface Type<T> extends Function {
  new (...args: any[]): T;
}
```

### `WrappedType<T>`

Maps primitive types to their wrapper object counterparts.

```typescript
import { WrappedType } from "@simplysm/sd-core-common";

type WrappedType<T> = T extends string
  ? String
  : T extends number
    ? Number
    : T extends boolean
      ? Boolean
      : T;
```

### `UnwrappedType<T>`

Maps wrapper object types back to their primitive counterparts.

```typescript
import { UnwrappedType } from "@simplysm/sd-core-common";

type UnwrappedType<T> = T extends String
  ? string
  : T extends Number
    ? number
    : T extends Boolean
      ? boolean
      : T;
```

### `DeepPartial<T>`

Recursively makes all properties optional, but leaves `TFlatType` properties unchanged.

```typescript
import { DeepPartial } from "@simplysm/sd-core-common";

type Config = { db: { host: string; port: number }; debug: boolean };
type PartialConfig = DeepPartial<Config>;
// => { db?: { host?: string; port?: number }; debug?: boolean }
```

### `Uuid`

A value-object wrapper around a UUID v4 string.

```typescript
import { Uuid } from "@simplysm/sd-core-common";

const id = Uuid.new(); // generate new UUID v4
const fromBuf = Uuid.fromBuffer(buf); // from 16-byte Buffer
console.log(id.toString()); // "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
const buf2 = id.toBuffer(); // Buffer (16 bytes)
```

```typescript
class Uuid {
  static new(): Uuid;
  static fromBuffer(buffer: Buffer): Uuid;
  constructor(uuid: string);
  toString(): string;
  toBuffer(): Buffer;
}
```

### `LazyGcMap<K, V>`

A `Map`-like container that automatically removes entries that have not been accessed within `expireTime` milliseconds. The GC timer only runs when the map is non-empty.

```typescript
import { LazyGcMap } from "@simplysm/sd-core-common";

const cache = new LazyGcMap<string, Buffer>({
  gcInterval: 10_000, // run GC every 10 s
  expireTime: 60_000, // expire entries not accessed for 60 s
  onExpire: async (key, value) => {
    /* cleanup */
  },
});

cache.set("file.txt", buf);
const v = cache.get("file.txt"); // resets last-access time
cache.getOrCreate("other.txt", () => Buffer.alloc(0));
```

```typescript
class LazyGcMap<K, V> {
  constructor(options: {
    gcInterval: number;
    expireTime: number;
    onExpire?: (key: K, value: V) => void | Promise<void>;
  });
  get size(): number;
  has(key: K): boolean;
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  delete(key: K): boolean;
  clear(): void;
  getOrCreate(key: K, factory: () => V): V;
  values(): IterableIterator<V>;
}
```

### `TreeMap<T>`

A nested `Map` structure that stores values under multi-level key paths.

```typescript
import { TreeMap } from "@simplysm/sd-core-common";

const m = new TreeMap<number>();
m.set(["a", "b", "c"], 42);
m.get(["a", "b", "c"]); // 42
m.getOrCreate(["a", "b", "d"], 0); // 0
m.clear();
```

```typescript
class TreeMap<T> {
  set(keys: any[], val: T): void;
  get(keys: any[]): T | undefined;
  getOrCreate(keys: any[], value: T): T;
  clear(): void;
}
```

---

## Utilities

### `CsvConvert`

Parses CSV / TSV text into a 2-D array of strings.

```typescript
import { CsvConvert } from "@simplysm/sd-core-common";

const rows = CsvConvert.parse(csvText, ",");
// => (string | undefined)[][]
```

```typescript
class CsvConvert {
  static parse(content: string, columnSplitter: string): (string | undefined)[][];
}
```

Throws if any row has a different column count from the first row.

### `DateTimeFormatUtils`

Low-level date/time formatting utility used by `DateOnly`, `DateTime`, and `Time`.

```typescript
import { DateTimeFormatUtils } from "@simplysm/sd-core-common";

const str = DateTimeFormatUtils.format("yyyy-MM-dd HH:mm:ss", {
  year: 2024,
  month: 3,
  day: 15,
  hour: 9,
  minute: 30,
  second: 0,
});
// => "2024-03-15 09:30:00"
```

```typescript
class DateTimeFormatUtils {
  static format(
    format: string,
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
}
```

**Supported tokens**: `yyyy`, `yy`, `MM`, `M`, `ddd` (weekday), `dd`, `d`, `tt` (오전/오후), `hh`, `h` (12-hour), `HH`, `H` (24-hour), `mm`, `m`, `ss`, `s`, `fff`, `ff`, `f`, `zzz`, `zz`, `z`.

### `FnUtils`

Parses a JavaScript function source to extract parameter names and return expression.

```typescript
import { FnUtils } from "@simplysm/sd-core-common";

const { params, returnContent } = FnUtils.parse((item: any) => item.name);
// params => ["item"]
// returnContent => "item.name"
```

```typescript
class FnUtils {
  static parse(fn: (...args: any[]) => any): { params: string[]; returnContent: string };
}
```

### `JsonConvert`

JSON serializer/deserializer with built-in support for `DateTime`, `DateOnly`, `Time`, `Uuid`, `Date`, `Map`, `Set`, `Buffer`, and `Error`.

```typescript
import { JsonConvert } from "@simplysm/sd-core-common";

const json = JsonConvert.stringify({ date: new DateOnly(2024, 3, 15) }, { space: 2 });
const obj = JsonConvert.parse<{ date: DateOnly }>(json);
obj.date instanceof DateOnly; // true
```

```typescript
class JsonConvert {
  static stringify(
    obj: any,
    options?: {
      space?: string | number;
      replacer?: (key: string | undefined, value: any) => any;
      hideBuffer?: boolean;
    },
  ): string;

  static parse<T = any>(json: string): T;
}
```

Serialized special types are stored as `{ __type__: "...", data: ... }` and automatically restored by `parse`.

### `MathUtils`

```typescript
import { MathUtils } from "@simplysm/sd-core-common";

const n = MathUtils.getRandomInt(1, 100); // integer in [1, 100)
```

```typescript
class MathUtils {
  static getRandomInt(min: number, max: number): number;
}
```

### `NetUtils`

HTTP download utility using the Fetch API.

```typescript
import { NetUtils } from "@simplysm/sd-core-common";

const buf = await NetUtils.downloadBufferAsync("https://example.com/file.zip", {
  progressCallback: ({ contentLength, receivedLength }) => {
    console.log(receivedLength, "/", contentLength);
  },
  signal: abortController.signal,
});
```

```typescript
abstract class NetUtils {
  static async downloadBufferAsync(
    url: string,
    options?: {
      progressCallback?: (progress: { contentLength: number; receivedLength: number }) => void;
      signal?: AbortSignal;
    },
  ): Promise<Buffer>;
}
```

### `NumberUtils`

```typescript
import { NumberUtils } from "@simplysm/sd-core-common";

NumberUtils.parseInt("1,234px"); // 1234
NumberUtils.parseFloat("3.14 kg"); // 3.14
NumberUtils.parseRoundedInt("3.7"); // 4
NumberUtils.isNullOrEmpty(0); // true
NumberUtils.isNullOrEmpty(null); // true
NumberUtils.format(1234567.89, { max: 2 }); // "1,234,567.89" (locale)
```

```typescript
class NumberUtils {
  static parseInt(text: any, radix?: number): number | undefined;
  static parseRoundedInt(text: any): number | undefined;
  static parseFloat(text: any): number | undefined;
  static isNullOrEmpty(val: number | null | undefined): val is 0 | undefined | null;
  static format(val: number, digit?: { max?: number; min?: number }): string;
  static format(
    val: number | undefined,
    digit?: { max?: number; min?: number },
  ): string | undefined;
}
```

### `ObjectUtils`

A broad collection of object manipulation utilities.

```typescript
import { ObjectUtils } from "@simplysm/sd-core-common";
```

#### `clone(source, options?)`

Deep-clones an object. Handles `Date`, `DateTime`, `DateOnly`, `Time`, `Uuid`, `Buffer`, `Array`, `Map`, and circular references.

```typescript
ObjectUtils.clone(source, {
  excludes?: string[];       // property names to skip
  useRefTypes?: any[];       // constructor types to reference instead of clone
  onlyOneDepth?: boolean;    // shallow clone (one level)
})
```

#### `merge(source, target, opt?)`

Recursively merges `target` into `source`. Properties absent in target are cloned from source.

```typescript
ObjectUtils.merge(source, target, {
  arrayProcess?: "replace" | "concat";
  useDelTargetNull?: boolean; // treat null in target as deletion
})
```

#### `merge3(source, origin, target, optionsObj?)`

Three-way merge for flat record objects. Returns `{ conflict: boolean; result }`.

#### `omit(item, omitKeys)`

Returns a new object without the specified keys.

```typescript
const r = ObjectUtils.omit({ a: 1, b: 2, c: 3 }, ["b"]); // { a: 1, c: 3 }
```

#### `omitByFilter(item, omitKeyFn)`

Returns a new object, excluding keys for which `omitKeyFn` returns `true`.

#### `pick(item, keys)`

Returns a new object with only the specified keys.

```typescript
const r = ObjectUtils.pick({ a: 1, b: 2, c: 3 }, ["a", "c"]); // { a: 1, c: 3 }
```

#### `pickByType(item, type)`

Returns a new object keeping only properties whose value type matches `type`.

#### `equal(source, target, options?)`

Deep equality check. Handles `Date`, `DateTime`, `DateOnly`, `Time`, `Array`, `Map`, and plain objects.

```typescript
ObjectUtils.equal(a, b, {
  includes?: string[];         // only compare these keys
  excludes?: string[];         // skip these keys
  ignoreArrayIndex?: boolean;  // array comparison regardless of order
  onlyOneDepth?: boolean;      // one-level comparison only
})
```

#### `validate(value, def)`

Validates a value against a definition. Returns `IValidateResult` if invalid, `undefined` if valid.

```typescript
const err = ObjectUtils.validate("", { notnull: true, type: String });
// err.invalidateDef => { notnull: true }
```

#### `validateObject(obj, def)`

Validates each property of an object using `validate`. Returns a map of invalid results.

#### `validateObjectWithThrow(displayName, obj, def)`

Same as `validateObject` but throws a descriptive `Error` if any property is invalid.

#### `validateArray(arr, def)`

Validates each item in an array. Returns array of `{ index, item, result }` for invalid items.

#### `validateArrayWithThrow(displayName, arr, def)`

Same as `validateArray` but throws.

#### `getChainValue(obj, chain, optional?)`

Reads a value from a dot/bracket-notation chain string.

```typescript
ObjectUtils.getChainValue({ a: { b: [1, 2] } }, "a.b[0]"); // 1
```

#### `setChainValue(obj, chain, value)`

Sets a value at a chain-notation path, creating intermediate objects as needed.

#### `deleteChainValue(obj, chain)`

Deletes the property at the given chain path.

#### `getChainValueByDepth(obj, key, depth, optional?)`

Traverses the same key `depth` times.

#### `clearUndefined(obj)`

Deletes all keys with `undefined` values from `obj`. Returns `obj`.

#### `clear(obj)`

Deletes all keys from `obj`. Returns `{}`.

#### `nullToUndefined(obj)`

Recursively converts `null` to `undefined` throughout an object or array. Skips date types.

#### `optToUndef(obj)`

Type-level helper: converts `TUndefToOptional<T>` back to `T` (identity at runtime).

#### `unflattenObject(flatObj)`

Converts a flat dot-notation record to a nested object.

```typescript
ObjectUtils.unflattenObject({ "a.b.c": 1 }); // { a: { b: { c: 1 } } }
```

**Exported types from ObjectUtils**

```typescript
type TValidateDef<T> = Type<WrappedType<T>> | Type<WrappedType<T>>[] | IValidateDef<T>;

interface IValidateDef<T> {
  type?: Type<WrappedType<T>> | Type<WrappedType<T>>[];
  notnull?: boolean;
  includes?: T[];
  displayValue?: boolean;
  validator?: (value: UnwrappedType<NonNullable<T>>) => boolean | string;
}

interface IValidateResult<T> {
  value: T;
  invalidateDef: IValidateDef<T> & { type?: Type<WrappedType<T>>[] };
  message?: string;
}

interface IValidateDefWithName<T> extends IValidateDef<T> {
  displayName: string;
}

type TValidateObjectDefWithName<T> = { [K in keyof T]?: IValidateDefWithName<T[K]> };

// Maps optional properties to undefined-union, and vice versa
type TUndefToOptional<T> = { [K in keyof T as undefined extends T[K] ? K : never]?: T[K] } & {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
};

type TOptionalToUndef<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? Exclude<T[K], undefined> | undefined : T[K];
};
```

### `SdAsyncFnDebounceQueue`

Runs an async function debounced: if `run` is called multiple times before the current execution finishes, only the last-queued function is executed after the delay.

```typescript
import { SdAsyncFnDebounceQueue } from "@simplysm/sd-core-common";

const queue = new SdAsyncFnDebounceQueue(300); // 300 ms delay
queue.on("error", (err) => console.error(err));

queue.run(async () => {
  await save();
});
```

```typescript
class SdAsyncFnDebounceQueue extends EventEmitter {
  constructor(delay?: number);
  run(fn: () => void | Promise<void>): void;
  on(event: "error", listener: (err: SdError) => void): this;
}
```

### `SdAsyncFnSerialQueue`

Executes queued async functions one after another (serial). Optionally waits `gap` milliseconds between executions.

```typescript
import { SdAsyncFnSerialQueue } from "@simplysm/sd-core-common";

const queue = new SdAsyncFnSerialQueue(50); // 50 ms gap between tasks
queue.on("error", (err) => console.error(err));

queue.run(async () => {
  await task1();
});
queue.run(async () => {
  await task2();
});
```

```typescript
class SdAsyncFnSerialQueue extends EventEmitter {
  constructor(gap?: number);
  run(fn: () => void | Promise<void>): void;
  on(event: "error", listener: (err: SdError) => void): this;
}
```

### `StringUtils`

```typescript
import { StringUtils } from "@simplysm/sd-core-common";

StringUtils.isNullOrEmpty(""); // true
StringUtils.isNullOrEmpty(null); // true
StringUtils.toPascalCase("my-value"); // "MyValue"
StringUtils.toCamelCase("MyValue"); // "myValue"
StringUtils.toKebabCase("MyValue"); // "my-value"
StringUtils.insert("hello", 2, "XX"); // "heXXllo"
StringUtils.replaceSpecialDefaultChar("Ａ１"); // "A1"
StringUtils.getSuffix("사과", "을"); // "을" or "를"
```

```typescript
class StringUtils {
  static isNullOrEmpty(str: string | null | undefined): str is "" | undefined | null;
  static toPascalCase(str: string): string;
  static toCamelCase(str: string): string;
  static toKebabCase(str: string): string;
  static insert(str: string, index: number, insertString: string): string;
  static replaceSpecialDefaultChar(str: string): string; // full-width → half-width
  static getSuffix(text: string, type: "을" | "은" | "이" | "와" | "랑" | "로" | "라"): string;
}
```

### `TransferableConvert`

Encodes/decodes objects for transfer via `worker_threads`, converting Simplysm custom types to plain structures that survive the structured-clone algorithm, while collecting `ArrayBuffer` references for the transfer list.

```typescript
import { TransferableConvert } from "@simplysm/sd-core-common";

// In the main thread:
const { result, transferList } = TransferableConvert.encode(payload);
worker.postMessage(result, transferList);

// In the worker:
worker.on("message", (msg) => {
  const decoded = TransferableConvert.decode(msg);
});
```

```typescript
abstract class TransferableConvert {
  static encode(obj: any): { result: any; transferList: Transferable[] };
  static decode(obj: any): any;
}
```

Handles: `Buffer`/`Uint8Array` (transferred), `DateTime`, `DateOnly`, `Time`, `Uuid`, `Error`, `Array`, `Map`, `Set`, and plain objects recursively.

### `Wait`

Promise-based waiting utilities.

```typescript
import { Wait } from "@simplysm/sd-core-common";

// Wait until a condition becomes true (polls every 100ms by default)
await Wait.until(() => isReady(), 100, 5000); // poll every 100ms, timeout after 5s

// Sleep
await Wait.time(500); // wait 500ms
```

```typescript
class Wait {
  static async until(
    forwarder: () => boolean | Promise<boolean>,
    milliseconds?: number, // poll interval (default: 100)
    timeout?: number, // throws TimeoutError after this many ms
  ): Promise<void>;

  static async time(millisecond: number): Promise<void>;
}
```

### `XmlConvert`

Parses and serializes XML using `fast-xml-parser`.

```typescript
import { XmlConvert } from "@simplysm/sd-core-common";

const obj = XmlConvert.parse(`<root><item id="1">text</item></root>`);
// Attributes are grouped under "$"
// obj.root[0].item[0].$.id === "1"
// obj.root[0].item[0]._ === "text"

const xml = XmlConvert.stringify(obj);

// Strip namespace prefixes from tag names
const obj2 = XmlConvert.parse(xmlWithNs, { stripTagPrefix: true });
```

```typescript
class XmlConvert {
  static parse(str: string, options?: { stripTagPrefix?: boolean }): any;
  static stringify(obj: any, options?: XmlBuilderOptions): string;
}
```

Convention: attributes are stored under the `"$"` key, text content under `"_"`, child elements are always arrays.

---

## Zip

### `SdZip`

Read and write ZIP archives. Uses `@zip.js/zip.js` internally.

```typescript
import { SdZip } from "@simplysm/sd-core-common";

// Read
const zip = new SdZip(buffer);
const fileMap = await zip.extractAllAsync(); // Map<string, Buffer | undefined>
const data = await zip.getAsync("readme.txt");
const exists = await zip.existsAsync("readme.txt");
await zip.closeAsync();

// Write
const zip2 = new SdZip();
zip2.write("hello.txt", Buffer.from("Hello"));
const compressed = await zip2.compressAsync(); // Buffer
```

```typescript
class SdZip {
  constructor(data?: Blob | Buffer);

  extractAllAsync(
    progressCallback?: (progress: {
      fileName: string;
      totalSize: number;
      extractedSize: number;
    }) => void,
  ): Promise<Map<string, Buffer | undefined>>;
  getAsync(fileName: string): Promise<Buffer | undefined>;
  existsAsync(fileName: string): Promise<boolean>;
  write(fileName: string, buffer: Buffer): void;
  compressAsync(): Promise<Buffer>;
  closeAsync(): Promise<void>;
}
```
