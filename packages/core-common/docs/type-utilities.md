# Type Utilities

Exported from `common.types.ts`.

## `Bytes`

Alias for `Uint8Array`. Used in place of Node.js `Buffer` throughout the framework.

```typescript
type Bytes = Uint8Array;
```

---

## `PrimitiveTypeMap`

Maps primitive type string keys to their TypeScript types. Shared with `orm-common`.

```typescript
type PrimitiveTypeMap = {
  string: string;
  number: number;
  boolean: boolean;
  DateTime: DateTime;
  DateOnly: DateOnly;
  Time: Time;
  Uuid: Uuid;
  Bytes: Bytes;
};
```

---

## `PrimitiveTypeStr`

Union of all primitive type name strings.

```typescript
type PrimitiveTypeStr = keyof PrimitiveTypeMap;
// "string" | "number" | "boolean" | "DateTime" | "DateOnly" | "Time" | "Uuid" | "Bytes"
```

---

## `PrimitiveType`

Union of all primitive type values, plus `undefined`.

```typescript
type PrimitiveType = PrimitiveTypeMap[PrimitiveTypeStr] | undefined;
```

---

## `DeepPartial<T>`

Recursively make all properties optional. Primitive types (string, number, boolean, DateTime, DateOnly, Time, Uuid, Bytes) are left as-is; only object/array types are recursively made partial.

```typescript
type DeepPartial<TObject> = Partial<{
  [K in keyof TObject]: TObject[K] extends PrimitiveType ? TObject[K] : DeepPartial<TObject[K]>;
}>;
```

---

## `Type<T>`

Constructor type interface. Represents a class constructor that produces instances of type `T`. Used for dependency injection, factory patterns, and `instanceof` checks.

```typescript
interface Type<TInstance> extends Function {
  new (...args: unknown[]): TInstance;
}
```
