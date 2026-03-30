# @simplysm/sd-cli

Monorepo build/check CLI tool -- TypeScript compilation, Angular builds, Capacitor/Electron packaging, publish to npm/storage.

## Installation

```bash
npm install @simplysm/sd-cli
```

## CLI Commands

All commands are run via `pnpm sd-cli <command>`. The `--debug` flag is available on all commands. Omitting `[targets..]` runs against all packages defined in `sd.config.ts`. Targets are specified by package name (e.g., `core-common`).

| Command | Description |
|---|---|
| `pnpm dev [targets..]` | Run server packages in development mode |
| `pnpm watch [targets..]` | Watch-build library packages |
| `pnpm build [targets..]` | Production build |
| `pnpm pub [targets..]` | Build and publish (npm/sftp) |
| `pnpm check [targets..]` | Run typecheck + lint + test in parallel |
| `pnpm typecheck [targets..]` | TypeScript type checking |
| `pnpm lint [targets..]` | ESLint |
| `pnpm test [targets..]` | Vitest single run |

## API Overview

The package exports configuration types for `sd.config.ts`.

### BuildTarget

```typescript
type BuildTarget = "node" | "browser" | "neutral";
```

Build target platform. Built with esbuild.

| Value | Description |
|---|---|
| `"node"` | Node.js only package |
| `"browser"` | Browser only package |
| `"neutral"` | Node/browser shared package |

### Publish Configuration Types

#### SdNpmPublishConfig

npm registry publish configuration.

| Field | Type | Description |
|---|---|---|
| `type` | `"npm"` | Publish type discriminator |

#### SdPublishConfig

```typescript
type SdPublishConfig = SdNpmPublishConfig | SdLocalDirectoryPublishConfig | SdStoragePublishConfig;
```

#### SdLocalDirectoryPublishConfig

Copy build output to a local directory.

| Field | Type | Description |
|---|---|---|
| `type` | `"local-directory"` | Publish type discriminator |
| `path` | `string` | Target path (supports `%VER%`, `%PROJECT%` substitution) |

#### SdStoragePublishConfig

Upload build output to FTP/FTPS/SFTP server.

| Field | Type | Description |
|---|---|---|
| `type` | `"ftp" \| "ftps" \| "sftp"` | Protocol |
| `host` | `string` | Server hostname |
| `port?` | `number` | Server port |
| `path?` | `string` | Remote path |
| `user?` | `string` | Username |
| `password?` | `string` | Password |

#### SdPostPublishScriptConfig

Script to run after publish completes.

| Field | Type | Description |
|---|---|---|
| `type` | `"script"` | Config type discriminator |
| `cmd` | `string` | Command to execute |
| `args` | `string[]` | Command arguments (supports `%VER%`, `%PROJECT%` substitution) |

### Package Configuration Types

#### SdBuildPackageConfig

Configuration for buildable packages (node/browser/neutral).

| Field | Type | Description |
|---|---|---|
| `target` | `BuildTarget` | Build target |
| `publish?` | `SdPublishConfig` | Publish configuration |
| `copySrc?` | `string[]` | Glob patterns for files to copy from `src/` to `dist/` |
| `watch?` | `SdWatchHookConfig` | Watch hook (runs alongside build engine in watch mode) |

#### SdClientPackageConfig

Configuration for client (Angular/Vite) packages.

| Field | Type | Description |
|---|---|---|
| `target` | `"client"` | Fixed value |
| `server` | `string \| number` | Server package name to connect to, or Vite port number |
| `env?` | `Record<string, string>` | Environment variables (replaces `process.env` at build time) |
| `publish?` | `SdPublishConfig` | Publish configuration |
| `capacitor?` | `SdCapacitorConfig` | Capacitor mobile build configuration |
| `electron?` | `SdElectronConfig` | Electron desktop build configuration |
| `configs?` | `Record<string, unknown>` | Runtime config (written to `dist/.config.json`) |
| `exclude?` | `string[]` | Packages to exclude from Vite optimizeDeps |
| `browserSupport?` | `SdBrowserSupportConfig` | Browser compatibility settings |
| `pwa?` | `false \| SdPwaConfig` | PWA configuration (`false` to disable, omit for defaults) |

#### SdServerPackageConfig

Configuration for server (Fastify) packages.

| Field | Type | Description |
|---|---|---|
| `target` | `"server"` | Fixed value |
| `env?` | `Record<string, string>` | Environment variables (replaces `process.env.KEY` with constants) |
| `publish?` | `SdPublishConfig` | Publish configuration |
| `configs?` | `Record<string, unknown>` | Runtime config (written to `dist/.config.json`) |
| `externals?` | `string[]` | Modules excluded from esbuild bundle (in addition to auto-detected native modules) |
| `pm2?` | `{ name?: string; ignoreWatchPaths?: string[] }` | PM2 config (generates `dist/pm2.config.cjs`) |
| `packageManager?` | `"volta" \| "mise"` | Package manager (affects mise.toml/volta settings) |

#### SdScriptsPackageConfig

Configuration for scripts-only packages (no build output).

| Field | Type | Description |
|---|---|---|
| `target` | `"scripts"` | Fixed value |
| `publish?` | `SdPublishConfig` | Publish configuration |
| `watch?` | `SdWatchHookConfig` | Watch hook (when set, package is included in watch mode) |

#### SdWatchHookConfig

Watch hook configuration for running commands on file changes.

| Field | Type | Description |
|---|---|---|
| `target` | `string[]` | Glob patterns to watch (relative to package directory) |
| `cmd` | `string` | Command to execute on change |
| `args?` | `string[]` | Command arguments |

#### SdPackageConfig

```typescript
type SdPackageConfig = SdBuildPackageConfig | SdClientPackageConfig | SdServerPackageConfig | SdScriptsPackageConfig;
```

