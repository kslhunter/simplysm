# @simplysm/sd-cli

Simplysm package - CLI tool. Provides monorepo build, dev server, publish, and code quality tooling for Simplysm projects. Also exports configuration types and a Vite config factory for client packages.

## Installation

```bash
npm install @simplysm/sd-cli
```

## API Overview

### Config Types

| API | Type | Description |
|-----|------|-------------|
| `SdConfig` | interface | Top-level `sd.config.ts` configuration |
| `SdConfigFn` | type | Function signature for `sd.config.ts` default export |
| `SdConfigParams` | interface | Parameters passed to `SdConfigFn` |
| `SdPackageConfig` | type | Union of all package config types |
| `SdBuildPackageConfig` | interface | Package config for node/browser/neutral targets |
| `SdClientPackageConfig` | interface | Client package config (Vite dev server) |
| `SdServerPackageConfig` | interface | Server package config (Fastify server) |
| `SdScriptsPackageConfig` | interface | Scripts-only package config |
| `BuildTarget` | type | Build target type (`"node" \| "browser" \| "neutral"`) |
| `SdPublishConfig` | type | Union of all publish config types |
| `SdNpmPublishConfig` | interface | npm registry publish config |
| `SdLocalDirectoryPublishConfig` | interface | Local directory publish config |
| `SdStoragePublishConfig` | interface | FTP/FTPS/SFTP publish config |
| `SdPostPublishScriptConfig` | interface | Post-publish script config |
| `SdCapacitorConfig` | interface | Capacitor configuration |
| `SdCapacitorAndroidConfig` | interface | Capacitor Android platform config |
| `SdCapacitorSignConfig` | interface | Capacitor Android signing config |
| `SdCapacitorPermission` | interface | Capacitor Android permission config |
| `SdCapacitorIntentFilter` | interface | Capacitor Android Intent Filter config |
| `SdElectronConfig` | interface | Electron configuration |
| `SdWatchHookConfig` | interface | Watch hook config for scripts packages |

### Vite Utilities

| API | Type | Description |
|-----|------|-------------|
| `createViteConfig` | function | Create Vite config for SolidJS + Tailwind client packages |
| `ViteConfigOptions` | interface | Options for `createViteConfig` |

---

### `SdConfig`

| Field | Type | Description |
|-------|------|-------------|
| `packages` | `Record<string, SdPackageConfig \| undefined>` | Per-package configuration (key: subdirectory name under `packages/`) |
| `replaceDeps` | `Record<string, string>?` | Dependency replacement config (symlink local sources) |
| `postPublish` | `SdPostPublishScriptConfig[]?` | Scripts to execute after deployment |

### `SdConfigFn`

```typescript
type SdConfigFn = (params: SdConfigParams) => SdConfig | Promise<SdConfig>
```

### `SdConfigParams`

| Field | Type | Description |
|-------|------|-------------|
| `cwd` | `string` | Current working directory |
| `dev` | `boolean` | Development mode flag |
| `options` | `string[]` | Additional options (from CLI `-o` flag) |

### `BuildTarget`

```typescript
type BuildTarget = "node" | "browser" | "neutral"
```

### `SdPackageConfig`

```typescript
type SdPackageConfig =
  | SdBuildPackageConfig
  | SdClientPackageConfig
  | SdServerPackageConfig
  | SdScriptsPackageConfig
```

### `SdBuildPackageConfig`

| Field | Type | Description |
|-------|------|-------------|
| `target` | `BuildTarget` | Build target |
| `publish` | `SdPublishConfig?` | Publish configuration |
| `copySrc` | `string[]?` | Glob patterns for files to copy from `src/` to `dist/` |

### `SdClientPackageConfig`

| Field | Type | Description |
|-------|------|-------------|
| `target` | `"client"` | Build target |
| `server` | `string \| number` | Server package name or Vite port number |
| `env` | `Record<string, string>?` | Environment variables for build |
| `publish` | `SdPublishConfig?` | Publish configuration |
| `capacitor` | `SdCapacitorConfig?` | Capacitor configuration |
| `electron` | `SdElectronConfig?` | Electron configuration |
| `configs` | `Record<string, unknown>?` | Runtime config (written to `dist/.config.json`) |
| `exclude` | `string[]?` | Packages to exclude from Vite optimizeDeps |

### `SdServerPackageConfig`

| Field | Type | Description |
|-------|------|-------------|
| `target` | `"server"` | Build target |
| `env` | `Record<string, string>?` | Environment variables for build |
| `publish` | `SdPublishConfig?` | Publish configuration |
| `configs` | `Record<string, unknown>?` | Runtime config (written to `dist/.config.json`) |
| `externals` | `string[]?` | External modules for esbuild |
| `pm2` | `{ name?: string; ignoreWatchPaths?: string[] }?` | PM2 configuration |
| `packageManager` | `"volta" \| "mise"?` | Package manager setting |

### `SdScriptsPackageConfig`

| Field | Type | Description |
|-------|------|-------------|
| `target` | `"scripts"` | Build target |
| `publish` | `SdPublishConfig?` | Publish configuration |
| `watch` | `SdWatchHookConfig?` | Watch hook configuration |

### `SdWatchHookConfig`

| Field | Type | Description |
|-------|------|-------------|
| `target` | `string[]` | Glob patterns to watch (relative to package directory) |
| `cmd` | `string` | Command to execute on change |
| `args` | `string[]?` | Command arguments |

### `SdPublishConfig`

