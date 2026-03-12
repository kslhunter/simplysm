# Environment

The `env` object exposes build-time environment variables.

```typescript
import { env } from "@simplysm/core-common";
```

## env

```typescript
const env: {
  DEV: boolean;
  VER?: string;
  [key: string]: unknown;
};
```

- `DEV` - Whether running in development mode. Parsed from `process.env.DEV` (defaults to `false`).
- `VER` - Application version string from `process.env.VER`.
- Additional `process.env` properties are spread into the object.

---

## Usage Examples

```typescript
import { env } from "@simplysm/core-common";

if (env.DEV) {
  // development-only logic
}

console.log(`Version: ${env.VER}`);
```
