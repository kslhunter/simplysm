# Environment

## `parseBoolEnv`

Parse a value to boolean. Recognizes `"true"`, `"1"`, `"yes"`, `"on"` (case-insensitive) as `true`; everything else is `false`.

```typescript
function parseBoolEnv(value: unknown): boolean;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `value` | `unknown` | The value to parse. Converted to string internally. |

**Returns:** `boolean`

## `env`

Unified environment variable object. Merges `import.meta.env` and `process.env` (process.env takes precedence). `DEV` is auto-parsed as boolean, `VER` is typed as optional string.

```typescript
const env: {
  DEV: boolean;
  VER?: string;
  [key: string]: unknown;
};
```

| Field | Type | Description |
|-------|------|-------------|
| `DEV` | `boolean` | Whether the app is running in development mode. Parsed from raw `DEV` env var via `parseBoolEnv`. |
| `VER` | `string \| undefined` | Application version string, if set. |
| `[key: string]` | `unknown` | Any other environment variable. |
