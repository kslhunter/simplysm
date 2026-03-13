# Utility Classes

## ObjectUtils

Comprehensive object manipulation utilities with awareness of Simplysm custom types (`DateTime`, `DateOnly`, `Time`, `Uuid`).

### Clone & Merge

| Method | Description |
|---|---|
| `clone(source, options?)` | Deep clone. Handles circular references, `Date`, `DateTime`, `DateOnly`, `Time`, `Uuid`, `Buffer`, `Array`, `Map`. Options: `excludes` (skip keys), `useRefTypes` (keep reference for given constructors), `onlyOneDepth` (shallow clone). |
| `merge(source, target, opt?)` | Deep merge `target` into a clone of `source`. Options: `arrayProcess` (`"replace"` or `"concat"`), `useDelTargetNull` (treat `null` in target as delete). |
| `merge3(source, origin, target, optionsObj?)` | Three-way merge. Returns `{ conflict: boolean, result }`. |

### Equality

| Method | Description |
|---|---|
| `equal(source, target, options?)` | Deep equality check. Supports `Date`, `DateTime`, `DateOnly`, `Time`, `Array`, `Map`, and plain objects. Options: `includes` (compare only these keys), `excludes` (skip keys), `ignoreArrayIndex` (order-independent array comparison), `onlyOneDepth` (shallow comparison). |

### Object Manipulation

| Method | Description |
|---|---|
| `omit(item, omitKeys)` | Return a new object without the specified keys. |
| `omitByFilter(item, omitKeyFn)` | Return a new object excluding keys where `omitKeyFn(key)` returns `true`. |
| `pick(item, keys)` | Return a new object with only the specified keys. |
| `pickByType(item, type)` | Return a new object with only properties matching the given type constructor. |
| `clearUndefined(obj)` | Delete all `undefined`-valued keys from the object (mutates). |
| `clear(obj)` | Delete all keys from the object (mutates). |
| `nullToUndefined(obj)` | Recursively convert all `null` values to `undefined`. |
| `optToUndef(obj)` | Type-level cast from optional-property style to explicit-undefined style. |
| `unflattenObject(flatObj)` | Convert a dot-notation flat object (`{ "a.b.c": 1 }`) into nested structure (`{ a: { b: { c: 1 } } }`). |

### Chain Value Access

| Method | Description |
|---|---|
| `getChainValue(obj, chain, optional?)` | Get a nested value using dot/bracket notation string. E.g., `getChainValue(obj, "a.b[0].c")`. |
| `getChainValueByDepth(obj, key, depth, optional?)` | Get a value by repeatedly accessing the same key `depth` times. |
| `setChainValue(obj, chain, value)` | Set a nested value using dot/bracket notation string. Creates intermediate objects as needed. |
| `deleteChainValue(obj, chain)` | Delete a nested value using dot/bracket notation string. |

### Validation

| Method | Description |
|---|---|
| `validate(value, def)` | Validate a single value against a `TValidateDef`. Returns `IValidateResult` on failure, `undefined` on success. |
| `validateObject(obj, def)` | Validate an object's properties. Returns a map of property-name to `IValidateResult`. |
| `validateObjectWithThrow(displayName, obj, def)` | Like `validateObject`, but throws a descriptive error on any failure. |
| `validateArray(arr, def)` | Validate each element in an array. Returns array of `{ index, item, result }` for failures. |
| `validateArrayWithThrow(displayName, arr, def)` | Like `validateArray`, but throws a descriptive error on any failure. |

### Validation Types

```ts
// A validate definition can be a Type, array of Types, or a full definition object
type TValidateDef<T> = Type<WrappedType<T>> | Type<WrappedType<T>>[] | IValidateDef<T>;

interface IValidateDef<T> {
  type?: Type<WrappedType<T>> | Type<WrappedType<T>>[];  // allowed types
  notnull?: boolean;           // require non-undefined
  includes?: T[];              // allowed values whitelist
  displayValue?: boolean;      // include value in error display
  validator?: (value) => boolean | string;  // custom validator (return string for custom message)
}

interface IValidateResult<T> {
  value: T;
  invalidateDef: IValidateDef<T>;
  message?: string;
}
```

### Utility Types

```ts
// Convert undefined-able properties to optional
type TUndefToOptional<T> = { [K in ...]: T[K] } & { [K in ...]+?: T[K] };

// Inverse: convert optional properties to explicitly include undefined
type TOptionalToUndef<T> = { [K in keyof T]-?: ... };
```

---

## StringUtils

| Method | Description |
|---|---|
| `isNullOrEmpty(str)` | Type guard: returns `true` if `str` is `null`, `undefined`, or `""`. |
| `toPascalCase(str)` | Convert kebab-case or dot-case to `PascalCase`. |
| `toCamelCase(str)` | Convert kebab-case or dot-case to `camelCase`. |
| `toKebabCase(str)` | Convert PascalCase or camelCase to `kebab-case`. |
| `getSuffix(text, type)` | Get the correct Korean particle suffix (e.g., `"을"/"를"`, `"은"/"는"`) based on whether the last character has a trailing consonant. |
| `replaceSpecialDefaultChar(str)` | Convert fullwidth characters (e.g., `A` -> `A`, `1` -> `1`) to their ASCII equivalents. |
| `insert(str, index, insertString)` | Insert a substring at the given index. |

---

## NumberUtils

| Method | Description |
|---|---|
| `parseInt(text, radix?)` | Parse integer from any input. Strips non-numeric characters. Returns `undefined` on failure. |
| `parseRoundedInt(text)` | Parse as float then round to nearest integer. |
| `parseFloat(text)` | Parse float from any input. Strips non-numeric characters. Returns `undefined` on failure. |
| `isNullOrEmpty(val)` | Type guard: returns `true` if `val` is `null`, `undefined`, or `0`. |
| `format(val, digit?)` | Format number with locale-aware thousand separators. Options: `max` (max fraction digits), `min` (min fraction digits). |

---

## MathUtils

| Method | Description |
|---|---|
| `getRandomInt(min, max)` | Generate a random integer in `[min, max)`. |

---

## FnUtils

| Method | Description |
|---|---|
| `parse(fn)` | Parse a function's source code to extract parameter names and the return expression string. Works with `function` declarations and arrow functions. Returns `{ params: string[], returnContent: string }`. |

---

## Wait

| Method | Description |
|---|---|
| `Wait.until(forwarder, milliseconds?, timeout?)` | Poll `forwarder()` at intervals until it returns `true`. Throws `TimeoutError` if `timeout` is exceeded. Default interval: 100ms. |
| `Wait.time(millisecond)` | Sleep for the given number of milliseconds. |
