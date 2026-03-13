# @simplysm/sd-cli

Build, check, publish, and deploy tool for Simplysm monorepo projects. Provides a single `sd-cli` binary that orchestrates TypeScript compilation, Angular bundling, ESLint checks, npm publishing, and native mobile packaging (Electron, Cordova, Capacitor).

## Installation

```bash
npm install @simplysm/sd-cli
# or
yarn add @simplysm/sd-cli
```

## Project Configuration

sd-cli reads a JavaScript config file (default: `simplysm.js`) at the project root. The file must export a default function that returns an `ISdProjectConfig` object.

```js
// simplysm.js
export default (isDev, options) => ({
  packages: {
    "my-core": {
      type: "library",
      publish: "npm",
    },
    "my-server": {
      type: "server",
      publish: {
        type: "sftp",
        host: "example.com",
        user: "deploy",
        pass: process.env.DEPLOY_PASS,
      },
    },
    "my-client": {
      type: "client",
      server: "my-server",
      builder: {
        web: {},
        electron: {
          appId: "com.example.myapp",
        },
        capacitor: {
          appId: "com.example.myapp",
          appName: "My App",
          platform: { android: {} },
        },
      },
    },
  },
  localUpdates: {
    "@someorg/*": "C:/libs/someorg/*/dist",
  },
  postPublish: [
    { type: "script", cmd: "echo", args: ["done"] },
  ],
});
```

### ISdProjectConfig

| Property | Type | Description |
|---|---|---|
| `packages` | `Record<string, TSdPackageConfig>` | Package name to config mapping. Keys must match workspace directory names. |
| `localUpdates` | `Record<string, string>` | Glob-to-path mapping for syncing local library builds into `node_modules`. |
| `postPublish` | `TSdPostPublishConfig[]` | Scripts to run after all packages are published. Supports `%SD_VERSION%` and `%SD_PROJECT_PATH%` placeholders. |

### Package Types

#### Library (`type: "library"`)

| Property | Type | Default | Description |
|---|---|---|---|
| `type` | `"library"` | | Package type identifier. |
| `publish` | `"npm"` | | Publish to npm registry. |
| `polyfills` | `string[]` | | Modules to include as polyfills. |
| `index` | `{ excludes?: string[] } \| false` | | Auto-generated `index.ts` config. Set `false` to disable. |
| `dbContext` | `string` | | Database context class name for auto-generated DB context file. |
| `forceProductionMode` | `boolean` | | Force production mode regardless of dev/prod flag. |

#### Server (`type: "server"`)

| Property | Type | Default | Description |
|---|---|---|---|
| `type` | `"server"` | | Package type identifier. |
| `publish` | `ISdLocalDirectoryPublishConfig \| ISdFtpPublishConfig` | | Deploy target configuration. |
| `externals` | `string[]` | | Modules to exclude from the server bundle. |
| `configs` | `Record<string, any>` | | Arbitrary config values injected at build time. |
| `env` | `Record<string, string>` | | Environment variables set during build. |
| `forceProductionMode` | `boolean` | | Force production mode. |
| `pm2` | `object` | | PM2 process manager settings (`name`, `ignoreWatchPaths`, `noInterpreter`, `noStartScript`). |
| `iis` | `object` | | IIS hosting settings (`nodeExeFilePath`). |

#### Client (`type: "client"`)

| Property | Type | Default | Description |
|---|---|---|---|
| `type` | `"client"` | | Package type identifier. |
| `server` | `string \| { port: number }` | | Server package name to proxy to, or a fixed port. |
| `publish` | `ISdLocalDirectoryPublishConfig \| ISdFtpPublishConfig` | | Deploy target configuration. |
| `env` | `Record<string, string>` | | Environment variables set during build. |
| `configs` | `Record<string, any>` | | Arbitrary config values injected at build time. |
| `noLazyRoute` | `boolean` | | Disable automatic lazy route generation. |
| `forceProductionMode` | `boolean` | | Force production mode. |
| `builder.web` | `ISdClientBuilderWebConfig` | | Web build options (environment variables). |
| `builder.electron` | `ISdClientBuilderElectronConfig` | | Electron desktop build options. |
| `builder.capacitor` | `ISdClientBuilderCapacitorConfig` | | Capacitor mobile build options. |
| `builder.cordova` | `ISdClientBuilderCordovaConfig` | | **(Deprecated)** Cordova mobile build options. |

