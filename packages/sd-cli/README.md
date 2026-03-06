# @simplysm/sd-cli

Simplysm CLI tool — build, watch, dev server, lint, typecheck, publish, and project scaffolding for Simplysm monorepo projects.

## Installation

```bash
pnpm add -D @simplysm/sd-cli
```

The CLI is available as `sd-cli` after installation (or via `pnpm exec sd-cli`).

---

## Quick Command Reference

All commands accept a global `--debug` flag for verbose logging.

| Command | Description |
|---------|-------------|
| `sd-cli lint [targets..]` | Run ESLint and Stylelint across the workspace. |
| `sd-cli typecheck [targets..]` | Run TypeScript type checking. |
| `sd-cli check [targets..]` | Run typecheck, lint, and tests in parallel with a summary. |
| `sd-cli watch [targets..]` | Build library packages in watch mode (esbuild + `.d.ts`). |
| `sd-cli dev [targets..]` | Run client (Vite) and server packages in development mode. |
| `sd-cli build [targets..]` | Run a production build. |
| `sd-cli device` | Run an app on an Android device or Electron desktop. |
| `sd-cli init` | Scaffold a new Simplysm project interactively. |
| `sd-cli publish [targets..]` | Publish packages to npm, a local directory, or FTP/SFTP. |
| `sd-cli replace-deps` | Replace `node_modules` packages with symlinks to local source directories. |

---

## Config Types

All types below are re-exported from `@simplysm/sd-cli` and used to type `sd.config.ts`.

### `SdConfigFn`

The type that `sd.config.ts` must default-export. Receives `SdConfigParams` and returns `SdConfig` (or a `Promise<SdConfig>`).

```typescript
import type { SdConfigFn } from "@simplysm/sd-cli";

const config: SdConfigFn = (params) => ({
  packages: {
    "core-common": { target: "neutral" },
    "core-node": { target: "node" },
    "solid": { target: "browser" },
    "solid-demo": { target: "client", server: "solid-demo-server" },
    "solid-demo-server": {
      target: "server",
      publish: { type: "sftp", host: "example.com", user: "deploy", path: "/var/www/app" },
    },
  },
});

export default config;
```

---

### `SdConfigParams`

Parameters passed to the `SdConfigFn` by the CLI at startup.

```typescript
import type { SdConfigParams } from "@simplysm/sd-cli";
```

| Property | Type | Description |
|----------|------|-------------|
| `cwd` | `string` | Current working directory. |
| `dev` | `boolean` | `true` when running in development mode. |
| `options` | `string[]` | Additional options passed via the CLI `-o` flag. |

---

### `SdConfig`

Top-level configuration object returned by `SdConfigFn`.

```typescript
import type { SdConfig } from "@simplysm/sd-cli";
```

| Property | Type | Description |
|----------|------|-------------|
| `packages` | `Record<string, SdPackageConfig \| undefined>` | Per-package configuration. Key is the subdirectory name under `packages/` (e.g. `"core-common"`). |
| `replaceDeps?` | `Record<string, string>` | Dependency replacement map — replaces `node_modules` packages with local source symlinks. Key is a package glob (e.g. `"@simplysm/*"`); value is the source path (e.g. `"../simplysm/packages/*"`). |
| `postPublish?` | `SdPostPublishScriptConfig[]` | Scripts to execute after deployment completes. |

---

### `SdPackageConfig`

Union of all per-package configuration types.

```typescript
import type { SdPackageConfig } from "@simplysm/sd-cli";

type SdPackageConfig =
  | SdBuildPackageConfig
  | SdClientPackageConfig
  | SdServerPackageConfig
  | SdScriptsPackageConfig;
```

---

### `SdBuildPackageConfig`

Configuration for library packages built with esbuild (`target: "node" | "browser" | "neutral"`).

```typescript
import type { SdBuildPackageConfig } from "@simplysm/sd-cli";
```

| Property | Type | Description |
|----------|------|-------------|
| `target` | `BuildTarget` | Build target: `"node"`, `"browser"`, or `"neutral"`. |
| `publish?` | `SdPublishConfig` | Publish configuration. |
| `copySrc?` | `string[]` | Glob patterns for files to copy from `src/` to `dist/` (relative to `src/`). |

---

### `SdClientPackageConfig`

Configuration for Vite client packages (`target: "client"`).

```typescript
import type { SdClientPackageConfig } from "@simplysm/sd-cli";
```

