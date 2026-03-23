# Errors

Custom error classes that extend `SdError` for structured error hierarchies with support for inner error chaining.

## SdError

Base error class that supports tree-structured error chains via `innerError`. All other custom errors in this package extend `SdError`.

```ts
class SdError extends Error {
  innerError?: Error;

  constructor(innerError: Error, ...messages: string[]);
  constructor(...messages: string[]);
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `innerError` | `Error \| undefined` | The wrapped inner error, if provided. |
| `name` | `string` | Set to the concrete class name (e.g., `"ArgumentError"`). |
| `stack` | `string` | Includes `---- inner error stack ----` section when an inner error exists. |

### Constructors

| Signature | Description |
|-----------|-------------|
| `new SdError(...messages: string[])` | Creates an error with messages joined in reverse order using ` => `. |
| `new SdError(innerError: Error, ...messages: string[])` | Wraps an existing error. The inner error's message is prepended, and its stack trace is appended under `---- inner error stack ----`. |

### Example

```ts
import { SdError } from "@simplysm/sd-core-common";

try {
  throw new Error("low-level failure");
} catch (err) {
  throw new SdError(err, "high-level operation failed");
  // message: "low-level failure => high-level operation failed"
  // stack includes inner error stack trace
}
```

## ArgumentError

Error thrown when function arguments are invalid. Formats the argument object as YAML in the error message.

```ts
class ArgumentError extends SdError {
  constructor(argObj: Record<string, any>);
  constructor(message: string, argObj: Record<string, any>);
}
```

### Constructors

| Signature | Description |
|-----------|-------------|
| `new ArgumentError(argObj)` | Creates an error with the default message and the argument object formatted as YAML. |
| `new ArgumentError(message, argObj)` | Creates an error with a custom message and the argument object formatted as YAML. |

### Example

```ts
import { ArgumentError } from "@simplysm/sd-core-common";

function setPort(port: number) {
  if (port < 0 || port > 65535) {
    throw new ArgumentError("Invalid port number", { port });
  }
}
```

## NeverEntryError

Error thrown when code reaches a point that should be logically unreachable. Useful for exhaustive switch/case checks and impossible branches.

```ts
class NeverEntryError extends SdError {
  constructor(message?: string);
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `message` | `string \| undefined` | Optional additional context about the unreachable code path. |

### Example

```ts
import { NeverEntryError } from "@simplysm/sd-core-common";

function handleStatus(status: "ok" | "error") {
  switch (status) {
    case "ok": return true;
    case "error": return false;
    default: throw new NeverEntryError(`Unexpected status: ${status}`);
  }
}
```

## NotImplementError

Error thrown when a method or feature is not yet implemented.

```ts
class NotImplementError extends SdError {
  constructor(message?: string);
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `message` | `string \| undefined` | Optional description of what is not implemented. |

## TimeoutError

Error thrown when an operation exceeds its allowed time limit.

```ts
class TimeoutError extends SdError {
  constructor(millisecond?: number, message?: string);
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `millisecond` | `number \| undefined` | The timeout duration in milliseconds that was exceeded. Included in the error message if provided. |
| `message` | `string \| undefined` | Optional additional context. |
