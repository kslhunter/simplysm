# @simplysm/sd-cli

CLI tool -- monorepo build, dev server, publish, and code quality tooling for Simplysm projects.

## Installation

```bash
npm install @simplysm/sd-cli
```

## API Overview

### Configuration Types

| API | Type | Description |
|-----|------|-------------|
| `SdConfigFn` | type | Type of the default export function in sd.config.ts |
| `SdConfig` | interface | Root `sd.config.ts` configuration |
| `SdConfigParams` | interface | Parameters passed to sd.config.ts function |
| `SdPackageConfig` | type | Union of all package configs |
| `BuildTarget` | type | Build target: `"node"`, `"browser"`, `"neutral"` |
| `SdBuildPackageConfig` | interface | Package config for node/browser/neutral targets |
| `SdClientPackageConfig` | interface | Client package configuration (Vite dev server) |
| `SdServerPackageConfig` | interface | Server package configuration (Fastify server) |
| `SdScriptsPackageConfig` | interface | Scripts-only package configuration |
| `SdWatchHookConfig` | interface | Watch hook configuration for scripts packages |
| `SdPublishConfig` | type | Union of all publish configs (npm, local-directory, storage) |
| `SdNpmPublishConfig` | interface | npm registry publish configuration |
| `SdLocalDirectoryPublishConfig` | interface | Copy to local directory publish configuration |
| `SdStoragePublishConfig` | interface | FTP/FTPS/SFTP publish configuration |
| `SdPostPublishScriptConfig` | interface | Post-publish script configuration |
| `SdCapacitorConfig` | interface | Capacitor configuration (appId, plugins, icon, platform) |
| `SdCapacitorAndroidConfig` | interface | Capacitor Android platform configuration |
| `SdCapacitorSignConfig` | interface | Capacitor Android APK/AAB signing configuration |
| `SdCapacitorPermission` | interface | Capacitor Android permission configuration |
| `SdCapacitorIntentFilter` | interface | Capacitor Android Intent Filter configuration |
| `SdElectronConfig` | interface | Electron configuration (appId, portable, installer) |

### Vite Utilities

| API | Type | Description |
|-----|------|-------------|
| `ViteConfigOptions` | interface | Options for creating Vite config |
| `createViteConfig` | function | Create Vite config for SolidJS + TailwindCSS client packages |

## `SdConfigFn`

```typescript
type SdConfigFn = (params: SdConfigParams) => SdConfig | Promise<SdConfig>;
```

The `sd.config.ts` file must default-export a function of this type.

## `SdConfig`

```typescript
interface SdConfig {
  packages: Record<string, SdPackageConfig | undefined>;
  replaceDeps?: Record<string, string>;
  postPublish?: SdPostPublishScriptConfig[];
}
```

Root configuration type for `sd.config.ts`.

