# @simplysm/cli

The CLI tool for the Simplysm framework. It provides project initialization, ESLint linting, TypeScript type-checking, library/client/server package builds, development mode, deployment, Android device execution, and Electron desktop app build capabilities.

## Installation

```bash
npm install --save-dev @simplysm/cli
# or
pnpm add -D @simplysm/cli
```

## Main Commands

The CLI binary name is `sd-cli`. All commands support the `--debug` option to output detailed logs.

### lint

Runs ESLint. It automatically extracts and applies globalIgnores patterns from `eslint.config.ts` and stores cache in `.cache/eslint.cache`.

```bash
# Lint all
sd-cli lint

# Lint specific path
sd-cli lint packages/core-common

# Lint multiple paths
sd-cli lint packages/core-common tests/orm

# Auto-fix
sd-cli lint --fix

# Output rule execution times
sd-cli lint --timing
```

**Options:**

| Option     | Description                                                | Default |
| ---------- | ---------------------------------------------------------- | ------- |
| `--fix`    | Auto-fix                                                   | `false` |
| `--timing` | Output rule execution times (sets ESLint `TIMING` env var) | `false` |
| `--debug`  | Output debug logs                                          | `false` |

### typecheck

Runs TypeScript type-checking. It performs parallel type-checking per package environment (`node`/`browser`) based on `tsconfig.json` and `sd.config.ts`. Uses worker threads to run concurrently up to 7/8 of CPU cores.

```bash
# Type-check all
sd-cli typecheck

# Type-check specific path
sd-cli typecheck packages/core-common

# Type-check multiple paths
sd-cli typecheck packages/core-common tests/orm

# Pass options to sd.config.ts
sd-cli typecheck -o key=value
```

**Options:**

| Option            | Description                                                | Default |
| ----------------- | ---------------------------------------------------------- | ------- |
| `--options`, `-o` | Additional options to pass to sd.config.ts (multi-use)     | `[]`    |
| `--debug`         | Output debug logs                                          | `false` |

**Type-check environment by target:**

| Target              | Environment             |
| ------------------- | ----------------------- |
| `node`              | node environment once   |
| `browser`, `client` | browser environment once |
| `neutral`           | node + browser environment twice |
| `scripts`           | Excluded from type-check |

### watch

Watches **library packages** (`node`/`browser`/`neutral` targets) in watch mode. Automatically rebuilds on file changes and generates `.d.ts` type definition files.

> **Note**: Use the `dev` command for `client`/`server` targets.

```bash
# Watch all library packages
sd-cli watch

# Watch specific package
sd-cli watch solid

# Watch multiple packages
sd-cli watch solid core-common
```

**Options:**

| Option            | Description                                                | Default |
| ----------------- | ---------------------------------------------------------- | ------- |
| `--options`, `-o` | Additional options to pass to sd.config.ts (multi-use)     | `[]`    |
| `--debug`         | Output debug logs                                          | `false` |

### dev

Runs **Client and Server packages** in development mode. `client` targets run with Vite dev server, and `server` targets run with Server Build Worker + Server Runtime Worker. Supports Server-Client proxy connection and Capacitor initialization.

```bash
# Run all client/server packages
sd-cli dev

# Run specific package
sd-cli dev solid-demo

# Run multiple packages
sd-cli dev solid-demo my-server
```

**Options:**

| Option            | Description                                                | Default |
| ----------------- | ---------------------------------------------------------- | ------- |
| `--options`, `-o` | Additional options to pass to sd.config.ts (multi-use)     | `[]`    |
| `--debug`         | Output debug logs                                          | `false` |

**How it works:**

- `client` target: Starts Vite dev server. If `server` config is a string (package name), connects proxy to that server
- `server` target: Builds in esbuild watch mode, then runs server runtime in separate Worker. Auto-rebuilds and restarts server on file changes
- Client packages with Capacitor config perform Capacitor initialization after build completes
- Client packages with Electron config launch Electron in dev mode after build completes
- Terminates on SIGINT/SIGTERM signals

