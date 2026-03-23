# Validation Types

Type definitions used by `ObjectUtils.validate*` methods and the `PropertyValidate` decorator. All types are exported from `@simplysm/sd-core-common`.

## TValidateDef\<T\>

The primary validation definition type. Can be specified in three forms:

```ts
type TValidateDef<T> = Type<WrappedType<T>> | Type<WrappedType<T>>[] | IValidateDef<T>;
```

| Form | Example | Description |
|------|---------|-------------|
| Single type constructor | `String` | Value must be an instance of this type. |
| Array of type constructors | `[String, Number]` | Value must be an instance of one of these types. |
| Full definition object | `{ type: String, notnull: true }` | Full validation configuration (see `IValidateDef`). |

## IValidateDef\<T\>

Full validation definition interface.

```ts
interface IValidateDef<T> {
  type?: Type<WrappedType<T>> | Type<WrappedType<T>>[];
  notnull?: boolean;
  includes?: T[];
  displayValue?: boolean;
  validator?: (value: UnwrappedType<NonNullable<T>>) => boolean | string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `Type<WrappedType<T>> \| Type<WrappedType<T>>[]` | Allowed type constructor(s). The value's `constructor` must match one of these. |
| `notnull` | `boolean` | If `true`, `undefined` values are rejected. If `false` or absent, `undefined` values pass validation without further checks. |
| `includes` | `T[]` | Whitelist of allowed values. The value must be in this array. |
| `displayValue` | `boolean` | If `true`, include the actual value in error display when validation fails (used by `validateObjectWithThrow` and `validateArrayWithThrow`). |
| `validator` | `(value: UnwrappedType<NonNullable<T>>) => boolean \| string` | Custom validator function. Return `true` to pass, `false` to fail with the default message, or a `string` to fail with a custom message. |

## IValidateResult\<T\>

Result returned by `ObjectUtils.validate()` when validation fails.

```ts
interface IValidateResult<T> {
  value: T;
  invalidateDef: IValidateDef<T> & {
    type?: Type<WrappedType<T>>[];
  };
  message?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `value` | `T` | The value that failed validation. |
| `invalidateDef` | `IValidateDef<T> & { type?: Type<WrappedType<T>>[] }` | The subset of the validation definition that the value violated. Only contains the rules that failed. |
| `message` | `string \| undefined` | Custom error message from the `validator` function, if it returned a string. |

## IValidateDefWithName\<T\>

Extended validation definition that includes a display name, used by `validateObjectWithThrow` and `validateArrayWithThrow` for human-readable error messages.

```ts
interface IValidateDefWithName<T> extends IValidateDef<T> {
  displayName: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `displayName` | `string` | Human-readable name for the field, used in error messages. |
| *(inherited)* | | All fields from `IValidateDef<T>`. |

## TValidateObjectDefWithName\<T\>

Object-level validation definition where each property has a named validation definition.

```ts
type TValidateObjectDefWithName<T> = { [K in keyof T]?: IValidateDefWithName<T[K]> };
```

Each key in `T` maps to an optional `IValidateDefWithName` for that property's type.

## TUndefToOptional\<T\>

Utility type that converts properties whose type includes `undefined` into optional properties.

```ts
type TUndefToOptional<T> = {
  [K in keyof T as undefined extends T[K] ? K : never]?: T[K];
} & {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
};
```

### Example

```ts
// Input
interface Input {
  name: string;
  age: number | undefined;
  email: string | undefined;
}

// TUndefToOptional<Input> is equivalent to:
interface Result {
  name: string;
  age?: number | undefined;
  email?: string | undefined;
}
```

## TOptionalToUndef\<T\>

Utility type that converts optional properties to required properties with explicit `undefined` in their union. Inverse of `TUndefToOptional`.

```ts
type TOptionalToUndef<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? Exclude<T[K], undefined> | undefined : T[K];
};
```

### Example

```ts
// Input
interface Input {
  name: string;
  age?: number;
}

// TOptionalToUndef<Input> is equivalent to:
interface Result {
  name: string;
  age: number | undefined;
}
```

## Usage Example

```ts
import { ObjectUtils, type TValidateDef, type IValidateDefWithName } from "@simplysm/sd-core-common";

// Simple type validation
const result = ObjectUtils.validate(42, Number);
// undefined (passes)

// Full definition
const result2 = ObjectUtils.validate("hello", {
  type: String,
  notnull: true,
  validator: (v) => v.length > 0 || "Must not be empty",
});

// Object validation with display names
interface User {
  name: string;
  age: number;
}

ObjectUtils.validateObjectWithThrow("User", user, {
  name: { displayName: "Name", type: String, notnull: true },
  age: { displayName: "Age", type: Number, notnull: true, validator: (v) => v > 0 || "Must be positive" },
});
```