### Capacitor Configuration Types

#### SdCapacitorConfig

| Field | Type | Description |
|---|---|---|
| `appId` | `string` | App ID (e.g., `"com.example.app"`) |
| `appName` | `string` | App display name |
| `plugins?` | `Record<string, Record<string, unknown> \| true>` | Capacitor plugin config (key: package name) |
| `icon?` | `string` | App icon path (relative to package directory) |
| `debug?` | `boolean` | Debug build flag |
| `platform?` | `{ android?: SdCapacitorAndroidConfig }` | Per-platform configuration |

#### SdCapacitorAndroidConfig

| Field | Type | Description |
|---|---|---|
| `config?` | `Record<string, string>` | AndroidManifest.xml application tag attributes |
| `bundle?` | `boolean` | Build AAB bundle (`true`) or APK (`false`) |
| `intentFilters?` | `SdCapacitorIntentFilter[]` | Intent filter configuration |
| `sign?` | `SdCapacitorSignConfig` | APK/AAB signing configuration |
| `sdkVersion?` | `number` | Android SDK version (minSdk, targetSdk) |
| `permissions?` | `SdCapacitorPermission[]` | Additional Android permissions |

#### SdCapacitorSignConfig

| Field | Type | Description |
|---|---|---|
| `keystore` | `string` | Keystore file path (relative to package directory) |
| `storePassword` | `string` | Keystore password |
| `alias` | `string` | Key alias |
| `password` | `string` | Key password |
| `keystoreType?` | `string` | Keystore type (default: `"jks"`) |

#### SdCapacitorPermission

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Permission name (e.g., `"CAMERA"`) |
| `maxSdkVersion?` | `number` | Maximum SDK version |
| `ignore?` | `string` | `tools:ignore` attribute value |

#### SdCapacitorIntentFilter

| Field | Type | Description |
|---|---|---|
| `action?` | `string` | Intent action (e.g., `"android.intent.action.VIEW"`) |
| `category?` | `string` | Intent category (e.g., `"android.intent.category.DEFAULT"`) |

### Electron Configuration Types

#### SdElectronConfig

| Field | Type | Description |
|---|---|---|
| `appId` | `string` | Electron app ID (e.g., `"com.example.myapp"`) |
| `portable?` | `boolean` | `true` for portable .exe, `false`/unspecified for NSIS installer |
| `installerIcon?` | `string` | Installer icon path (.ico, relative to package directory) |
| `reinstallDependencies?` | `string[]` | npm packages to include (native modules, etc.) |
| `postInstallScript?` | `string` | npm postinstall script |
| `nsisOptions?` | `Record<string, unknown>` | NSIS installer options |
| `env?` | `Record<string, string>` | Environment variables for electron-main.ts |

### PWA Configuration Types

#### SdPwaConfig

| Field | Type | Description |
|---|---|---|
| `manifest?` | `SdPwaManifestConfig` | PWA manifest options |
| `workbox?` | `SdPwaWorkboxConfig` | Workbox service worker options |

#### SdPwaManifestConfig

| Field | Type | Description |
|---|---|---|
| `name?` | `string` | App name |
| `short_name?` | `string` | Short app name |
| `display?` | `"standalone" \| "fullscreen" \| "minimal-ui" \| "browser"` | Display mode |
| `theme_color?` | `string` | Theme color |
| `background_color?` | `string` | Background color |
| `icons?` | `Array<{ src: string; sizes: string; type?: string }>` | App icons |

#### SdPwaWorkboxConfig

| Field | Type | Description |
|---|---|---|
| `globPatterns?` | `string[]` | Glob patterns for precaching |

### Browser Support Configuration

#### SdBrowserSupportConfig

| Field | Type | Description |
|---|---|---|
| `browserslist?` | `string \| string[]` | Browserslist query (e.g., `"last 2 Chrome versions"`) |
| `postCss?` | `{ plugins: unknown[] }` | PostCSS plugins configuration |
| `legacyModule?` | `boolean` | Legacy module support (disables code splitting + replaces `import.meta`) |

### Root Configuration Types

#### SdConfig

The main configuration object for `sd.config.ts`.

| Field | Type | Description |
|---|---|---|
| `packages` | `Record<string, SdPackageConfig \| undefined>` | Per-package configuration (key: subdirectory name under `packages/`) |
| `replaceDeps?` | `Record<string, string>` | Dependency replacement via symlink (key: package glob, value: source path. `*` wildcards are supported) |
| `postPublish?` | `SdPostPublishScriptConfig[]` | Scripts to run after deployment |

#### SdConfigParams

Parameters passed to the `sd.config.ts` function.

| Field | Type | Description |
|---|---|---|
| `cwd` | `string` | Current working directory |
| `dev` | `boolean` | Development mode flag |
| `options` | `string[]` | Additional options from CLI `-o` flag |

#### SdConfigFn

```typescript
type SdConfigFn = (params: SdConfigParams) => SdConfig | Promise<SdConfig>;
```

The type for the default export of `sd.config.ts`.

## Usage

### sd.config.ts Example

```typescript
import type { SdConfigFn, SdConfigParams } from "@simplysm/sd-cli";

const config: SdConfigFn = (params: SdConfigParams) => ({
  packages: {
    "core-common": { target: "neutral" },
    "core-node": { target: "node" },
    "my-client": {
      target: "client",
      server: "my-server",
      capacitor: {
        appId: "com.example.app",
        appName: "My App",
      },
    },
    "my-server": {
      target: "server",
      publish: { type: "npm" },
      pm2: { name: "my-server" },
    },
  },
  replaceDeps: {
    "@simplysm/*": "../simplysm/packages/*",
  },
});

export default config;
```
