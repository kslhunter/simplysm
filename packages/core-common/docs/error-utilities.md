# Error Utilities

Imported as the `err` namespace. Utilities for handling unknown error values.

```typescript
import { err } from "@simplysm/core-common";
```

## message

```typescript
function message(err: unknown): string;
```

Extracts a message string from an unknown error value (typically from a `catch` block). Returns `err.message` for `Error` instances, otherwise returns `String(err)`.

---

## Usage Examples

```typescript
import { err } from "@simplysm/core-common";

try {
  throw new Error("something failed");
} catch (e) {
  const msg = err.message(e); // "something failed"
}

try {
  throw "raw string error";
} catch (e) {
  const msg = err.message(e); // "raw string error"
}
```
