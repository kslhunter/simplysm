# Errors

Custom error class hierarchy with tree-structured cause chaining.

## SdError

```typescript
class SdError extends Error {
  cause?: Error;

  constructor(cause: Error, ...messages: string[]);
  constructor(...messages: string[]);
}
```

Base error class supporting tree-structured cause chaining. Messages are joined in reverse order with ` => ` separator. The cause stack trace is appended to the current stack.

---

## ArgumentError

```typescript
class ArgumentError extends SdError {
  constructor(argObj: Record<string, unknown>);
  constructor(message: string, argObj: Record<string, unknown>);
}
```

Error for invalid arguments. Includes the argument object formatted as YAML in the message for easy debugging.

---

## NotImplementedError

```typescript
class NotImplementedError extends SdError {
  constructor(message?: string);
}
```

Error for features not yet implemented. Used for abstract method stubs and planned branches.

---

## TimeoutError

```typescript
class TimeoutError extends SdError {
  constructor(count?: number, message?: string);
}
```

Error thrown when waiting time is exceeded. Automatically thrown by `wait.until()` when the maximum number of attempts is reached.

---

## Usage Examples

```typescript
import { SdError, ArgumentError, NotImplementedError, TimeoutError } from "@simplysm/core-common";

// Wrap a cause error
try {
  await fetch(url);
} catch (err) {
  throw new SdError(err, "API call failed", "User load failed");
  // message: "User load failed => API call failed => original error message"
}

// ArgumentError with YAML-formatted details
throw new ArgumentError("Invalid user", { userId: 123, name: null });
// message: "Invalid user\n\nuserId: 123\nname: null"

// NotImplementedError
throw new NotImplementedError("PDF export");

// TimeoutError
throw new TimeoutError(50, "Waiting for API response");
```
