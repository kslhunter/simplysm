# Errors

All error classes extend `SdError`, which extends the native `Error`.

## `SdError`

Tree-structured error class. Supports cause chaining via the ES2024 `cause` property. Messages are joined in reverse order with ` => ` separator.

```typescript
class SdError extends Error {
  override cause?: Error;

  constructor(cause: Error, ...messages: string[]);
  constructor(...messages: string[]);
}
```

| Constructor Overload | Description |
|----------------------|-------------|
| `new SdError(cause, ...messages)` | Wrap a cause error. Final message: `"outermost => ... => cause.message"` |
| `new SdError(...messages)` | Messages only. Final message: `"outermost => ... => innermost"` |

The cause chain stack trace is appended to the current stack under a `---- cause stack ----` separator.

## `ArgumentError`

Invalid argument error. Extends `SdError`. Formats the argument object as YAML in the error message for debugging.

```typescript
class ArgumentError extends SdError {
  constructor(argObj: Record<string, unknown>);
  constructor(message: string, argObj: Record<string, unknown>);
}
```

| Constructor Overload | Description |
|----------------------|-------------|
| `new ArgumentError(argObj)` | Default message + YAML dump of arguments |
| `new ArgumentError(message, argObj)` | Custom message + YAML dump of arguments |

## `NotImplementedError`

Unimplemented feature error. Extends `SdError`. Use for abstract method stubs or future branches.

```typescript
class NotImplementedError extends SdError {
  constructor(message?: string);
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `message` | `string \| undefined` | Optional description of what is not implemented |

## `TimeoutError`

Timeout exceeded error. Extends `SdError`. Thrown by `wait.until()` when max retry count is exceeded.

```typescript
class TimeoutError extends SdError {
  constructor(count?: number, message?: string);
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `count` | `number \| undefined` | Number of attempts made before timeout |
| `message` | `string \| undefined` | Additional context message |