### build

Runs production build. Performs lint, dist folder cleanup, and build sequentially.

```bash
# Build all packages
sd-cli build

# Build specific packages
sd-cli build solid core-common
```

**Options:**

| Option            | Description                                                | Default |
| ----------------- | ---------------------------------------------------------- | ------- |
| `--options`, `-o` | Additional options to pass to sd.config.ts (multi-use)     | `[]`    |
| `--debug`         | Output debug logs                                          | `false` |

**Build behavior by target:**

| Target                     | JS build        | .d.ts generation | Type-check | Note                                  |
| -------------------------- | --------------- | ---------------- | ---------- | ------------------------------------- |
| `node`/`browser`/`neutral` | esbuild         | O                | O          | Library package                       |
| `client`                   | Vite production | X                | O          | Client app (+ Capacitor/Electron build) |
| `server`                   | esbuild         | X                | X          | Server app                            |
| `scripts`                  | Excluded        | Excluded         | Excluded   | -                                     |

### publish

Publishes packages. For safety, proceeds in the following order:

1. Pre-validation (npm authentication, Git uncommitted changes check)
2. Version upgrade (increment prerelease if prerelease, otherwise patch)
3. Build (Git rollback on failure)
4. Git commit/tag/push (Git rollback on failure)
5. npm/FTP/local deployment
6. postPublish script execution

```bash
# Publish all packages with publish config
sd-cli publish

# Publish specific packages
sd-cli publish solid core-common

# Publish without build (dangerous)
sd-cli publish --no-build

# Simulate without actual deployment
sd-cli publish --dry-run
```

**Options:**

| Option                   | Description                                                | Default |
| ------------------------ | ---------------------------------------------------------- | ------- |
| `--build` / `--no-build` | Whether to run build (skip with `--no-build`)             | `true`  |
| `--dry-run`              | Simulate without actual deployment                         | `false` |
| `--options`, `-o`        | Additional options to pass to sd.config.ts (multi-use)     | `[]`    |
| `--debug`                | Output debug logs                                          | `false` |

### init

Initializes a new Simplysm project in the current directory. The directory must be empty and the directory name must be a valid npm scope name (lowercase, numbers, hyphens only).

Runs an interactive prompt to collect:
1. Client package name suffix (creates `client-{suffix}` package)
2. Whether to use router

After collecting inputs, it:
1. Renders project files from Handlebars templates
2. Runs `pnpm install`
3. Runs `sd-cli install` (installs Claude Code skills/agents)

```bash
# Create an empty directory and run init
mkdir my-project && cd my-project
sd-cli init
```

### install

Installs Claude Code skills/agents to the current project. Reads `sd-*` assets from the package's `claude/` directory and copies them to the current project's `.claude/`. Existing `sd-*` entries are completely removed before new ones are copied. Also automatically adds `statusLine` configuration to `.claude/settings.json`.

```bash
sd-cli install
```

### uninstall

Removes `sd-*` skills/agents from the current project's `.claude/`. Also automatically removes `statusLine` configuration from `.claude/settings.json`.

```bash
sd-cli uninstall
```

### device

Runs Capacitor app on Android device. Only available for `client` target packages with `capacitor` config in `sd.config.ts`.

```bash
# Specify package (required)
sd-cli device -p my-app

# Specify dev server URL directly
sd-cli device -p my-app -u http://192.168.0.10:3000
```

**Options:**

| Option            | Description                                                               | Default |
| ----------------- | ------------------------------------------------------------------------- | ------- |
| `--package`, `-p` | Package name (required)                                                   | -       |
| `--url`, `-u`     | Dev server URL (uses server port from sd.config.ts if not specified)      | -       |
| `--options`, `-o` | Additional options to pass to sd.config.ts (multi-use)                    | `[]`    |
| `--debug`         | Output debug logs                                                         | `false` |

## Configuration (sd.config.ts)

Create an `sd.config.ts` file in the project root to define build targets and deployment settings per package. Used by `typecheck`, `watch`, `dev`, `build`, `publish`, and `device` commands.

