# @simplysm/sd-cli

Simplysm CLI tool — build, watch, publish, and deploy orchestrator for Angular monorepo projects.
Supports TypeScript libraries, Angular client apps, Node.js servers, Electron, Cordova, and Capacitor.

## Installation

```bash
yarn add -D @simplysm/sd-cli
```

After installation, the `sd-cli` binary is available. The package also runs a `postinstall` hook
that patches `@angular/build` and `cordova` for compatibility.

## Usage

All commands are run via the `sd-cli` binary (or `yarn run _sd-cli_` in this monorepo).

```
sd-cli [--debug] <command> [options]
```

Global option:

| Option    | Description                 | Default |
| --------- | --------------------------- | ------- |
| `--debug` | Show debug-level log output | `false` |

### Automatic `local-update` on startup

When the built binary (`.js`) is executed with any command other than `local-update`, it automatically
runs `local-update` first (before spawning the main command process). This ensures local library
artifacts are up-to-date on every invocation. This behavior does not apply when running the `.ts`
source directly (development mode).

---

## Commands

### `local-update`

Copies local library build artifacts into the project's `node_modules` as specified by `localUpdates`
in the config. Useful when developing multiple packages simultaneously outside of a full rebuild.

```bash
sd-cli local-update [--config <path>] [--options <key=value>...]
```

| Option      | Description                           | Default       |
| ----------- | ------------------------------------- | ------------- |
| `--config`  | Path to the config file               | `simplysm.js` |
| `--options` | Extra option strings passed to config | —             |

---

### `watch`

Runs incremental watch-mode builds for all packages defined in the config.
Automatically starts a dev server for server/client packages and broadcasts live-reload events.

```bash
sd-cli watch [--config <path>] [--options <key=value>...] [--packages <name>...] [--emitOnly] [--noEmit]
```

| Option       | Description                              | Default       |
| ------------ | ---------------------------------------- | ------------- |
| `--config`   | Path to the config file                  | `simplysm.js` |
| `--options`  | Extra option strings passed to config    | —             |
| `--packages` | Limit watch to these package names       | —             |
| `--emitOnly` | Only emit files without full compilation | `false`       |
| `--noEmit`   | Skip emitting files (type-check only)    | `false`       |

---

### `build`

Runs a single production build for all packages. Bumps the project version (patch) before building.

```bash
sd-cli build [--config <path>] [--options <key=value>...] [--packages <name>...]
```

| Option       | Description                           | Default       |
| ------------ | ------------------------------------- | ------------- |
| `--config`   | Path to the config file               | `simplysm.js` |
| `--options`  | Extra option strings passed to config | —             |
| `--packages` | Limit build to these package names    | —             |

---

### `publish`

Builds and publishes all packages. Verifies npm/yarn authentication for npm packages,
commits and tags the new version in git, then uploads each package to its publish target.

```bash
sd-cli publish [--config <path>] [--options <key=value>...] [--packages <name>...] [--noBuild]
```

| Option       | Description                                     | Default       |
| ------------ | ----------------------------------------------- | ------------- |
| `--config`   | Path to the config file                         | `simplysm.js` |
| `--options`  | Extra option strings passed to config           | —             |
| `--packages` | Limit publish to these package names            | —             |
| `--noBuild`  | Skip the build step and publish existing `dist` | `false`       |

Supported publish targets (configured in `ISdProjectConfig`):

- `"npm"` — publishes via `yarn npm publish --access public`
- `local-directory` — copies `dist/` to a local path
- `ftp` / `ftps` / `sftp` — uploads `dist/` via FTP/SFTP

Environment variable substitution in paths: `%SD_VERSION%`, `%SD_PROJECT_PATH%`, and any
`process.env` variable wrapped in `%NAME%`.

Post-publish scripts can be defined via `postPublish` in the project config. The same environment
variable substitution applies to `cmd` and `args`.

---

