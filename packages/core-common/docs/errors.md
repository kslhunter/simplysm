# Errors

Error classes for the Simplysm framework. All classes extend `SdError`, which itself extends `Error`.

Source: `src/errors/*.ts`

---

## `SdError`

Error class supporting tree-structured cause chaining. Utilizes ES2024 `cause` property. Messages are joined in reverse order with ` => ` separator, and cause stack traces are appended.

```typescript
export class SdError extends Error {
  override cause?: Error;

  /** Create by wrapping a cause error. Messages are joined in reverse order (upper message => lower message => cause message) */
  constructor(cause: Error, ...messages: string[]);
  /** Create with messages only. Messages are joined in reverse order (upper message => lower message) */
  constructor(...messages: string[]);
}
```

**Example:**

```typescript
try {
  await fetch(url);
} catch (err) {
  throw new SdError(err, "API call failed", "User load failed");
}
// Result message: "User load failed => API call failed => original error message"

throw new SdError("invalid state", "processing not possible");
// Result message: "processing not possible => invalid state"
```

---

## `ArgumentError`

An error thrown when invalid arguments are received. Includes the argument object in YAML format in the message to facilitate debugging. Extends `SdError`.

```typescript
export class ArgumentError extends SdError {
  /** Output argument object in YAML format with default message ("Invalid arguments.") */
  constructor(argObj: Record<string, unknown>);
  /** Output argument object in YAML format with a custom message */
  constructor(message: string, argObj: Record<string, unknown>);
}
```

**Example:**

```typescript
throw new ArgumentError({ userId: 123, name: null });
// Result message: "Invalid arguments.\n\nuserId: 123\nname: null"

throw new ArgumentError("Invalid user", { userId: 123 });
// Result message: "Invalid user\n\nuserId: 123"
```

---

## `NotImplementedError`

An error thrown when a feature that has not yet been implemented is called. Extends `SdError`.

```typescript
export class NotImplementedError extends SdError {
  /**
   * @param message Additional description message
   */
  constructor(message?: string);
}
```

**Example:**

```typescript
class BaseService {
  process(): void {
    throw new NotImplementedError("Implementation required in subclass");
  }
}

switch (type) {
  case "A": return handleA();
  case "B": throw new NotImplementedError(`Handling for type ${type}`);
}
```

---

## `TimeoutError`

An error that occurs when the waiting time is exceeded. Automatically thrown when the maximum number of attempts is exceeded in `wait.until()`. Extends `SdError`.

```typescript
export class TimeoutError extends SdError {
  /**
   * @param count Number of attempts
   * @param message Additional message
   */
  constructor(count?: number, message?: string);
}
```

**Example:**

```typescript
try {
  await wait.until(() => isReady, 100, 50);
} catch (err) {
  if (err instanceof TimeoutError) {
    // "Waiting time exceeded(50 attempts)"
  }
}
```