The `typecheck` command treats all packages as `neutral` target if no config file exists. The `watch`, `dev`, `build`, and `publish` commands require this file.

### Basic Example

```typescript
import type { SdConfigFn } from "@simplysm/cli";

const config: SdConfigFn = () => ({
  packages: {
    "core-common": { target: "neutral" },
    "core-node": { target: "node" },
    "core-browser": { target: "browser" },
    "solid": { target: "browser", publish: "npm" },
    "solid-demo": { target: "client", server: "solid-demo-server" },
    "solid-demo-server": { target: "server" },
    "my-scripts": { target: "scripts" },
  },
});

export default config;
```

### Target Types

| Target    | Description                                                        | Type-check         | watch | dev | build        |
| --------- | ------------------------------------------------------------------ | ------------------ | ----- | --- | ------------ |
| `node`    | Node.js-only package. Removes DOM lib, includes `@types/node`     | O (node)           | O     | X   | O (JS + dts) |
| `browser` | Browser-only package. Keeps DOM lib, excludes `@types/node`       | O (browser)        | O     | X   | O (JS + dts) |
| `neutral` | Node/browser common. Keeps DOM lib, includes `@types/node`        | O (node + browser) | O     | X   | O (JS + dts) |
| `client`  | Vite dev server-based client app                                   | O (browser)        | X     | O   | O (Vite)     |
| `server`  | Fastify-based server app                                           | X                  | X     | O   | O (JS)       |
| `scripts` | Excluded from typecheck/watch/build                                | X                  | X     | X   | X            |

### Function Parameters

The `sd.config.ts` function receives a `SdConfigParams` object as an argument:

```typescript
import type { SdConfigFn, SdConfigParams } from "@simplysm/cli";

const config: SdConfigFn = (params: SdConfigParams) => {
  // params.cwd  - Current working directory
  // params.dev  - Whether in dev mode (true for dev command, false for build/publish)
  // params.opt  - Additional options array passed via CLI's -o flag

  return {
    packages: {
      "my-app": {
        target: "client",
        server: params.dev ? 3000 : "my-server",
      },
    },
  };
};

export default config;
```

### Package Configuration Types

#### Library Package (SdBuildPackageConfig)

```typescript
{
  target: "node" | "browser" | "neutral";
  publish?: SdPublishConfig;  // Deployment config (optional)
}
```

#### Client Package (SdClientPackageConfig)

```typescript
{
  target: "client";
  server: string | number;      // Server package name or direct port number
  env?: Record<string, string>; // Environment variables to replace during build
  publish?: SdPublishConfig;    // Deployment config (optional)
  capacitor?: SdCapacitorConfig; // Capacitor config (optional)
  electron?: SdElectronConfig;  // Electron config (optional)
}
```

#### Server Package (SdServerPackageConfig)

```typescript
{
  target: "server";
  env?: Record<string, string>; // Environment variables to replace during build
  publish?: SdPublishConfig;    // Deployment config (optional)
}
```

#### Scripts Package (SdScriptsPackageConfig)

```typescript
{
  target: "scripts";
}
```

### Deployment Configuration (SdPublishConfig)

Three deployment methods are supported:

| Method           | Config Value                                                            | Description                           |
| ---------------- | ----------------------------------------------------------------------- | ------------------------------------- |
| npm              | `"npm"`                                                                 | Deploy to npm registry                |
| Local directory  | `{ type: "local-directory", path: "..." }`                              | Copy dist to local path               |
| Storage          | `{ type: "ftp" \| "ftps" \| "sftp", host, port?, path?, user?, pass? }` | Upload to FTP/FTPS/SFTP server        |

Environment variable substitution is supported in `path` for local directory and storage: `%VER%` (version), `%PROJECT%` (project path).