### `run-electron <package>`

Runs the specified client package as an Electron application using the built `dist/electron` output.
Intended for use during `watch` mode.

```bash
sd-cli run-electron <package> [--config <path>] [--options <key=value>...]
```

| Argument    | Description                   |
| ----------- | ----------------------------- |
| `<package>` | Package name (directory name) |

---

### `build-electron-for-dev <package>`

Builds the Electron installer for the specified package in dev mode (outputs to `.electron/dist`).

```bash
sd-cli build-electron-for-dev <package> [--config <path>] [--options <key=value>...]
```

---

### `run-cordova <platform> <package> [url]`

Deploys the specified package to a connected Cordova device/emulator.
If `url` is provided, the webview is redirected to `<url>/<package>/cordova/`.

> **Deprecated**: Cordova support is deprecated. Use Capacitor instead.

```bash
sd-cli run-cordova <platform> <package> [url]
```

| Argument     | Description                              |
| ------------ | ---------------------------------------- |
| `<platform>` | Target platform (e.g. `android`)         |
| `<package>`  | Package name                             |
| `[url]`      | Optional base URL to redirect webview to |

---

### `run-capacitor <platform> <package> [url]`

Deploys the specified package to a connected Capacitor device/emulator.
If `url` is provided, the `capacitor.config.ts` server URL is updated before running.

```bash
sd-cli run-capacitor <platform> <package> [url]
```

| Argument     | Description                            |
| ------------ | -------------------------------------- |
| `<platform>` | Target platform (e.g. `android`)       |
| `<package>`  | Package name                           |
| `[url]`      | Optional base URL for Capacitor server |

---

### `commit`

Stages all working-tree changes (`git add .`), uses the Anthropic Claude API to analyze the diff
and generate a Korean commit message, then creates a git commit. The command does NOT push to the
remote.

Requires the `ANTHROPIC_API_KEY` environment variable.

```bash
sd-cli commit
```

---

### `postinstall`

Runs automatically after `npm install` / `yarn install`. Patches `@angular/build` and `cordova`
for compatibility with this build system. Should not be called manually.

```bash
sd-cli postinstall
```

---

## Configuration File (`simplysm.js`)

The config file must export a default function with this signature:

```typescript
export default function (isDev: boolean, options: string[]): ISdProjectConfig {
  return {
    packages: {
      /* ... */
    },
    localUpdates: {
      /* optional */
    },
    postPublish: [
      /* optional */
    ],
  };
}
```

---

## Types

### `ISdProjectConfig`

Top-level project configuration returned by `simplysm.js`.

```typescript
import { ISdProjectConfig } from "@simplysm/sd-cli";

interface ISdProjectConfig {
  // Map of package directory name to package config
  packages: Record<string, TSdPackageConfig | undefined>;

  // Maps a node_modules glob pattern to a local source path glob.
  // Used by local-update command.
  // Example: { "@simplysm/*": "/path/to/simplysm/packages/*/dist" }
  localUpdates?: Record<string, string>;

  // Scripts to run after publish completes
  postPublish?: TSdPostPublishConfig[];
}
```

---

### `TSdPackageConfig`

Union type for all package configurations.

```typescript
import { TSdPackageConfig } from "@simplysm/sd-cli";

type TSdPackageConfig<T extends "server" | "library" | "client" | unknown = unknown> =
  | ISdLibPackageConfig
  | ISdServerPackageConfig
  | ISdClientPackageConfig;
```

---

### `ISdLibPackageConfig`

Configuration for TypeScript library packages.

```typescript
import { ISdLibPackageConfig } from "@simplysm/sd-cli";

interface ISdLibPackageConfig {
  type: "library";

  // Publish to npm registry
  publish?: "npm";

  // Extra polyfill entry files to include
  polyfills?: string[];

  // Controls auto-generated index.ts. Set to false to disable generation.
  index?: { excludes?: string[] } | false;

  // Path to a DbContext class file for auto-generated DbContext index
  dbContext?: string;

  // Force production mode even in watch/dev builds
  forceProductionMode?: boolean;
}
```

