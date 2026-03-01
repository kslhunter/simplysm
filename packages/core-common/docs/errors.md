# Errors

Error classes provided by `@simplysm/core-common`.

---

## `SdError`

Base error class supporting tree-structured cause chaining.

```typescript
import { SdError } from "@simplysm/core-common";

// Wrap a cause error
try {
  await fetch(url);
} catch (err) {
  throw new SdError(err, "API call failed", "User load failed");
  // message: "User load failed => API call failed => <original message>"
}

// Message-only
throw new SdError("invalid state", "processing not possible");
// message: "processing not possible => invalid state"
```

---

## `ArgumentError`

Thrown when invalid arguments are received. Appends argument values in YAML format to the message.

```typescript
import { ArgumentError } from "@simplysm/core-common";

throw new ArgumentError({ userId: 123, name: null });
// "Invalid arguments.\n\nuserId: 123\nname: null"

throw new ArgumentError("Invalid user", { userId: 123 });
// "Invalid user\n\nuserId: 123"
```

---

## `NotImplementedError`

Thrown for unimplemented features (abstract stubs, future branches).

```typescript
import { NotImplementedError } from "@simplysm/core-common";

throw new NotImplementedError("Implementation required in subclass");
// "Not implemented: Implementation required in subclass"
```

---

## `TimeoutError`

Thrown when a waiting time limit is exceeded.

```typescript
import { TimeoutError } from "@simplysm/core-common";

throw new TimeoutError(50, "Waiting for API response exceeded");
// "Waiting time exceeded(50 attempts): Waiting for API response exceeded"
```