```typescript
// npm deployment
"core-common": { target: "neutral", publish: "npm" },

// Local directory deployment
"my-app": {
  target: "client",
  server: 3000,
  publish: { type: "local-directory", path: "/deploy/%VER%/my-app" },
},

// SFTP upload
"my-server": {
  target: "server",
  publish: {
    type: "sftp",
    host: "deploy.example.com",
    port: 22,
    path: "/opt/app",
    user: "deploy",
    pass: "secret",
  },
},
```

### postPublish Scripts

You can define scripts to run after deployment completes. Supports environment variable substitution (`%VER%`, `%PROJECT%`). On script failure, only a warning is printed and execution continues.

```typescript
const config: SdConfigFn = () => ({
  packages: {
    /* ... */
  },
  postPublish: [
    {
      type: "script",
      cmd: "curl",
      args: ["-X", "POST", "https://hooks.example.com/deploy?version=%VER%"],
    },
  ],
});
```

### Capacitor Configuration (SdCapacitorConfig)

Capacitor configuration for Android app builds in `client` target packages.

```typescript
"my-app": {
  target: "client",
  server: 3000,
  capacitor: {
    appId: "com.example.myapp",
    appName: "My App",
    icon: "resources/icon.png",          // App icon (relative to package directory)
    debug: true,                          // Whether debug build
    plugins: {                            // Capacitor plugins
      "@capacitor/camera": true,
      "@capacitor/storage": { group: "myGroup" },
    },
    platform: {
      android: {
        config: {                         // AndroidManifest.xml application attributes
          requestLegacyExternalStorage: "true",
        },
        bundle: true,                     // AAB bundle build (APK if false)
        sdkVersion: 33,                   // Android SDK version
        permissions: [                    // Additional permissions
          { name: "CAMERA" },
          { name: "WRITE_EXTERNAL_STORAGE", maxSdkVersion: 29 },
        ],
        intentFilters: [                  // Intent Filters
          { action: "android.intent.action.VIEW", category: "android.intent.category.DEFAULT" },
        ],
        sign: {                           // APK/AAB signing
          keystore: "keystore.jks",
          storePassword: "password",
          alias: "key0",
          password: "password",
        },
      },
    },
  },
},
```

### Electron Configuration (SdElectronConfig)

Electron configuration for Windows desktop app builds in `client` target packages. Requires `src/electron-main.ts` entry point in the package directory.

```typescript
"my-app": {
  target: "client",
  server: 3000,
  electron: {
    appId: "com.example.myapp",           // Electron app ID (required)
    portable: false,                       // true: portable .exe, false: NSIS installer
    installerIcon: "resources/icon.ico",   // Installer icon (.ico, relative to package directory)
    reinstallDependencies: ["better-sqlite3"], // npm packages to include (native modules etc.)
    postInstallScript: "node scripts/setup.js", // npm postinstall script
    nsisOptions: {},                       // NSIS options (when portable is false)
    env: {                                 // Environment variables (accessible via process.env in electron-main.ts)
      API_URL: "https://api.example.com",
    },
  },
},
```

**How it works:**

- **Initialize**: Creates `.electron/src/package.json`, runs `npm install`, rebuilds native modules with `electron-rebuild`
- **Build**: Bundles `electron-main.ts` with esbuild, copies web assets, runs `electron-builder` for Windows
- **Dev mode**: Bundles `electron-main.ts`, launches Electron pointing to Vite dev server URL

## Direct API Calls

In addition to the CLI, you can import and use functions directly in code.

### Export List

