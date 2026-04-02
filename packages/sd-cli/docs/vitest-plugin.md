# Vitest Plugin

## `angularVitestPlugin`

Vite plugin for Angular AOT compilation in Vitest. Compiles `src/` files and `.fixture.` files using Angular's `NgtscProgram`, caching the compiled output in memory and returning it from the `transform` hook.

```typescript
function angularVitestPlugin(options: AngularVitestPluginOptions): Plugin;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `AngularVitestPluginOptions` | Plugin options |

**Returns:** A Vite `Plugin` object with `buildStart` and `transform` hooks.

**Behavior:**

- `buildStart`: Reads `tsconfig.json`, creates an Angular `NgtscProgram`, runs AOT analysis, and emits compiled JavaScript for each source file into an in-memory cache.
- `transform`: For `.ts` files (excluding `node_modules`), returns the cached compiled output if available.

**Usage:**

```typescript
import { angularVitestPlugin } from "@simplysm/sd-cli/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [angularVitestPlugin({ tsconfig: "./tsconfig.json" })],
});
```

## `AngularVitestPluginOptions`

Options for `angularVitestPlugin`.

```typescript
interface AngularVitestPluginOptions {
  tsconfig: string;
  cwd?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `tsconfig` | `string` | Angular package's `tsconfig.json` absolute path |
| `cwd` | `string` | Monorepo workspace root path. When not specified, uses two directories above the `tsconfig` path |
