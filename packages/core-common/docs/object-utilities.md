# Object Utilities

Imported as the `obj` namespace. Provides deep clone, equality, merge, object manipulation, and chain-path access.

```typescript
import { obj } from "@simplysm/core-common";
```

## clone

```typescript
function clone<T>(source: T): T;
```

Deep clone supporting circular references, custom types (`DateTime`, `DateOnly`, `Time`, `Uuid`, `Uint8Array`, `Error`, `RegExp`, `Map`, `Set`), and prototype chain preservation. Functions and Symbols maintain references.

---

## equal

```typescript
function equal(source: unknown, target: unknown, options?: EqualOptions): boolean;

interface EqualOptions {
  topLevelIncludes?: string[];
  topLevelExcludes?: string[];
  ignoreArrayIndex?: boolean;
  shallow?: boolean;
}
```

Deep equality comparison with support for custom types. Options allow filtering compared keys at top level, ignoring array order (O(n^2)), or doing shallow reference comparison.

---

## merge

```typescript
function merge<S, T>(source: S, target: T, opt?: MergeOptions): S & T;

interface MergeOptions {
  arrayProcess?: "replace" | "concat";
  useDelTargetNull?: boolean;
}
```

Deep merge of target into source. Returns a new object (immutable). Arrays default to replacement; use `"concat"` for deduplication via Set. When `useDelTargetNull` is true, `null` in target deletes the key.

---

## merge3

```typescript
function merge3<S, O, T>(
  source: S,
  origin: O,
  target: T,
  optionsObj?: Record<string, Merge3KeyOptions>,
): { conflict: boolean; result: O & S & T };

interface Merge3KeyOptions {
  keys?: string[];
  excludes?: string[];
  ignoreArrayIndex?: boolean;
}
```

Three-way merge comparing source, origin, and target. Returns whether a conflict occurred and the merged result.

---

## omit / pick

```typescript
function omit<T, K extends keyof T>(item: T, omitKeys: K[]): Omit<T, K>;
function pick<T, K extends keyof T>(item: T, pickKeys: K[]): Pick<T, K>;
```

Create new objects by excluding or including specific keys.

---

## Chain Access

```typescript
function getChainValue(obj: unknown, chain: string): unknown;
function getChainValue(obj: unknown, chain: string, optional: true): unknown | undefined;
function setChainValue(obj: unknown, chain: string, value: unknown): void;
function deleteChainValue(obj: unknown, chain: string): void;
```

Get, set, or delete values using dot-bracket chain paths (e.g., `"a.b[0].c"`).

---

## keys / entries / fromEntries

```typescript
function keys<T extends object>(obj: T): (keyof T)[];
function entries<T extends object>(obj: T): [keyof T, T[keyof T]][];
function fromEntries<T extends [string, unknown]>(entries: T[]): { [K in T[0]]: T[1] };
```

Type-safe wrappers around `Object.keys`, `Object.entries`, and `Object.fromEntries`.

---

## map

```typescript
function map<S extends object, K extends string, V>(
  obj: S,
  fn: (key: keyof S, value: S[keyof S]) => [K | null, V],
): Record<K | Extract<keyof S, string>, V>;
```

Transforms each entry of an object. Return `[null, newValue]` to keep the original key, or `[newKey, newValue]` to rename.

---

## Type Utilities

```typescript
type UndefToOptional<T>; // { a: string; b: string | undefined } -> { a: string; b?: string | undefined }
type OptionalToUndef<T>; // { a: string; b?: string } -> { a: string; b: string | undefined }
```

---

## Usage Examples

```typescript
import { obj } from "@simplysm/core-common";

// Clone
const original = { a: 1, nested: { b: 2 } };
const copy = obj.clone(original);

// Equal
obj.equal({ a: 1 }, { a: 1 }); // true
obj.equal([1, 2], [2, 1], { ignoreArrayIndex: true }); // true

// Merge
obj.merge({ a: 1, b: 2 }, { b: 3, c: 4 }); // { a: 1, b: 3, c: 4 }

// 3-way merge
const { conflict, result } = obj.merge3(
  { a: 1, b: 2 },  // source
  { a: 1, b: 1 },  // origin
  { a: 2, b: 1 },  // target
);
// conflict: false, result: { a: 2, b: 2 }

// Omit / Pick
obj.omit({ name: "Alice", age: 30, email: "a@b.c" }, ["email"]);
// { name: "Alice", age: 30 }

// Chain access
const data = { a: { b: [{ c: 42 }] } };
obj.getChainValue(data, "a.b[0].c"); // 42
obj.setChainValue(data, "a.b[0].c", 99);

// Type-safe Object helpers
obj.keys({ x: 1, y: 2 }); // ["x", "y"] with type (keyof { x; y })[]
```