---

### `ISdServerPackageConfig`

Configuration for Fastify server packages.

```typescript
import { ISdServerPackageConfig } from "@simplysm/sd-cli";

interface ISdServerPackageConfig {
  type: "server";

  // npm module names to exclude from the bundle (treated as external)
  externals?: string[];

  // Publish target
  publish?: ISdLocalDirectoryPublishConfig | ISdFtpPublishConfig;

  // Arbitrary config values injected into the server bundle
  configs?: Record<string, any>;

  // Environment variables set when running the server worker
  env?: Record<string, string>;

  // Force production mode even in watch/dev builds
  forceProductionMode?: boolean;

  // PM2 process manager options (written to dist/pm2.json)
  pm2?: {
    name?: string;
    ignoreWatchPaths?: string[];
    noInterpreter?: boolean;
    noStartScript?: boolean;
  };

  // IIS hosting configuration
  iis?: {
    nodeExeFilePath?: string;
  };
}
```

---

### `ISdClientPackageConfig`

Configuration for Angular client application packages.

```typescript
import { ISdClientPackageConfig } from "@simplysm/sd-cli";

interface ISdClientPackageConfig {
  type: "client";

  // Name of a server package to attach to, or an object with a port number for a standalone server
  server?: string | { port: number };

  // Publish target
  publish?: ISdLocalDirectoryPublishConfig | ISdFtpPublishConfig;

  // Environment variables injected into the Angular build
  env?: Record<string, string>;

  // Arbitrary config values injected into the Angular build
  configs?: Record<string, any>;

  // Disable lazy-loading route generation
  noLazyRoute?: boolean;

  // Force production mode even in watch/dev builds
  forceProductionMode?: boolean;

  builder?: {
    web?: ISdClientBuilderWebConfig;
    electron?: ISdClientBuilderElectronConfig;
    capacitor?: ISdClientBuilderCapacitorConfig;

    /** @deprecated Use capacitor instead */
    cordova?: ISdClientBuilderCordovaConfig;
  };
}
```

---

### `ISdClientBuilderWebConfig`

Web build configuration.

```typescript
import { ISdClientBuilderWebConfig } from "@simplysm/sd-cli";

interface ISdClientBuilderWebConfig {
  // Environment variables specific to the web build
  env?: Record<string, string>;
}
```

---

### `ISdClientBuilderElectronConfig`

Electron build configuration.

```typescript
import { ISdClientBuilderElectronConfig } from "@simplysm/sd-cli";

interface ISdClientBuilderElectronConfig {
  // Electron app identifier (e.g. "com.example.app")
  appId: string;

  // Relative path to the installer icon file
  installerIcon?: string;

  // Build a portable executable instead of an NSIS installer
  portable?: boolean;

  // npm postinstall script for the Electron package.json
  postInstallScript?: string;

  // NSIS installer options (passed to electron-builder)
  nsisOptions?: electronBuilder.NsisOptions;

  // List of dependency names to reinstall inside the Electron package
  reinstallDependencies?: string[];

  // Environment variables for the Electron main process
  env?: Record<string, string>;
}
```

---

### `ISdClientBuilderCapacitorConfig`

Capacitor build configuration.