| Property | Type | Description |
|----------|------|-------------|
| `target` | `"client"` | Must be `"client"`. |
| `server` | `string \| number` | Server package name to connect to (e.g. `"solid-demo-server"`), or a Vite port number (backward compatibility). |
| `env?` | `Record<string, string>` | Environment variables substituted during build (replaces `process.env` with the object). |
| `publish?` | `SdPublishConfig` | Publish configuration. |
| `capacitor?` | `SdCapacitorConfig` | Capacitor configuration for Android builds. |
| `electron?` | `SdElectronConfig` | Electron configuration for desktop builds. |
| `configs?` | `Record<string, unknown>` | Runtime config written to `dist/.config.json` during build. |

---

### `SdServerPackageConfig`

Configuration for Fastify server packages (`target: "server"`).

```typescript
import type { SdServerPackageConfig } from "@simplysm/sd-cli";
```

| Property | Type | Description |
|----------|------|-------------|
| `target` | `"server"` | Must be `"server"`. |
| `env?` | `Record<string, string>` | Environment variables substituted during build (replaces `process.env.KEY` with a constant). |
| `publish?` | `SdPublishConfig` | Publish configuration. |
| `configs?` | `Record<string, unknown>` | Runtime config written to `dist/.config.json` during build. |
| `externals?` | `string[]` | External modules excluded from the esbuild bundle (in addition to automatic `binding.gyp` detection). |
| `pm2?` | `{ name?: string; ignoreWatchPaths?: string[] }` | PM2 configuration — generates `dist/pm2.config.cjs` when specified. |
| `packageManager?` | `"volta" \| "mise"` | Package manager to use (affects `mise.toml` or `volta` settings generation). |

---

### `SdScriptsPackageConfig`

Configuration for scripts-only packages that are excluded from watch and typecheck (`target: "scripts"`).

```typescript
import type { SdScriptsPackageConfig } from "@simplysm/sd-cli";
```

| Property | Type | Description |
|----------|------|-------------|
| `target` | `"scripts"` | Must be `"scripts"`. |

---

## Publish Configuration Types

### `SdPublishConfig`

```typescript
import type { SdPublishConfig } from "@simplysm/sd-cli";

type SdPublishConfig = "npm" | SdLocalDirectoryPublishConfig | SdStoragePublishConfig;
```

- `"npm"` — publish to the npm registry.
- `SdLocalDirectoryPublishConfig` — copy to a local directory.
- `SdStoragePublishConfig` — upload via FTP/FTPS/SFTP.

---

### `SdLocalDirectoryPublishConfig`

```typescript
import type { SdLocalDirectoryPublishConfig } from "@simplysm/sd-cli";
```

| Property | Type | Description |
|----------|------|-------------|
| `type` | `"local-directory"` | Must be `"local-directory"`. |
| `path` | `string` | Deployment target path. Supports variable substitution: `%VER%`, `%PROJECT%`. |

---

### `SdStoragePublishConfig`

```typescript
import type { SdStoragePublishConfig } from "@simplysm/sd-cli";
```

| Property | Type | Description |
|----------|------|-------------|
| `type` | `"ftp" \| "ftps" \| "sftp"` | Protocol type. |
| `host` | `string` | Remote host. |
| `port?` | `number` | Remote port. |
| `path?` | `string` | Remote path. |
| `user?` | `string` | Username. |
| `pass?` | `string` | Password. |

---

### `SdPostPublishScriptConfig`

Script to run after deployment.

```typescript
import type { SdPostPublishScriptConfig } from "@simplysm/sd-cli";
```

| Property | Type | Description |
|----------|------|-------------|
| `type` | `"script"` | Must be `"script"`. |
| `cmd` | `string` | Command to execute. |
| `args` | `string[]` | Command arguments. Supports variable substitution: `%VER%`, `%PROJECT%`. |

---

## Capacitor / Electron Types

### `SdCapacitorConfig`

Capacitor configuration for building Android apps.

```typescript
import type { SdCapacitorConfig } from "@simplysm/sd-cli";
```

| Property | Type | Description |
|----------|------|-------------|
| `appId` | `string` | App ID (e.g. `"com.example.app"`). |
| `appName` | `string` | App display name. |
| `plugins?` | `Record<string, Record<string, unknown> \| true>` | Capacitor plugin configuration (key: package name, value: `true` or plugin options). |
| `icon?` | `string` | App icon path, relative to the package directory. |
| `debug?` | `boolean` | Debug build flag. |
| `platform?` | `{ android?: SdCapacitorAndroidConfig }` | Per-platform configuration. |

---

### `SdCapacitorAndroidConfig`

```typescript
import type { SdCapacitorAndroidConfig } from "@simplysm/sd-cli";
```

