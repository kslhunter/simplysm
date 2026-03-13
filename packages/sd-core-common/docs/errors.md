# Errors

All custom error classes extend `SdError`, which itself extends the native `Error`.

## SdError

Base error class that supports **error chaining** (inner errors). When constructed with another `Error` as the first argument, the inner error's stack trace is appended.

### Constructors

```ts
new SdError(...messages: string[])
new SdError(innerError: Error, ...messages: string[])
```

Messages are joined with ` => ` in reverse order (outermost first).

### Properties

| Property | Type | Description |
|---|---|---|
| `innerError` | `Error \| undefined` | The wrapped inner error, if provided. |
| `name` | `string` | Set to the concrete class name (e.g., `"ArgumentError"`). |
| `stack` | `string` | Includes `---- inner error stack ----` section if an inner error exists. |

---

## ArgumentError

Thrown when function arguments are invalid.

### Constructors

```ts
new ArgumentError(argObj: Record<string, any>)
new ArgumentError(message: string, argObj: Record<string, any>)
```

The `argObj` is serialized as YAML and appended to the error message for easy debugging.

---

## NeverEntryError

Thrown when code reaches a point that should be logically unreachable. Useful as an exhaustiveness check or assertion.

### Constructor

```ts
new NeverEntryError(message?: string)
```

---

## NotImplementError

Thrown when a method or code path has not yet been implemented.

### Constructor

```ts
new NotImplementError(message?: string)
```

---

## TimeoutError

Thrown when a wait operation exceeds its timeout.

### Constructor

```ts
new TimeoutError(millisecond?: number, message?: string)
```

The `millisecond` value is included in the error message if provided.