```typescript
import { ISdClientBuilderCapacitorConfig } from "@simplysm/sd-cli";

interface ISdClientBuilderCapacitorConfig {
  // Capacitor app identifier (e.g. "com.example.app")
  appId: string;

  // App display name
  appName: string;

  // Capacitor plugins to install and configure.
  // Value is true for default config, or an object with plugin-specific options.
  plugins?: Record<string, Record<string, unknown> | true>;

  // Relative path to the app icon file (PNG, 1024x1024 recommended)
  icon?: string;

  // Build in debug mode
  debug?: boolean;

  platform?: {
    android?: {
      // Extra AndroidManifest.xml <application> attributes
      config?: Record<string, string>;

      // Build an AAB bundle instead of an APK
      bundle?: boolean;

      // Android intent filters to add to MainActivity
      intentFilters?: { action?: string; category?: string }[];

      // Keystore signing configuration
      sign?: {
        keystore: string;
        storePassword: string;
        alias: string;
        password: string;
        keystoreType?: string;
      };

      // Target Android SDK version for minSdkVersion / targetSdkVersion
      sdkVersion?: number;

      // <uses-permission> entries to add to AndroidManifest.xml
      permissions?: {
        name: string;
        maxSdkVersion?: number;
        ignore?: string;
      }[];
    };
  };

  // Environment variables injected into the Angular build
  env?: Record<string, string>;

  // Browserslist targets for the Angular build
  browserslist?: string[];
}
```

---

### `ISdClientBuilderCordovaConfig`

> **Deprecated.** Use `ISdClientBuilderCapacitorConfig` instead.

```typescript
import { ISdClientBuilderCordovaConfig } from "@simplysm/sd-cli";

interface ISdClientBuilderCordovaConfig {
  appId: string;
  appName: string;
  plugins?: string[];
  icon?: string;
  debug?: boolean;
  platform?: {
    browser?: {};
    android?: {
      config?: Record<string, string>;
      bundle?: boolean;
      sign?: {
        keystore: string;
        storePassword: string;
        alias: string;
        password: string;
        keystoreType: string;
      };
      sdkVersion?: number;
      permissions?: { name: string; maxSdkVersion?: number; ignore?: string }[];
    };
  };
  env?: Record<string, string>;
  browserslist?: string[];
}
```

---

### `ISdLocalDirectoryPublishConfig`

Copies `dist/` to a local directory path.

```typescript
import { ISdLocalDirectoryPublishConfig } from "@simplysm/sd-cli";

interface ISdLocalDirectoryPublishConfig {
  type: "local-directory";

  // Destination path. Supports %SD_VERSION%, %SD_PROJECT_PATH%, %ENV_VAR% substitution.
  path: string;
}
```

---

### `ISdFtpPublishConfig`

Uploads `dist/` via FTP, FTPS, or SFTP.

```typescript
import { ISdFtpPublishConfig } from "@simplysm/sd-cli";

interface ISdFtpPublishConfig {
  type: "ftp" | "ftps" | "sftp";
  host: string;
  port?: number;
  path?: string;
  user?: string;
  pass?: string;
}
```

---

### `TSdPostPublishConfig` / `ISdPostPublishScriptConfig`

Post-publish script to run after all packages are deployed.

```typescript
import { TSdPostPublishConfig, ISdPostPublishScriptConfig } from "@simplysm/sd-cli";

type TSdPostPublishConfig = ISdPostPublishScriptConfig;

interface ISdPostPublishScriptConfig {
  type: "script";

  // Executable command. Supports %SD_VERSION%, %SD_PROJECT_PATH%, %ENV_VAR% substitution.
  cmd: string;

  // Arguments. Each string supports the same substitution.
  args: string[];
}
```

---

### `ISdBuildMessage`

A single diagnostic message produced during build (TypeScript, ESLint, or bundler).

```typescript
import { ISdBuildMessage } from "@simplysm/sd-cli";

interface ISdBuildMessage {
  filePath: string | undefined; // Absolute normalized path
  line: number | undefined; // 1-based line number
  char: number | undefined; // 1-based column number
  code: string | undefined; // Diagnostic code (e.g. "TS2345")
  severity: "error" | "warning" | "suggestion" | "message";
  message: string;
  type: string | undefined; // Source type: "compile", "lint", plugin name, etc.
}
```

---

### `ISdBuildResult`

Result returned by a single package build worker.

