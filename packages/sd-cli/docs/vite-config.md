# Vite Config API

Utility for generating Vite configuration for SolidJS + TailwindCSS client packages. Exported from the package entry point.

```typescript
import { createViteConfig, type ViteConfigOptions } from "@simplysm/sd-cli";
```

## createViteConfig

Creates a Vite `UserConfig` for building or serving a client package.

```typescript
function createViteConfig(options: ViteConfigOptions): ViteUserConfig;
```

### ViteConfigOptions

| Property | Type | Description |
|----------|------|-------------|
| `pkgDir` | `string` | Absolute path to the package directory. |
| `name` | `string` | Package name (used as the Vite `base` path: `/<name>/`). |
| `tsconfigPath` | `string` | Path to `tsconfig.json` for the package. |
| `compilerOptions` | `Record<string, unknown>` | TypeScript compiler options passed to esbuild. |
| `env` | `Record<string, string>` | Environment variables substituted via Vite `define` (replaces `process.env`). |
| `mode` | `"build" \| "dev"` | `"build"` for production (silent logging), `"dev"` for dev server. |
| `serverPort` | `number` | Server port in dev mode. `0` for auto-assign (server-connected client). |
| `replaceDeps` | `string[]` | Array of `replaceDeps` package names (for scope watching). |
| `onScopeRebuild` | `() => void` | Callback when a `replaceDeps` package dist changes. |

### Built-in Plugins

The generated config includes the following Vite plugins:

- **vite-tsconfig-paths** -- Resolves TypeScript path aliases.
- **vite-plugin-solid** -- SolidJS JSX compilation.
- **vite-plugin-pwa** -- PWA manifest and service worker generation.
- **sd-tailwind-config-deps** (dev only, when `replaceDeps` is set) -- Watches Tailwind config dependencies in scope packages and invalidates cache on change.
- **sd-scope-watch** (dev only, when `replaceDeps` is set) -- Watches `dist/` directories in scope packages and triggers HMR. Excludes scope packages from Vite's `optimizeDeps` to prevent stale pre-bundled cache.
- **sd-public-dev** (dev only) -- Serves files from `public-dev/` directory with priority over `public/`.

### Usage Example

```typescript
import { createViteConfig } from "@simplysm/sd-cli";

const config = createViteConfig({
  pkgDir: "/path/to/packages/my-client",
  name: "my-client",
  tsconfigPath: "/path/to/packages/my-client/tsconfig.json",
  compilerOptions: { jsx: "preserve", jsxImportSource: "solid-js" },
  mode: "dev",
  serverPort: 3000,
});
```

## getMimeType

Returns a MIME type string for a given file extension. Used internally by the `sd-public-dev` plugin.

```typescript
function getMimeType(ext: string): string;
```

Supports common web asset extensions (`.html`, `.css`, `.js`, `.json`, `.png`, `.jpg`, `.svg`, `.ico`, `.woff2`, `.mp4`, etc.). Returns `"application/octet-stream"` for unknown extensions.

> **Note:** This function is exported for testing purposes and is marked `@internal`.
