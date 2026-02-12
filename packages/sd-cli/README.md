# @simplysm/sd-cli

The CLI tool for the Simplysm framework. It provides project initialization, ESLint linting, TypeScript type-checking, library/client/server package builds, development mode, deployment, Android device execution, and Electron desktop app build capabilities.

## Installation

```bash
npm install --save-dev @simplysm/sd-cli
# or
pnpm add -D @simplysm/sd-cli
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

**Runtime Configuration File (.config.json):**

If a `server` or `client` package defines a `configs` field in `sd.config.ts`, the build automatically generates `dist/.config.json` containing that configuration. This is useful for storing environment-specific settings (database config, API endpoints, etc.) that are read at runtime via `ServiceBase.getConfig()` in `service-server`.

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

Creates a skeleton project with:
- `sd.config.ts`, `tsconfig.json`, `eslint.config.ts`, `pnpm-workspace.yaml`
- `.gitignore`, `.prettierrc.yaml`, `.prettierignore`, `mise.toml`

After rendering templates, runs `pnpm install` automatically.

```bash
# Create an empty directory and run init
mkdir my-project && cd my-project
sd-cli init
```

After initialization, use `sd-cli add client` and `sd-cli add server` to add packages.

> **Note**: Claude Code skills/agents are automatically installed via `@simplysm/claude` postinstall.

### add client

Adds a client package to an existing project. Must be run from the project root (where `sd.config.ts` exists).

Runs an interactive prompt to collect:
1. Client package name suffix (creates `client-{suffix}` package)
2. Whether to use router

After collecting inputs, it:
1. Renders client package from Handlebars templates into `packages/client-{suffix}/`
2. Adds the package entry to `sd.config.ts` (via ts-morph AST editing)
3. Adds tailwind CSS settings to `eslint.config.ts` (if first client)
4. Runs `pnpm install`

```bash
sd-cli add client
```

### add server

Adds a server package to an existing project. Must be run from the project root (where `sd.config.ts` exists).

Runs an interactive prompt to collect:
1. Server name suffix (leave empty for just `server`, otherwise creates `server-{suffix}`)
2. Which existing client packages this server should serve (multi-select)

After collecting inputs, it:
1. Renders server package from Handlebars templates into `packages/{server-name}/`
2. Adds the server package entry to `sd.config.ts`
3. Updates selected client packages' `server` field in `sd.config.ts`
4. Runs `pnpm install`

```bash
sd-cli add server
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

## Exported Types

This package exports configuration types for `sd.config.ts`. All types are importable from `@simplysm/sd-cli`.

```typescript
import type {
  SdConfigFn,
  SdConfigParams,
  SdConfig,
  SdPackageConfig,
  BuildTarget,
  SdBuildPackageConfig,
  SdClientPackageConfig,
  SdServerPackageConfig,
  SdScriptsPackageConfig,
  SdPublishConfig,
  SdLocalDirectoryPublishConfig,
  SdStoragePublishConfig,
  SdPostPublishScriptConfig,
  SdCapacitorConfig,
  SdCapacitorAndroidConfig,
  SdCapacitorSignConfig,
  SdCapacitorPermission,
  SdCapacitorIntentFilter,
  SdElectronConfig,
} from "@simplysm/sd-cli";
```

| Type | Description |
|------|-------------|
| `SdConfigFn` | Function type for `sd.config.ts` default export: `(params: SdConfigParams) => SdConfig \| Promise<SdConfig>` |
| `SdConfigParams` | Parameters passed to the config function (`cwd`, `dev`, `opt`) |
| `SdConfig` | Root configuration object (`packages`, `replaceDeps?`, `postPublish?`) |
| `SdPackageConfig` | Union of all package config types |
| `BuildTarget` | Library build target: `"node" \| "browser" \| "neutral"` |
| `SdBuildPackageConfig` | Config for library packages (`node`/`browser`/`neutral` targets) |
| `SdClientPackageConfig` | Config for client packages (`client` target) |
| `SdServerPackageConfig` | Config for server packages (`server` target) |
| `SdScriptsPackageConfig` | Config for scripts-only packages (`scripts` target) |
| `SdPublishConfig` | Deployment config: `"npm" \| SdLocalDirectoryPublishConfig \| SdStoragePublishConfig` |
| `SdLocalDirectoryPublishConfig` | Local directory deployment config (`type: "local-directory"`, `path`) |
| `SdStoragePublishConfig` | FTP/FTPS/SFTP deployment config (`type`, `host`, `port?`, `path?`, `user?`, `pass?`) |
| `SdPostPublishScriptConfig` | Post-publish script config (`type: "script"`, `cmd`, `args`) |
| `SdCapacitorConfig` | Capacitor config for Android app builds |
| `SdCapacitorAndroidConfig` | Android platform-specific Capacitor config |
| `SdCapacitorSignConfig` | APK/AAB signing config (`keystore`, `storePassword`, `alias`, `password`) |
| `SdCapacitorPermission` | Android permission entry (`name`, `maxSdkVersion?`, `ignore?`) |
| `SdCapacitorIntentFilter` | Android intent filter entry (`action?`, `category?`) |
| `SdElectronConfig` | Electron desktop app build config |