```typescript
import { ISdBuildResult } from "@simplysm/sd-cli";

interface ISdBuildResult {
  buildMessages: ISdBuildMessage[];
  watchFileSet: Set<string>; // Files to watch for future incremental rebuilds
  affectedFileSet: Set<string>; // Files that caused this build
  emitFileSet: Set<string>; // Files written to disk in this build
}
```

---

### `ISdTsCompilerOptions`

Options passed to the internal TypeScript/Angular compiler.

```typescript
import { ISdTsCompilerOptions } from "@simplysm/sd-cli";

interface ISdTsCompilerOptions {
  pkgPath: string; // Absolute path to the package directory
  scopePathSet: Set<string>; // Set of paths the compiler watches for changes
  watch?: {
    dev: boolean; // true in watch/dev mode
    emitOnly: boolean; // Emit only, skip diagnostics
    noEmit: boolean; // Skip emit entirely
  };
}
```

---

### `ISdTsCompilerResult`

Full result from one compilation pass.

```typescript
import { ISdTsCompilerResult } from "@simplysm/sd-cli";

interface ISdTsCompilerResult {
  messages: ISdBuildMessage[];
  stylesheetBundlingResultMap: Map<string, TStylesheetBundlingResult>;
  emittedFilesCacheMap: Map<string, { outAbsPath?: string; text: string }[]>;
  emitFileSet: Set<string>;
  watchFileSet: Set<string>;
  affectedFileSet: Set<string>;
}
```

---

### `TStylesheetBundlingResult`

Result of bundling a stylesheet (CSS/SCSS) via esbuild.

```typescript
import { TStylesheetBundlingResult } from "@simplysm/sd-cli";

type TStylesheetBundlingResult =
  | {
      // Bundling failed
      errors: esbuild.PartialMessage[];
      warnings: esbuild.PartialMessage[];
      contents?: string;
    }
  | {
      // Bundling succeeded
      errors: undefined;
      warnings: esbuild.PartialMessage[];
      metafile: esbuild.Metafile;
      outputFiles: esbuild.OutputFile[];
      contents: string;
    };
```

---

### `INpmConfig`

Typed representation of a `package.json` file.

```typescript
import { INpmConfig } from "@simplysm/sd-cli";

interface INpmConfig {
  name: string;
  description?: string;
  version: string;
  type?: "module" | "commonjs";
  workspaces?: string[];
  volta?: Record<string, string>;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
  resolutions?: Record<string, string>;
  scripts?: Record<string, string>;
}
```

---

### `ITsConfig`

Typed representation of a `tsconfig.json` file (minimal).

```typescript
import { ITsConfig } from "@simplysm/sd-cli";

interface ITsConfig {
  files?: string[];
  compilerOptions: { lib: string[] };
  angularCompilerOptions?: {};
}
```

---

### `ISdBuildRunnerWorkerType`

Worker message protocol for package build workers.

```typescript
import { ISdBuildRunnerWorkerType, ISdBuildRunnerInitializeRequest } from "@simplysm/sd-cli";
import { ISdWorkerType } from "@simplysm/sd-core-node";

// Extends ISdWorkerType from @simplysm/sd-core-node
interface ISdBuildRunnerWorkerType extends ISdWorkerType {
  methods: {
    initialize: { params: [ISdBuildRunnerInitializeRequest]; returnType: void };
    rebuild: { params: [Set<string>?]; returnType: ISdBuildResult };
  };
}

interface ISdBuildRunnerInitializeRequest {
  options: ISdTsCompilerOptions;
  pkgConf: TSdPackageConfig<any>;
}
```

---

### `IServerWorkerType`

Worker message protocol for the embedded dev server worker.

