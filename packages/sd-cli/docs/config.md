# Config

## `BuildTarget`

Build target type (built with esbuild).

```typescript
type BuildTarget = "node" | "browser" | "neutral";
```

| Value | Description |
|---|---|
| `"node"` | Node.js only package |
| `"browser"` | Browser only package |
| `"neutral"` | Node/browser shared package |

## `SdBuildPackageConfig`

Configuration for buildable packages (node/browser/neutral).

```typescript
interface SdBuildPackageConfig {
  target: BuildTarget;
  publish?: SdPublishConfig;
  copySrc?: string[];
  watch?: SdWatchHookConfig;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `target` | `BuildTarget` | Build target |
| `publish` | `SdPublishConfig` | Publish configuration |
| `copySrc` | `string[]` | Glob patterns for files to copy from `src/` to `dist/` (relative path based on `src/`) |
| `watch` | `SdWatchHookConfig` | Watch hook configuration (when set, hook runs alongside build engine in watch mode) |

## `SdClientPackageConfig`

Configuration for client (Angular/Vite) packages.

```typescript
interface SdClientPackageConfig {
  target: "client";
  framework?: "angular" | "solid";
  server: string | number;
  env?: Record<string, string>;
  publish?: SdPublishConfig;
  capacitor?: SdCapacitorConfig;
  electron?: SdElectronConfig;
  configs?: Record<string, unknown>;
  exclude?: string[];
  browserSupport?: SdBrowserSupportConfig;
  pwa?: false | SdPwaConfig;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `target` | `"client"` | Fixed value |
| `framework` | `"angular" \| "solid"` | Client framework selection. Defaults to `"angular"` when not specified |
| `server` | `string \| number` | Server package name to connect to (e.g., `"solid-demo-server"`), or Vite port number (backward compatibility) |
| `env` | `Record<string, string>` | Environment variables to substitute during build (replaces `process.env` with object) |
| `publish` | `SdPublishConfig` | Publish configuration |
| `capacitor` | `SdCapacitorConfig` | Capacitor mobile build configuration |
| `electron` | `SdElectronConfig` | Electron desktop build configuration |
| `configs` | `Record<string, unknown>` | Runtime config (written to `dist/.config.json` during build) |
| `exclude` | `string[]` | Packages to exclude from Vite optimizeDeps and add to Capacitor/Electron `package.json` |
| `browserSupport` | `SdBrowserSupportConfig` | Browser compatibility settings (browserslist, PostCSS, legacyModule) |
| `pwa` | `false \| SdPwaConfig` | PWA configuration. `false` to disable. Enabled with defaults when not specified |

## `SdServerPackageConfig`

Configuration for server (Fastify) packages.

```typescript
interface SdServerPackageConfig {
  target: "server";
  env?: Record<string, string>;
  publish?: SdPublishConfig;
  configs?: Record<string, unknown>;
  externals?: string[];
  pm2?: { name?: string; ignoreWatchPaths?: string[] };
  packageManager?: "volta" | "mise";
}
```

| Field | Type | Description |
|-------|------|-------------|
| `target` | `"server"` | Fixed value |
| `env` | `Record<string, string>` | Environment variables to substitute during build (replaces `process.env.KEY` with constant) |
| `publish` | `SdPublishConfig` | Publish configuration |
| `configs` | `Record<string, unknown>` | Runtime config (written to `dist/.config.json` during build) |
| `externals` | `string[]` | External modules not to include in esbuild bundle (in addition to automatic `binding.gyp` detection) |
| `pm2` | `{ name?: string; ignoreWatchPaths?: string[] }` | PM2 configuration (generates `dist/pm2.config.cjs` when specified). `name` defaults to a name generated from `package.json` |
| `packageManager` | `"volta" \| "mise"` | Package manager to use (affects `mise.toml` or `volta` settings generation) |

## `SdScriptsPackageConfig`

Configuration for scripts-only packages (excluded from watch/typecheck unless watch hook is configured).

```typescript
interface SdScriptsPackageConfig {
  target: "scripts";
  publish?: SdPublishConfig;
  watch?: SdWatchHookConfig;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `target` | `"scripts"` | Fixed value |
| `publish` | `SdPublishConfig` | Publish configuration |
| `watch` | `SdWatchHookConfig` | Watch hook configuration (when set, package is included in watch mode) |

## `SdWatchHookConfig`

Watch hook configuration for running commands on file changes.

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

## `SdPackageConfig`

Union of all package configuration types. Discriminated by the `target` field.

```typescript
type SdPackageConfig =
  | SdBuildPackageConfig
  | SdClientPackageConfig
  | SdServerPackageConfig
  | SdScriptsPackageConfig;
```

| Variant | Discriminant (`target`) |
|---------|------------------------|
| `SdBuildPackageConfig` | `"node"`, `"browser"`, `"neutral"` |
| `SdClientPackageConfig` | `"client"` |
| `SdServerPackageConfig` | `"server"` |
| `SdScriptsPackageConfig` | `"scripts"` |

## `SdConfig`

The main configuration object for `sd.config.ts`.

```typescript
interface SdConfig {
  packages: Record<string, SdPackageConfig | undefined>;
  replaceDeps?: Record<string, string>;
  postPublish?: SdPostPublishScriptConfig[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `packages` | `Record<string, SdPackageConfig \| undefined>` | Per-package configuration (key: subdirectory name under `packages/`, e.g., `"core-common"`) |
| `replaceDeps` | `Record<string, string>` | Dependency replacement configuration (replace `node_modules` packages with local sources via symlink). Key is a package glob pattern (e.g., `"@simplysm/*"`), value is a source directory path. Captured values from key's `*` are substituted into value's `*` |
| `postPublish` | `SdPostPublishScriptConfig[]` | Scripts to execute after deployment completes |

## `SdConfigParams`

Parameters passed to the `sd.config.ts` function.

```typescript
interface SdConfigParams {
  cwd: string;
  dev: boolean;
  opt: string[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `cwd` | `string` | Current working directory |
| `dev` | `boolean` | Development mode flag |
| `opt` | `string[]` | Additional options (from CLI's `-o` flag) |

## `SdConfigFn`

The type for the default export of `sd.config.ts`.

```typescript
type SdConfigFn = (params: SdConfigParams) => SdConfig | Promise<SdConfig>;
```

## `SdBrowserSupportConfig`

Browser support configuration for client packages.

```typescript
interface SdBrowserSupportConfig {
  browserslist?: string | string[];
  postCss?: { plugins: unknown[] };
  legacyModule?: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `browserslist` | `string \| string[]` | Browserslist query (e.g., `"last 2 Chrome versions"` or `["ie 11", "last 2 versions"]`) |
| `postCss` | `{ plugins: unknown[] }` | PostCSS plugins configuration |
| `legacyModule` | `boolean` | Legacy module support (disables code splitting + replaces `import.meta`) |

## `SdCapacitorConfig`

Capacitor configuration.

```typescript
interface SdCapacitorConfig {
  appId: string;
  appName: string;
  plugins?: Record<string, Record<string, unknown> | true>;
  icon?: string;
  debug?: boolean;
  platform?: { android?: SdCapacitorAndroidConfig };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `appId` | `string` | App ID (e.g., `"com.example.app"`) |
| `appName` | `string` | App display name |
| `plugins` | `Record<string, Record<string, unknown> \| true>` | Capacitor plugin configuration (key: package name, value: `true` or plugin options) |
| `icon` | `string` | App icon path (relative to package directory) |
| `debug` | `boolean` | Debug build flag |
| `platform` | `{ android?: SdCapacitorAndroidConfig }` | Per-platform configuration |

## `SdCapacitorAndroidConfig`

Capacitor Android platform configuration.

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
| `config` | `Record<string, string>` | `AndroidManifest.xml` application tag attributes (e.g., `{ requestLegacyExternalStorage: "true" }`) |
| `bundle` | `boolean` | AAB bundle build flag (`true` for AAB, `false` for APK) |
| `intentFilters` | `SdCapacitorIntentFilter[]` | Intent Filter configuration |
| `sign` | `SdCapacitorSignConfig` | APK/AAB signing configuration |
| `sdkVersion` | `number` | Android SDK version (minSdk, targetSdk) |
| `permissions` | `SdCapacitorPermission[]` | Additional permission configuration |

## `SdCapacitorSignConfig`

Capacitor Android sign configuration.

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

Capacitor Android permission configuration.

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

Capacitor Android Intent Filter configuration.

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

Electron configuration.

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
| `portable` | `boolean` | `true` for portable `.exe`, `false`/unspecified for NSIS installer |
| `installerIcon` | `string` | Installer icon path (`.ico`, relative to package directory) |
| `reinstallDependencies` | `string[]` | npm packages to include in Electron (native modules, etc.) |
| `postInstallScript` | `string` | npm postinstall script |
| `nsisOptions` | `Record<string, unknown>` | NSIS options (when `portable` is `false`) |
| `env` | `Record<string, string>` | Environment variables (accessible via `process.env` in `electron-main.ts`) |