| Field | Type | Description |
|-------|------|-------------|
| `packages` | `Record<string, SdPackageConfig \| undefined>` | Per-package configuration. Key is subdirectory name under `packages/` (e.g., `"core-common"`) |
| `replaceDeps` | `Record<string, string>` | Dependency replacement configuration. Replaces `node_modules` packages with local sources via symlink. Key is a package glob pattern (e.g., `"@simplysm/*"`), value is a source directory path (captured `*` values are substituted into value's `*`) |
| `postPublish` | `SdPostPublishScriptConfig[]` | Scripts to execute after deployment completes |

## `SdConfigParams`

```typescript
interface SdConfigParams {
  cwd: string;
  dev: boolean;
  options: string[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `cwd` | `string` | Current working directory |
| `dev` | `boolean` | Development mode flag |
| `options` | `string[]` | Additional options from CLI's `-o` flag |

## `BuildTarget`

```typescript
type BuildTarget = "node" | "browser" | "neutral";
```

- `node`: Node.js only package
- `browser`: browser only package
- `neutral`: Node/browser shared package

## `SdPackageConfig`

```typescript
type SdPackageConfig =
  | SdBuildPackageConfig
  | SdClientPackageConfig
  | SdServerPackageConfig
  | SdScriptsPackageConfig;
```

Discriminated by the `target` field: `"node"` | `"browser"` | `"neutral"` for build, `"client"` for client, `"server"` for server, `"scripts"` for scripts.

## `SdBuildPackageConfig`

```typescript
interface SdBuildPackageConfig {
  target: BuildTarget;
  publish?: SdPublishConfig;
  copySrc?: string[];
}
```

Configuration for library packages built with esbuild.

| Field | Type | Description |
|-------|------|-------------|
| `target` | `"node" \| "browser" \| "neutral"` | Build target |
| `publish` | `SdPublishConfig` | Publish configuration |
| `copySrc` | `string[]` | Glob patterns for files to copy from `src/` to `dist/` (relative path based on `src/`) |

## `SdClientPackageConfig`

```typescript
interface SdClientPackageConfig {
  target: "client";
  server: string | number;
  env?: Record<string, string>;
  publish?: SdPublishConfig;
  capacitor?: SdCapacitorConfig;
  electron?: SdElectronConfig;
  configs?: Record<string, unknown>;
  exclude?: string[];
}
```

Configuration for client (browser) application packages using Vite dev server.

| Field | Type | Description |
|-------|------|-------------|
| `target` | `"client"` | Build target (literal) |
| `server` | `string \| number` | Server package name to connect to (e.g., `"solid-demo-server"`) or Vite port number directly |
| `env` | `Record<string, string>` | Environment variables to substitute during build (replaces `process.env` with object) |
| `publish` | `SdPublishConfig` | Publish configuration |
| `capacitor` | `SdCapacitorConfig` | Capacitor mobile app configuration |
| `electron` | `SdElectronConfig` | Electron desktop app configuration |
| `configs` | `Record<string, unknown>` | Runtime config (written to `dist/.config.json` during build) |
| `exclude` | `string[]` | Packages to exclude from Vite `optimizeDeps` and add to Capacitor/Electron `package.json` |

## `SdServerPackageConfig`

```typescript
interface SdServerPackageConfig {
  target: "server";
  env?: Record<string, string>;
  publish?: SdPublishConfig;
  configs?: Record<string, unknown>;
  externals?: string[];
  pm2?: {
    name?: string;
    ignoreWatchPaths?: string[];
  };
  packageManager?: "volta" | "mise";
}
```

Configuration for server (Fastify) application packages.

| Field | Type | Description |
|-------|------|-------------|
| `target` | `"server"` | Build target (literal) |
| `env` | `Record<string, string>` | Environment variables to substitute during build (replaces `process.env.KEY` with constant) |
| `publish` | `SdPublishConfig` | Publish configuration |
| `configs` | `Record<string, unknown>` | Runtime config (written to `dist/.config.json` during build) |
| `externals` | `string[]` | External modules not to include in esbuild bundle (in addition to automatic `binding.gyp` detection) |
| `pm2` | `object` | PM2 configuration (generates `dist/pm2.config.cjs` when specified) |
| `pm2.name` | `string` | PM2 process name (generated from `package.json` name if unspecified) |
| `pm2.ignoreWatchPaths` | `string[]` | Paths to exclude from PM2 watch |
| `packageManager` | `"volta" \| "mise"` | Package manager to use (affects `mise.toml` or volta settings generation) |

## `SdScriptsPackageConfig`

```typescript
interface SdScriptsPackageConfig {
  target: "scripts";
  publish?: SdPublishConfig;
  watch?: SdWatchHookConfig;
}
```

Configuration for scripts-only packages (excluded from watch/typecheck unless watch hook is configured).

| Field | Type | Description |
|-------|------|-------------|
| `target` | `"scripts"` | Build target (literal) |
| `publish` | `SdPublishConfig` | Publish configuration |
| `watch` | `SdWatchHookConfig` | Watch hook configuration (when set, package is included in watch mode) |

## `SdWatchHookConfig`

```typescript
interface SdWatchHookConfig {
  target: string[];
  cmd: string;
  args?: string[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `target` | `string[]` | Glob patterns to watch (relative to package directory) |
| `cmd` | `string` | Command to execute on change |
| `args` | `string[]` | Command arguments |

## `SdPublishConfig`

```typescript
type SdPublishConfig =
  | SdNpmPublishConfig
  | SdLocalDirectoryPublishConfig
  | SdStoragePublishConfig;
```

Discriminated by the `type` field.

## `SdNpmPublishConfig`

```typescript
interface SdNpmPublishConfig {
  type: "npm";
}
```

Publish to npm registry.

## `SdLocalDirectoryPublishConfig`

```typescript
interface SdLocalDirectoryPublishConfig {
  type: "local-directory";
  path: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"local-directory"` | Discriminator |
| `path` | `string` | Deployment target path (supports variable substitution: `%VER%`, `%PROJECT%`) |

## `SdStoragePublishConfig`

```typescript
interface SdStoragePublishConfig {
  type: "ftp" | "ftps" | "sftp";
  host: string;
  port?: number;
  path?: string;
  user?: string;
  password?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"ftp" \| "ftps" \| "sftp"` | Storage protocol |
| `host` | `string` | Server hostname |
| `port` | `number` | Server port |
| `path` | `string` | Remote directory path |
| `user` | `string` | Username |
| `password` | `string` | Password |

## `SdPostPublishScriptConfig`

```typescript
interface SdPostPublishScriptConfig {
  type: "script";
  cmd: string;
  args: string[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"script"` | Discriminator |
| `cmd` | `string` | Command to execute |
| `args` | `string[]` | Command arguments (supports variable substitution: `%VER%`, `%PROJECT%`) |

## `SdCapacitorConfig`

```typescript
interface SdCapacitorConfig {
  appId: string;
  appName: string;
  plugins?: Record<string, Record<string, unknown> | true>;
  icon?: string;
  debug?: boolean;
  platform?: {
    android?: SdCapacitorAndroidConfig;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `appId` | `string` | App ID (e.g., `"com.example.app"`) |
| `appName` | `string` | App name |
| `plugins` | `Record<string, Record<string, unknown> \| true>` | Capacitor plugin configuration. Key is package name, value is `true` or plugin options |
| `icon` | `string` | App icon path (relative to package directory) |
| `debug` | `boolean` | Debug build flag |
| `platform` | `object` | Per-platform configuration |
| `platform.android` | `SdCapacitorAndroidConfig` | Android platform configuration |

## `SdCapacitorAndroidConfig`

```typescript
interface SdCapacitorAndroidConfig {
  config?: Record<string, string>;
  bundle?: boolean;
  intentFilters?: SdCapacitorIntentFilter[];
  sign?: SdCapacitorSignConfig;
  sdkVersion?: number;
  permissions?: SdCapacitorPermission[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `config` | `Record<string, string>` | AndroidManifest.xml application tag attributes (e.g., `{ requestLegacyExternalStorage: "true" }`) |
| `bundle` | `boolean` | AAB bundle build flag (`false` for APK) |
| `intentFilters` | `SdCapacitorIntentFilter[]` | Intent Filter configuration |
| `sign` | `SdCapacitorSignConfig` | APK/AAB signing configuration |
| `sdkVersion` | `number` | Android SDK version (minSdk, targetSdk) |
| `permissions` | `SdCapacitorPermission[]` | Additional permission configuration |

## `SdCapacitorSignConfig`

```typescript
interface SdCapacitorSignConfig {
  keystore: string;
  storePassword: string;
  alias: string;
  password: string;
  keystoreType?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `keystore` | `string` | Keystore file path (relative to package directory) |
| `storePassword` | `string` | Keystore password |
| `alias` | `string` | Key alias |
| `password` | `string` | Key password |
| `keystoreType` | `string` | Keystore type (default: `"jks"`) |

## `SdCapacitorPermission`

```typescript
interface SdCapacitorPermission {
  name: string;
  maxSdkVersion?: number;
  ignore?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Permission name (e.g., `"CAMERA"`, `"WRITE_EXTERNAL_STORAGE"`) |
| `maxSdkVersion` | `number` | Maximum SDK version |
| `ignore` | `string` | `tools:ignore` attribute value |

## `SdCapacitorIntentFilter`

```typescript
interface SdCapacitorIntentFilter {
  action?: string;
  category?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `action` | `string` | Intent action (e.g., `"android.intent.action.VIEW"`) |
| `category` | `string` | Intent category (e.g., `"android.intent.category.DEFAULT"`) |

## `SdElectronConfig`

```typescript
interface SdElectronConfig {
  appId: string;
  portable?: boolean;
  installerIcon?: string;
  reinstallDependencies?: string[];
  postInstallScript?: string;
  nsisOptions?: Record<string, unknown>;
  env?: Record<string, string>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `appId` | `string` | Electron app ID (e.g., `"com.example.myapp"`) |
| `portable` | `boolean` | Portable `.exe` (`true`) or NSIS installer (`false`/unspecified) |
| `installerIcon` | `string` | Installer icon path (`.ico`, relative to package directory) |
| `reinstallDependencies` | `string[]` | npm packages to include in Electron (native modules, etc.) |
| `postInstallScript` | `string` | npm postinstall script |
| `nsisOptions` | `Record<string, unknown>` | NSIS options (when `portable` is `false`) |
| `env` | `Record<string, string>` | Environment variables (accessible via `process.env` in `electron-main.ts`) |

## `ViteConfigOptions`

```typescript
interface ViteConfigOptions {
  pkgDir: string;
  name: string;
  tsconfigPath: string;
  compilerOptions: Record<string, unknown>;
  env?: Record<string, string>;
  mode: "build" | "dev";
  serverPort?: number;
  replaceDeps?: string[];
  onScopeRebuild?: () => void;
  outDir?: string;
  base?: string;
  exclude?: string[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `pkgDir` | `string` | Package directory path |
| `name` | `string` | Package name |
| `tsconfigPath` | `string` | Path to tsconfig.json |
| `compilerOptions` | `Record<string, unknown>` | TypeScript compiler options |
| `env` | `Record<string, string>` | Environment variables |
| `mode` | `"build" \| "dev"` | Build mode or dev server mode |
| `serverPort` | `number` | Server port in dev mode (0 for auto-assign) |
| `replaceDeps` | `string[]` | Array of replaceDeps package names (resolved state) |
| `onScopeRebuild` | `() => void` | Callback when replaceDeps package dist changes |
| `outDir` | `string` | Override `build.outDir` (e.g., `".capacitor/www"` for Capacitor builds) |
| `base` | `string` | Override base path (e.g., `"./"` for Capacitor builds) |
| `exclude` | `string[]` | Packages to exclude from Vite optimizeDeps pre-bundling |

## `createViteConfig`

```typescript
function createViteConfig(options: ViteConfigOptions): ViteUserConfig;
```

Create Vite config for SolidJS + TailwindCSS client packages. Includes plugins for tsconfig paths, SolidJS, PWA, scope package watching, Tailwind config dependency tracking, and public-dev directory serving.

## Usage Examples

### Define sd.config.ts

```typescript
import type { SdConfigFn } from "@simplysm/sd-cli";

const config: SdConfigFn = (params) => ({
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
  replaceDeps: {
    "@simplysm/*": "../simplysm/packages/*",
  },
});

export default config;
```

### Server package with full configuration

```typescript
import type { SdConfigFn } from "@simplysm/sd-cli";

const config: SdConfigFn = (params) => ({
  packages: {
    "my-server": {
      target: "server",
      env: { NODE_ENV: params.dev ? "development" : "production" },
      configs: { dbHost: "localhost", dbPort: 3306 },
      externals: ["better-sqlite3"],
      pm2: {
        name: "my-server",
        ignoreWatchPaths: ["logs", "uploads"],
      },
      packageManager: "mise",
      publish: {
        type: "sftp",
        host: "deploy.example.com",
        port: 22,
        path: "/app/my-server",
        user: "deploy",
        password: "secret",
      },
    },
  },
});

export default config;
```

### Client package with Capacitor

```typescript
import type { SdConfigFn } from "@simplysm/sd-cli";

const config: SdConfigFn = (params) => ({
  packages: {
    "my-app": {
      target: "client",
      server: "my-server",
      configs: { apiUrl: "https://api.example.com" },
      exclude: ["better-sqlite3"],
      capacitor: {
        appId: "com.example.myapp",
        appName: "My App",
        icon: "resources/icon.png",
        plugins: {
          "@capacitor/camera": true,
          "@capacitor/filesystem": { directory: "Documents" },
        },
        platform: {
          android: {
            sdkVersion: 33,
            bundle: true,
            permissions: [
              { name: "CAMERA" },
              { name: "WRITE_EXTERNAL_STORAGE", maxSdkVersion: 28 },
            ],
            intentFilters: [
              { action: "android.intent.action.VIEW", category: "android.intent.category.DEFAULT" },
            ],
            sign: {
              keystore: "keystore.jks",
              storePassword: "pass",
              alias: "key0",
              password: "pass",
            },
          },
        },
      },
    },
  },
});

export default config;
```

### Client package with Electron

```typescript
import type { SdConfigFn } from "@simplysm/sd-cli";

const config: SdConfigFn = (params) => ({
  packages: {
    "my-desktop": {
      target: "client",
      server: "my-server",
      electron: {
        appId: "com.example.mydesktop",
        portable: false,
        installerIcon: "resources/icon.ico",
        reinstallDependencies: ["better-sqlite3"],
        env: { APP_MODE: "desktop" },
      },
    },
  },
});

export default config;
```

### Create a Vite config for a client package

```typescript
import { createViteConfig } from "@simplysm/sd-cli";

const config = createViteConfig({
  pkgDir: "/path/to/my-client",
  name: "my-client",
  tsconfigPath: "/path/to/my-client/tsconfig.json",
  compilerOptions: { jsx: "preserve" },
  mode: "dev",
  serverPort: 3000,
});
```