### Publish Targets

**Local Directory**
```js
{ type: "local-directory", path: "C:/deploy/%SD_VERSION%" }
```

**FTP / FTPS / SFTP**
```js
{ type: "sftp", host: "example.com", port: 22, path: "/var/www", user: "deploy", pass: "secret" }
```

**npm**
```js
"npm"
```

## CLI Commands

All commands support the `--debug` flag for verbose logging and `--config <path>` to specify a config file (default: `simplysm.js`).

### watch

Watch-build all configured packages with incremental compilation.

```bash
sd-cli watch [options]
```

| Option | Type | Default | Description |
|---|---|---|---|
| `--config` | `string` | `simplysm.js` | Config file path. |
| `--options` | `string[]` | | Custom options passed to the config function. |
| `--packages` | `string[]` | | Filter to specific packages by name. |
| `--emitOnly` | `boolean` | `false` | Emit output only (skip type checking). |
| `--noEmit` | `boolean` | `false` | Type check only (skip output emission). |

```bash
# Watch all packages
sd-cli watch

# Watch a specific package
sd-cli watch --packages sd-angular

# Emit only (faster, no checks)
sd-cli watch --emitOnly

# Check only (no emit)
sd-cli watch --noEmit
```

### build

Production build for all configured packages. Automatically increments the patch version.

```bash
sd-cli build [options]
```

| Option | Type | Default | Description |
|---|---|---|---|
| `--config` | `string` | `simplysm.js` | Config file path. |
| `--options` | `string[]` | | Custom options passed to the config function. |
| `--packages` | `string[]` | | Filter to specific packages by name. |

### check

Run type checking and/or linting on packages.

```bash
sd-cli check [path] [options]
```

| Option | Type | Default | Description |
|---|---|---|---|
| `[path]` | `string` | | Package directory or file path to check. If omitted, checks all packages. |
| `--config` | `string` | `simplysm.js` | Config file path. |
| `--options` | `string[]` | | Custom options passed to the config function. |
| `--type` | `"lint" \| "typecheck"` | *(both)* | Run only lint or only typecheck. |

```bash
# Check all packages (typecheck + lint)
sd-cli check

# Check a specific package
sd-cli check packages/sd-core-common

# Lint only
sd-cli check --type lint

# Typecheck only
sd-cli check --type typecheck
```

### publish

Build and publish all configured packages. Handles version bumping, git tagging, and deployment to npm / FTP / local directory.

```bash
sd-cli publish [options]
```

| Option | Type | Default | Description |
|---|---|---|---|
| `--config` | `string` | `simplysm.js` | Config file path. |
| `--options` | `string[]` | | Custom options passed to the config function. |
| `--packages` | `string[]` | | Filter to specific packages by name. |
| `--noBuild` | `boolean` | `false` | Skip building before publishing (dangerous). |

The publish workflow:
1. Validates npm/yarn authentication tokens (for npm targets).
2. Checks for uncommitted git changes.
3. Increments the patch version across all workspace packages.
4. Builds all packages.
5. Creates a git commit and tag for the new version.
6. Pushes to the remote repository.
7. Publishes each package to its configured target.
8. Runs `postPublish` scripts if configured.

### local-update

Copy local library builds into `node_modules` based on the `localUpdates` config.

```bash
sd-cli local-update [options]
```

| Option | Type | Default | Description |
|---|---|---|---|
| `--config` | `string` | `simplysm.js` | Config file path. |
| `--options` | `string[]` | | Custom options passed to the config function. |

### run-electron

Launch a watched client package as an Electron desktop app (development mode).