| Export                          | Type     | Description                                    |
| ------------------------------- | -------- | ---------------------------------------------- |
| `runLint`                       | Function | Run ESLint                                     |
| `LintOptions`                   | Type     | `runLint` options                              |
| `runTypecheck`                  | Function | Run TypeScript type-check                      |
| `TypecheckOptions`              | Type     | `runTypecheck` options                         |
| `runWatch`                      | Function | Watch mode build for library packages          |
| `WatchOptions`                  | Type     | `runWatch` options                             |
| `runDev`                        | Function | Run Client/Server packages in dev mode         |
| `DevOptions`                    | Type     | `runDev` options                               |
| `runBuild`                      | Function | Run production build                           |
| `BuildOptions`                  | Type     | `runBuild` options                             |
| `runPublish`                    | Function | Run package deployment                         |
| `PublishOptions`                | Type     | `runPublish` options                           |
| `runDevice`                     | Function | Run app on Android device                      |
| `DeviceOptions`                 | Type     | `runDevice` options                            |
| `runInit`                       | Function | Initialize a new Simplysm project              |
| `InitOptions`                   | Type     | `runInit` options                              |
| `runInstall`                    | Function | Install Claude Code skills/agents              |
| `InstallOptions`                | Type     | `runInstall` options                           |
| `runUninstall`                  | Function | Uninstall Claude Code skills/agents            |
| `UninstallOptions`              | Type     | `runUninstall` options                         |
| `SdConfigFn`                    | Type     | sd.config.ts function type                     |
| `SdConfig`                      | Type     | sd.config.ts return type                       |
| `SdConfigParams`                | Type     | sd.config.ts function parameter type           |
| `SdPackageConfig`               | Type     | Package config union type                      |
| `SdBuildPackageConfig`          | Type     | Library package config                         |
| `SdClientPackageConfig`         | Type     | Client package config                          |
| `SdServerPackageConfig`         | Type     | Server package config                          |
| `SdScriptsPackageConfig`        | Type     | Scripts package config                         |
| `BuildTarget`                   | Type     | Build target (`"node" \| "browser" \| "neutral"`) |
| `SdPublishConfig`               | Type     | Deployment config union type                   |
| `SdLocalDirectoryPublishConfig` | Type     | Local directory deployment config              |
| `SdStoragePublishConfig`        | Type     | Storage (FTP/SFTP) deployment config           |
| `SdPostPublishScriptConfig`     | Type     | postPublish script config                      |
| `SdCapacitorConfig`             | Type     | Capacitor config                               |
| `SdCapacitorAndroidConfig`      | Type     | Capacitor Android platform config              |
| `SdCapacitorSignConfig`         | Type     | Capacitor Android signing config               |
| `SdCapacitorPermission`         | Type     | Capacitor Android permission config            |
| `SdCapacitorIntentFilter`       | Type     | Capacitor Android Intent Filter config         |
| `SdElectronConfig`              | Type     | Electron config                                |
| `Electron`                      | Class    | Electron project management (init/build/run)   |
| `renderTemplateDir`             | Function | Render Handlebars template directory            |

### Usage Examples

```typescript
import { runLint, runTypecheck, runWatch, runDev, runBuild, runPublish, runDevice, runInit, runInstall, runUninstall } from "@simplysm/cli";

// Run lint
await runLint({
  targets: ["packages/core-common"],
  fix: false,
  timing: false,
});

// Run type-check
await runTypecheck({
  targets: ["packages/core-common"],
  options: [],
});

// Run watch (library packages)
await runWatch({
  targets: ["solid"],
  options: [],
});

// Run dev (client/server packages)
await runDev({
  targets: ["solid-demo"],
  options: [],
});

// Production build
await runBuild({
  targets: ["solid", "core-common"],
  options: [],
});

// Publish
await runPublish({
  targets: ["core-common"],
  noBuild: false,
  dryRun: true,
  options: [],
});

// Run on Android device
await runDevice({
  package: "my-app",
  url: "http://192.168.0.10:3000",
  options: [],
});

// Initialize new project (interactive)
await runInit({});

// Install Claude Code skills/agents
await runInstall({});

// Uninstall Claude Code skills/agents
await runUninstall({});
```

### Options Type Details

#### LintOptions

| Property  | Type       | Description                                       |
| --------- | ---------- | ------------------------------------------------- |
| `targets` | `string[]` | List of paths to lint. All if empty array        |
| `fix`     | `boolean`  | Whether to auto-fix                               |
| `timing`  | `boolean`  | Output rule execution times                       |

#### TypecheckOptions