| Property | Type | Description |
|----------|------|-------------|
| `config?` | `Record<string, string>` | `AndroidManifest.xml` application tag attributes (e.g. `{ requestLegacyExternalStorage: "true" }`). |
| `bundle?` | `boolean` | `true` to build an AAB bundle; `false` (default) for APK. |
| `intentFilters?` | `SdCapacitorIntentFilter[]` | Intent filter configuration. |
| `sign?` | `SdCapacitorSignConfig` | APK/AAB signing configuration. |
| `sdkVersion?` | `number` | Android SDK version (`minSdk` and `targetSdk`). |
| `permissions?` | `SdCapacitorPermission[]` | Additional permission configuration. |

---

### `SdCapacitorSignConfig`

```typescript
import type { SdCapacitorSignConfig } from "@simplysm/sd-cli";
```

| Property | Type | Description |
|----------|------|-------------|
| `keystore` | `string` | Keystore file path, relative to the package directory. |
| `storePassword` | `string` | Keystore password. |
| `alias` | `string` | Key alias. |
| `password` | `string` | Key password. |
| `keystoreType?` | `string` | Keystore type (default: `"jks"`). |

---

### `SdCapacitorPermission`

```typescript
import type { SdCapacitorPermission } from "@simplysm/sd-cli";
```

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Permission name (e.g. `"CAMERA"`, `"WRITE_EXTERNAL_STORAGE"`). |
| `maxSdkVersion?` | `number` | Maximum SDK version. |
| `ignore?` | `string` | `tools:ignore` attribute value. |

---

### `SdCapacitorIntentFilter`

```typescript
import type { SdCapacitorIntentFilter } from "@simplysm/sd-cli";
```

| Property | Type | Description |
|----------|------|-------------|
| `action?` | `string` | Intent action (e.g. `"android.intent.action.VIEW"`). |
| `category?` | `string` | Intent category (e.g. `"android.intent.category.DEFAULT"`). |

---

### `SdElectronConfig`

Electron configuration for building desktop apps.

```typescript
import type { SdElectronConfig } from "@simplysm/sd-cli";
```

| Property | Type | Description |
|----------|------|-------------|
| `appId` | `string` | Electron app ID (e.g. `"com.example.myapp"`). |
| `portable?` | `boolean` | `true` for a portable `.exe`; `false` (default) for an NSIS installer. |
| `installerIcon?` | `string` | Installer icon path (`.ico`), relative to the package directory. |
| `reinstallDependencies?` | `string[]` | npm packages to include in the Electron bundle (native modules, etc.). |
| `postInstallScript?` | `string` | npm postinstall script. |
| `nsisOptions?` | `Record<string, unknown>` | NSIS options (when `portable` is `false`). |
| `env?` | `Record<string, string>` | Environment variables accessible via `process.env` in `electron-main.ts`. |

---

## Vite Config

### `createViteConfig(options)`

Creates a `ViteUserConfig` for building or serving SolidJS + TailwindCSS client packages.

- **Build mode** (`mode: "build"`): production build with `logLevel: "silent"`.
- **Dev mode** (`mode: "dev"`): dev server with env substitution, scope-package HMR, and `public-dev/` priority serving.

```typescript
import { createViteConfig } from "@simplysm/sd-cli";

const viteConfig = createViteConfig({
  pkgDir: "/path/to/packages/my-client",
  name: "my-client",
  tsconfigPath: "/path/to/packages/my-client/tsconfig.json",
  compilerOptions: {},
  mode: "dev",
  serverPort: 4200,
  replaceDeps: ["@simplysm/solid"],
});
```

---

### `ViteConfigOptions`

```typescript
import type { ViteConfigOptions } from "@simplysm/sd-cli";
```

| Property | Type | Description |
|----------|------|-------------|
| `pkgDir` | `string` | Absolute path to the client package directory. |
| `name` | `string` | Package name used as the Vite `base` path (`/<name>/`). |
| `tsconfigPath` | `string` | Absolute path to the package's `tsconfig.json`. |
| `compilerOptions` | `Record<string, unknown>` | TypeScript compiler options forwarded to esbuild. |
| `env?` | `Record<string, string>` | Environment variables substituted via `define` (replaces `process.env`). |
| `mode` | `"build" \| "dev"` | `"build"` for production output; `"dev"` for the dev server. |
| `serverPort?` | `number` | Dev server port. `0` binds to `127.0.0.1` for proxy-connected clients; omit for auto-assign. |
| `replaceDeps?` | `string[]` | Resolved package names whose `dist/` directories are watched for HMR in dev mode. |
| `onScopeRebuild?` | `() => void` | Callback invoked when a `replaceDeps` package dist changes. |

---

## Types Reference

### `BuildTarget`

```typescript
import type { BuildTarget } from "@simplysm/sd-cli";

type BuildTarget = "node" | "browser" | "neutral";
```

- `"node"` — Node.js-only package.
- `"browser"` — browser-only package.
- `"neutral"` — shared package usable in both Node.js and browser.