```bash
sd-cli run-electron <package> [options]
```

| Option | Type | Description |
|---|---|---|
| `<package>` | `string` | Package name (required). |
| `--config` | `string` | Config file path. |
| `--options` | `string[]` | Custom options passed to the config function. |

### build-electron-for-dev

Build an Electron installer from a watched client package (development build).

```bash
sd-cli build-electron-for-dev <package> [options]
```

| Option | Type | Description |
|---|---|---|
| `<package>` | `string` | Package name (required). |
| `--config` | `string` | Config file path. |
| `--options` | `string[]` | Custom options passed to the config function. |

### run-cordova *(deprecated)*

Deploy a watched client package to a Cordova device.

```bash
sd-cli run-cordova <platform> <package> [url]
```

| Option | Type | Description |
|---|---|---|
| `<platform>` | `string` | Target platform (e.g., `android`). |
| `<package>` | `string` | Package name. |
| `[url]` | `string` | URL to open in the webview. |

### run-capacitor

Deploy a watched client package to a Capacitor device.

```bash
sd-cli run-capacitor <platform> <package> [url]
```

| Option | Type | Description |
|---|---|---|
| `<platform>` | `string` | Target platform (e.g., `android`). |
| `<package>` | `string` | Package name. |
| `[url]` | `string` | URL to open in the webview. |

### commit

Use AI (Claude Haiku) to generate a commit message from staged changes, then commit automatically.

```bash
sd-cli commit
```

Requires the `ANTHROPIC_API_KEY` environment variable to be set.

### postinstall

Run post-install patches on dependencies. This is typically called automatically after `yarn install`.

```bash
sd-cli postinstall
```

## Electron Builder Configuration

The `builder.electron` config for client packages supports:

| Property | Type | Description |
|---|---|---|
| `appId` | `string` | Application identifier (e.g., `com.example.app`). |
| `installerIcon` | `string` | Path to the installer icon file (relative to the package). |
| `portable` | `boolean` | Build a portable `.exe` instead of an NSIS installer. |
| `postInstallScript` | `string` | Script to run after npm install in the Electron context. |
| `nsisOptions` | `electronBuilder.NsisOptions` | NSIS installer options (pass-through to electron-builder). |
| `reinstallDependencies` | `string[]` | Dependencies to reinstall with native rebuild in the Electron context. |
| `env` | `Record<string, string>` | Environment variables for the Electron build. |

## Capacitor Builder Configuration

The `builder.capacitor` config for client packages supports:

| Property | Type | Description |
|---|---|---|
| `appId` | `string` | Application identifier (e.g., `com.example.app`). |
| `appName` | `string` | Display name of the application. |
| `plugins` | `Record<string, Record<string, unknown> \| true>` | Capacitor plugins with their configuration. Use `true` for no-config plugins. |
| `icon` | `string` | Path to the app icon (relative to the package). |
| `debug` | `boolean` | Build in debug mode. |
| `platform.android.config` | `Record<string, string>` | Additional Android application manifest attributes. |
| `platform.android.bundle` | `boolean` | Build an AAB bundle instead of APK. |
| `platform.android.sign` | `object` | Signing configuration (`keystore`, `storePassword`, `alias`, `password`, `keystoreType`). |
| `platform.android.sdkVersion` | `number` | Target Android SDK version. |
| `platform.android.permissions` | `array` | Android permissions (`name`, `maxSdkVersion`, `ignore`). |
| `platform.android.intentFilters` | `array` | Android intent filters (`action`, `category`). |
| `env` | `Record<string, string>` | Environment variables. |
| `browserslist` | `string[]` | Browserslist targets. |

## Process Behavior

- On Windows, sd-cli automatically configures processor affinity (reserves 1 out of every 4 cores for the OS) and sets process priority to BelowNormal to avoid monopolizing system resources.
- Node.js is launched with `--max-old-space-size=8192` for large project builds.
- The `local-update` command runs automatically before other commands in production builds.