| Property  | Type       | Description                                       |
| --------- | ---------- | ------------------------------------------------- |
| `targets` | `string[]` | List of paths to type-check. All if empty array   |
| `options` | `string[]` | Additional options to pass to sd.config.ts        |

#### WatchOptions

| Property  | Type       | Description                                       |
| --------- | ---------- | ------------------------------------------------- |
| `targets` | `string[]` | List of library packages to watch. All if empty   |
| `options` | `string[]` | Additional options to pass to sd.config.ts        |

#### DevOptions

| Property  | Type       | Description                                                |
| --------- | ---------- | ---------------------------------------------------------- |
| `targets` | `string[]` | List of client/server packages to run. All if empty       |
| `options` | `string[]` | Additional options to pass to sd.config.ts                 |

#### BuildOptions

| Property  | Type       | Description                                       |
| --------- | ---------- | ------------------------------------------------- |
| `targets` | `string[]` | List of packages to build. All if empty          |
| `options` | `string[]` | Additional options to pass to sd.config.ts        |

#### PublishOptions

| Property  | Type       | Description                                                      |
| --------- | ---------- | ---------------------------------------------------------------- |
| `targets` | `string[]` | List of packages to publish. All with publish config if empty   |
| `noBuild` | `boolean`  | Publish without build (dangerous)                                |
| `dryRun`  | `boolean`  | Simulate without actual deployment                               |
| `options` | `string[]` | Additional options to pass to sd.config.ts                       |

#### DeviceOptions

| Property  | Type                  | Description                                                  |
| --------- | --------------------- | ------------------------------------------------------------ |
| `package` | `string`              | Package name (required)                                      |
| `url`     | `string \| undefined` | Dev server URL (uses server port from sd.config.ts if not specified) |
| `options` | `string[]`            | Additional options to pass to sd.config.ts                   |

#### InitOptions

No options. Currently pass an empty object (`{}`).

#### InstallOptions

No options. Currently pass an empty object (`{}`).

#### UninstallOptions

No options. Currently pass an empty object (`{}`).

### API Behavior

- `runLint`, `runTypecheck`, `runBuild`: Returns `Promise<void>`. On error, sets `process.exitCode = 1` and resolves (does not throw)
- `runWatch`, `runDev`: Returns `Promise<void>`. Resolves on SIGINT/SIGTERM signal reception
- `runPublish`: Returns `Promise<void>`. Auto-rollback where possible on failure, then sets `process.exitCode = 1`
- `runDevice`: Returns `Promise<void>`. Sets `process.exitCode = 1` on failure
- `runInit`: Returns `Promise<void>`. Sets `process.exitCode = 1` if directory is not empty or project name is invalid
- `runInstall`: Returns `Promise<void>`. Sets `process.exitCode = 1` if asset directory not found
- `runUninstall`: Returns `Promise<void>`. Prints warning if `.claude` directory doesn't exist

## Cache

| Command       | Cache Path                                           | Description                                                        |
| ------------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| `lint`        | `.cache/eslint.cache`                                | ESLint cache                                                       |
| `typecheck`   | `packages/{pkg}/.cache/typecheck-{env}.tsbuildinfo`  | Incremental type-check info (`{env}` is `node` or `browser`)      |
| `watch` (dts) | `packages/{pkg}/.cache/dts.tsbuildinfo`              | Incremental .d.ts build info                                       |

To reset cache, delete the `.cache` directory:

```bash
# Delete all caches
rm -rf .cache packages/*/.cache
```

## Notes

- `sd.config.ts` is required for `watch`, `dev`, `build`, `publish`, and `device` commands. `typecheck` and `lint` work without a config file.
- The `publish` command automatically increments version and performs Git commit/tag/push. Execution is rejected if there are uncommitted changes.
- `publish --no-build` deploys already-built artifacts as-is, so use with caution.
- Before using the `device` command, run `sd-cli dev` or `sd-cli watch` first to initialize the Capacitor project.
- During build, `VER` (project version) and `DEV` (`"true"` or `"false"`) environment variables are automatically set.

## License

Apache-2.0