```typescript
import { IServerWorkerType } from "@simplysm/sd-cli";

interface IServerWorkerType {
  methods: {
    // Start listening; returns the bound port number
    listen: { params: [string | number]; returnType: number };
    // Update static file path proxies
    setPathProxy: { params: [Record<string, string>]; returnType: void };
    // Broadcast a live-reload event to connected clients
    broadcastReload: { params: [string | undefined, Set<string>]; returnType: void };
  };
  events: {};
}
```

---

## Utility Classes

### `SdCliConvertMessageUtils`

Converts diagnostic messages between TypeScript, ESLint, esbuild, and `ISdBuildMessage` formats.

```typescript
import { SdCliConvertMessageUtils } from "@simplysm/sd-cli";

// TypeScript diagnostics → ISdBuildMessage[]
SdCliConvertMessageUtils.convertToBuildMessagesFromTsDiag(diags: ts.Diagnostic[]): ISdBuildMessage[]

// esbuild errors/warnings → ISdBuildMessage[]
SdCliConvertMessageUtils.convertToBuildMessagesFromEsbuild(
  result: { errors?: PartialMessage[]; warnings?: PartialMessage[] },
  orgPath: string,
): ISdBuildMessage[]

// ESLint results → ISdBuildMessage[]
SdCliConvertMessageUtils.convertToBuildMessagesFromEslint(results: ESLint.LintResult[]): ISdBuildMessage[]

// ISdBuildMessage[] → esbuild errors/warnings
SdCliConvertMessageUtils.convertToEsbuildFromBuildMessages(
  messages: ISdBuildMessage[],
  orgPath: string,
): { errors: PartialMessage[]; warnings: PartialMessage[] }

// ESLint results → esbuild errors/warnings
SdCliConvertMessageUtils.convertToEsbuildFromEslint(
  results: ESLint.LintResult[],
  orgPath: string,
): { errors: PartialMessage[]; warnings: PartialMessage[] }

// Format a single ISdBuildMessage to a human-readable string
SdCliConvertMessageUtils.getBuildMessageString(result: ISdBuildMessage): string
```

---

### `SdCliPerformanceTimer`

Simple wall-clock and CPU-time profiler for named sections of code.

```typescript
import { SdCliPerformanceTimer } from "@simplysm/sd-cli";

const timer = new SdCliPerformanceTimer("My Report");

// Manual start/end
timer.start("section-a");
doWork();
timer.end("section-a");

// Inline wrapper (supports async functions).
// If the same name is used multiple times, times are accumulated.
const result = timer.run("section-b", () => doOtherWork());
const result2 = await timer.run("section-c", async () => await doAsyncWork());

// Print report (wall time + CPU time per section)
console.log(timer.toString());
```

---

## Internal Classes (not exported for public use)

The following classes are used internally by the CLI and are documented here for reference when
extending or debugging the build system:

| Class                  | Description                                                     |
| ---------------------- | --------------------------------------------------------------- |
| `SdCliProject`         | Entry point for `watch`, `build`, `publish` commands            |
| `SdCliLocalUpdate`     | Implements `local-update` file-copy logic                       |
| `SdCliElectron`        | Implements Electron run and build                               |
| `SdCliCordova`         | Implements Cordova build/run (deprecated)                       |
| `SdCliCapacitor`       | Implements Capacitor build/run                                  |
| `SdCliAiCommand`       | Implements AI-powered `commit` command                          |
| `SdCliPostInstall`     | Implements `postinstall` patches                                |
| `SdProjectBuildRunner` | Orchestrates parallel package build workers                     |
| `SdBuildRunnerBase`    | Abstract base for package-type-specific build runners           |
| `SdTsCompiler`         | TypeScript/Angular incremental compiler with ESLint integration |
| `SdStyleBundler`       | SCSS/CSS bundler via esbuild + sass-embedded                    |
| `SdDepAnalyzer`        | TypeScript dependency graph analyzer                            |
| `SdDepCache`           | Cache for dependency analysis results                           |
| `ScopePathSet`         | Resolves and normalizes watched scope paths                     |