```typescript
type SdPublishConfig = SdNpmPublishConfig | SdLocalDirectoryPublishConfig | SdStoragePublishConfig
```

### `SdNpmPublishConfig`

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"npm"` | Publish type |

### `SdLocalDirectoryPublishConfig`

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"local-directory"` | Publish type |
| `path` | `string` | Target path (supports `%VER%`, `%PROJECT%` substitution) |

### `SdStoragePublishConfig`

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"ftp" \| "ftps" \| "sftp"` | Protocol type |
| `host` | `string` | Server hostname |
| `port` | `number?` | Server port |
| `path` | `string?` | Remote path |
| `user` | `string?` | Username |
| `password` | `string?` | Password |

### `SdPostPublishScriptConfig`

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"script"` | Config type |
| `cmd` | `string` | Command to execute |
| `args` | `string[]` | Script arguments (supports `%VER%`, `%PROJECT%` substitution) |

### `SdCapacitorConfig`

| Field | Type | Description |
|-------|------|-------------|
| `appId` | `string` | App ID (e.g., `"com.example.app"`) |
| `appName` | `string` | App name |
| `plugins` | `Record<string, Record<string, unknown> \| true>?` | Capacitor plugin configuration |
| `icon` | `string?` | App icon path (relative to package directory) |
| `debug` | `boolean?` | Debug build flag |
| `platform` | `{ android?: SdCapacitorAndroidConfig }?` | Per-platform configuration |

### `SdCapacitorAndroidConfig`

| Field | Type | Description |
|-------|------|-------------|
| `config` | `Record<string, string>?` | AndroidManifest.xml application tag attributes |
| `bundle` | `boolean?` | AAB bundle build flag (false for APK) |
| `intentFilters` | `SdCapacitorIntentFilter[]?` | Intent Filter configuration |
| `sign` | `SdCapacitorSignConfig?` | APK/AAB signing configuration |
| `sdkVersion` | `number?` | Android SDK version (minSdk, targetSdk) |
| `permissions` | `SdCapacitorPermission[]?` | Additional permission configuration |

### `SdCapacitorSignConfig`

| Field | Type | Description |
|-------|------|-------------|
| `keystore` | `string` | Keystore file path (relative to package directory) |
| `storePassword` | `string` | Keystore password |
| `alias` | `string` | Key alias |
| `password` | `string` | Key password |
| `keystoreType` | `string?` | Keystore type (default: `"jks"`) |

### `SdCapacitorPermission`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Permission name (e.g., `"CAMERA"`) |
| `maxSdkVersion` | `number?` | Maximum SDK version |
| `ignore` | `string?` | `tools:ignore` attribute value |

### `SdCapacitorIntentFilter`

| Field | Type | Description |
|-------|------|-------------|
| `action` | `string?` | Intent action (e.g., `"android.intent.action.VIEW"`) |
| `category` | `string?` | Intent category (e.g., `"android.intent.category.DEFAULT"`) |

### `SdElectronConfig`

| Field | Type | Description |
|-------|------|-------------|
| `appId` | `string` | Electron app ID |
| `portable` | `boolean?` | Portable `.exe` (true) or NSIS installer (false) |
| `installerIcon` | `string?` | Installer icon path (`.ico`, relative to package directory) |
| `reinstallDependencies` | `string[]?` | npm packages to include in Electron |
| `postInstallScript` | `string?` | npm postinstall script |
| `nsisOptions` | `Record<string, unknown>?` | NSIS options |
| `env` | `Record<string, string>?` | Environment variables |

### `ViteConfigOptions`

| Field | Type | Description |
|-------|------|-------------|
| `pkgDir` | `string` | Package directory path |
| `name` | `string` | Package name |
| `tsconfigPath` | `string` | tsconfig.json path |
| `compilerOptions` | `Record<string, unknown>` | TypeScript compiler options |
| `env` | `Record<string, string>?` | Environment variables |
| `mode` | `"build" \| "dev"` | Build or dev mode |
| `serverPort` | `number?` | Server port in dev mode (0 for auto-assign) |
| `replaceDeps` | `string[]?` | Array of replaceDeps package names |
| `onScopeRebuild` | `(() => void)?` | Callback when replaceDeps package dist changes |
| `outDir` | `string?` | Override `build.outDir` |
| `base` | `string?` | Override base path |
| `exclude` | `string[]?` | Packages to exclude from optimizeDeps |

### `createViteConfig`

```typescript
function createViteConfig(options: ViteConfigOptions): ViteUserConfig
```

Creates a Vite config for SolidJS + Tailwind CSS client packages. Includes plugins for tsconfig paths, SolidJS, PWA, Tailwind config deps watching, scope package watching, and public-dev directory serving.

## Usage Examples

### sd.config.ts

```typescript
import type { SdConfigFn, SdConfigParams } from "@simplysm/sd-cli";

const config: SdConfigFn = (params: SdConfigParams) => ({
  packages: {
    "core-common": { target: "neutral" },
    "core-node": { target: "node" },
    "my-client": {
      target: "client",
      server: "my-server",
    },
    "my-server": {
      target: "server",
      pm2: { name: "my-app" },
    },
  },
});

export default config;
```

### Custom Vite config

```typescript
import { createViteConfig } from "@simplysm/sd-cli";

const config = createViteConfig({
  pkgDir: "/path/to/package",
  name: "my-client",
  tsconfigPath: "/path/to/tsconfig.json",
  compilerOptions: { jsx: "preserve" },
  mode: "dev",
  serverPort: 3000,
});
```
