# Configuration Types

All types are exported from the package entry point:

```typescript
import type { SdConfig, SdConfigFn, SdConfigParams, ... } from "@simplysm/sd-cli";
```

## SdConfigFn

The function signature that `sd.config.ts` must default-export.

```typescript
type SdConfigFn = (params: SdConfigParams) => SdConfig | Promise<SdConfig>;
```

## SdConfigParams

Parameters passed to the config function.

| Property | Type | Description |
|----------|------|-------------|
| `cwd` | `string` | Current working directory. |
| `dev` | `boolean` | `true` in dev/watch mode, `false` in build/publish. |
| `options` | `string[]` | Additional options from CLI `-o` flag. |

## SdConfig

Top-level configuration object.

| Property | Type | Description |
|----------|------|-------------|
| `packages` | `Record<string, SdPackageConfig \| undefined>` | Per-package configuration. Key is the subdirectory name under `packages/`. |
| `replaceDeps` | `Record<string, string>` | Dependency replacement mapping. Key: glob pattern for packages in `node_modules` (e.g., `@simplysm/*`). Value: local source path (`*` is substituted from key). |
| `postPublish` | `SdPostPublishScriptConfig[]` | Scripts to execute after deployment completes. |

## SdPackageConfig

Union of all package configuration types:

```typescript
type SdPackageConfig =
  | SdBuildPackageConfig
  | SdClientPackageConfig
  | SdServerPackageConfig
  | SdScriptsPackageConfig;
```

## BuildTarget

```typescript
type BuildTarget = "node" | "browser" | "neutral";
```

- `node` -- Node.js only library.
- `browser` -- Browser only library.
- `neutral` -- Node/browser shared library.

## SdBuildPackageConfig

Configuration for library packages (`node` / `browser` / `neutral`).

| Property | Type | Description |
|----------|------|-------------|
| `target` | `BuildTarget` | Build target. |
| `publish` | `SdPublishConfig` | Optional publish configuration. |
| `copySrc` | `string[]` | Glob patterns for files to copy from `src/` to `dist/` (relative to `src/`). |

## SdClientPackageConfig

Configuration for client app packages (Vite dev server).

| Property | Type | Description |
|----------|------|-------------|
| `target` | `"client"` | Must be `"client"`. |
| `server` | `string \| number` | Server package name to connect to, or a Vite port number. |
| `env` | `Record<string, string>` | Environment variables substituted during build (`process.env` replacement). |
| `publish` | `SdPublishConfig` | Optional publish configuration. |
| `capacitor` | `SdCapacitorConfig` | Optional Capacitor configuration. |
| `electron` | `SdElectronConfig` | Optional Electron configuration. |
| `configs` | `Record<string, unknown>` | Runtime config written to `dist/.config.json` during build. |

## SdServerPackageConfig

Configuration for server app packages (Fastify server).

| Property | Type | Description |
|----------|------|-------------|
| `target` | `"server"` | Must be `"server"`. |
| `env` | `Record<string, string>` | Environment variables substituted during build. |
| `publish` | `SdPublishConfig` | Optional publish configuration. |
| `configs` | `Record<string, unknown>` | Runtime config written to `dist/.config.json` during build. |
| `externals` | `string[]` | External modules excluded from esbuild bundle. |
| `pm2` | `{ name?: string; ignoreWatchPaths?: string[] }` | PM2 configuration. Generates `dist/pm2.config.cjs` when specified. |
| `packageManager` | `"volta" \| "mise"` | Package manager (affects `mise.toml` or Volta settings). |

## SdScriptsPackageConfig

Configuration for scripts-only packages (excluded from watch/typecheck).

| Property | Type | Description |
|----------|------|-------------|
| `target` | `"scripts"` | Must be `"scripts"`. |

## SdPublishConfig

Union of publish target types:

```typescript
type SdPublishConfig =
  | SdNpmPublishConfig
  | SdLocalDirectoryPublishConfig
  | SdStoragePublishConfig;
```