## Configuration (sd.config.ts)

Create an `sd.config.ts` file in the project root to define build targets and deployment settings per package. Used by `typecheck`, `watch`, `dev`, `build`, `publish`, and `device` commands.

The `typecheck` command treats all packages as `neutral` target if no config file exists. The `watch`, `dev`, `build`, and `publish` commands require this file.

### Basic Example

```typescript
import type { SdConfigFn } from "@simplysm/sd-cli";

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
import type { SdConfigFn, SdConfigParams } from "@simplysm/sd-cli";

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
  configs?: Record<string, unknown>; // Runtime config (written to dist/.config.json during build)
}
```

#### Server Package (SdServerPackageConfig)

```typescript
{
  target: "server";
  env?: Record<string, string>; // Environment variables to replace during build
  publish?: SdPublishConfig;    // Deployment config (optional)
  configs?: Record<string, unknown>; // Runtime config (written to dist/.config.json during build)
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

### Runtime Configuration (configs)

Define runtime configuration for `server` or `client` packages using the `configs` field. This configuration is automatically written to `dist/.config.json` during build and can be read at runtime via `ServiceBase.getConfig()` in the `service-server` package.

```typescript
import type { SdConfigFn } from "@simplysm/sd-cli";

const config: SdConfigFn = () => ({
  packages: {
    "my-server": {
      target: "server",
      configs: {
        // Runtime configuration sections
        orm: {
          default: {
            dialect: "mysql",
            host: process.env.DB_HOST || "localhost",
            port: 3306,
            database: "mydb",
            user: process.env.DB_USER || "root",
            password: process.env.DB_PASSWORD,
          },
        },
        smtp: {
          default: {
            host: "smtp.example.com",
            port: 587,
            secure: false,
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        },
      },
    },
    "my-app": {
      target: "client",
      server: "my-server",
      configs: {
        api: {
          baseUrl: process.env.API_URL || "http://localhost:3000",
          timeout: 30000,
        },
      },
    },
  },
});

export default config;
```

At runtime, services access configuration sections:

```typescript
// In a service class
const ormConfig = await this.getConfig<Record<string, DbConfig>>("orm");
const dbConfig = ormConfig.default;  // Access specific DB config by name
```

**Key points:**

- Configuration sections can be nested objects with any structure
- Environment variable substitution can be used in config values
- Generated `dist/.config.json` files are not included in version control (add to `.gitignore`)
- Client and server both support `configs`, but typically only servers expose configuration via `ServiceBase.getConfig()`

### Dependency Replacement (replaceDeps)

Replace `node_modules` packages with local source directories via symlinks. Useful for local development of dependent packages across separate repositories.

The key is a glob pattern to match packages in `node_modules`, and the value is the local source directory path. The `*` wildcard in the key is substituted into the `*` in the value.

```typescript
import type { SdConfigFn } from "@simplysm/sd-cli";

const config: SdConfigFn = () => ({
  packages: {
    "my-app": { target: "client", server: "my-server" },
  },
  replaceDeps: {
    // Replaces @simplysm/* packages in node_modules
    // with symlinks to ../simplysm/packages/*/dist
    "@simplysm/*": "../simplysm/packages/*",
  },
});

export default config;
```

### postPublish Scripts

You can define scripts to run after deployment completes. Supports environment variable substitution (`%VER%`, `%PROJECT%`). On script failure, only a warning is printed and execution continues.

```typescript
import type { SdConfigFn } from "@simplysm/sd-cli";

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

export default config;
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