### SdNpmPublishConfig

```typescript
interface SdNpmPublishConfig {
  type: "npm";
}
```

### SdLocalDirectoryPublishConfig

| Property | Type | Description |
|----------|------|-------------|
| `type` | `"local-directory"` | |
| `path` | `string` | Deployment target path. Supports `%VER%` and `%PROJECT%` substitution. |

### SdStoragePublishConfig

| Property | Type | Description |
|----------|------|-------------|
| `type` | `"ftp" \| "ftps" \| "sftp"` | Storage protocol. |
| `host` | `string` | Server hostname. |
| `port` | `number` | Optional port number. |
| `path` | `string` | Optional remote path. |
| `user` | `string` | Optional username. |
| `password` | `string` | Optional password. For SFTP without password, SSH key auth is used automatically. |

## SdPostPublishScriptConfig

| Property | Type | Description |
|----------|------|-------------|
| `type` | `"script"` | Must be `"script"`. |
| `cmd` | `string` | Command to execute. Supports `%VER%` and `%PROJECT%` substitution. |
| `args` | `string[]` | Command arguments. Supports `%VER%` and `%PROJECT%` substitution. |

## SdCapacitorConfig

Capacitor mobile app configuration.

| Property | Type | Description |
|----------|------|-------------|
| `appId` | `string` | App identifier (e.g., `"com.example.app"`). |
| `appName` | `string` | Display name. |
| `plugins` | `Record<string, Record<string, unknown> \| true>` | Capacitor plugin configuration. |
| `icon` | `string` | App icon path (relative to package directory). |
| `debug` | `boolean` | Debug build flag. |
| `platform.android` | `SdCapacitorAndroidConfig` | Android-specific settings. |

### SdCapacitorAndroidConfig

| Property | Type | Description |
|----------|------|-------------|
| `config` | `Record<string, string>` | AndroidManifest.xml application tag attributes. |
| `bundle` | `boolean` | Build AAB bundle (`true`) or APK (`false`). |
| `intentFilters` | `SdCapacitorIntentFilter[]` | Intent filter configuration. |
| `sign` | `SdCapacitorSignConfig` | APK/AAB signing configuration. |
| `sdkVersion` | `number` | Android SDK version (minSdk, targetSdk). |
| `permissions` | `SdCapacitorPermission[]` | Additional Android permissions. |

### SdCapacitorSignConfig

| Property | Type | Description |
|----------|------|-------------|
| `keystore` | `string` | Keystore file path (relative to package directory). |
| `storePassword` | `string` | Keystore password. |
| `alias` | `string` | Key alias. |
| `password` | `string` | Key password. |
| `keystoreType` | `string` | Keystore type (default: `"jks"`). |

### SdCapacitorPermission

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Permission name (e.g., `"CAMERA"`). |
| `maxSdkVersion` | `number` | Maximum SDK version. |
| `ignore` | `string` | `tools:ignore` attribute value. |

### SdCapacitorIntentFilter

| Property | Type | Description |
|----------|------|-------------|
| `action` | `string` | Intent action (e.g., `"android.intent.action.VIEW"`). |
| `category` | `string` | Intent category (e.g., `"android.intent.category.DEFAULT"`). |

## SdElectronConfig

Electron desktop app configuration.

| Property | Type | Description |
|----------|------|-------------|
| `appId` | `string` | App identifier (e.g., `"com.example.myapp"`). |
| `portable` | `boolean` | `true` for portable `.exe`, `false` for NSIS installer. |
| `installerIcon` | `string` | Installer icon path (`.ico`, relative to package directory). |
| `reinstallDependencies` | `string[]` | npm packages to include in Electron (native modules, etc.). |
| `postInstallScript` | `string` | npm postinstall script. |
| `nsisOptions` | `Record<string, unknown>` | NSIS options (when `portable` is `false`). |
| `env` | `Record<string, string>` | Environment variables (accessible via `process.env` in `electron-main.ts`). |
