# Programmatic API

The following are exported from `@simplysm/sd-cli` for use in code.

---

## Config Types

All configuration types are exported:

```typescript
import type {
  SdConfig,
  SdConfigFn,
  SdConfigParams,
  SdPackageConfig,
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
  BuildTarget,
} from "@simplysm/sd-cli";
```

See [config.md](./config.md) for full type definitions.

---

## `createViteConfig(options)`

Create a Vite configuration object for building or serving a SolidJS + TailwindCSS client package.

```typescript
import { createViteConfig, type ViteConfigOptions } from "@simplysm/sd-cli";

const config = createViteConfig({
  pkgDir: "/path/to/packages/solid-demo",
  name: "solid-demo",
  tsconfigPath: "/path/to/packages/solid-demo/tsconfig.json",
  compilerOptions: {},
  env: { MY_VAR: "hello" },
  mode: "build", // or "dev"
  serverPort: 5173,
  replaceDeps: ["@simplysm/solid"],
  onScopeRebuild: () => console.log("scope package rebuilt"),
});
```

**`ViteConfigOptions`:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `pkgDir` | `string` | Yes | Absolute path to the package directory. |
| `name` | `string` | Yes | Package name (used as the Vite `base` path). |
| `tsconfigPath` | `string` | Yes | Path to `tsconfig.json`. |
| `compilerOptions` | `Record<string, unknown>` | Yes | TypeScript compiler options passed to esbuild. |
| `env` | `Record<string, string>` | No | Environment variables substituted via `define`. |
| `mode` | `"build" \| "dev"` | Yes | Build mode. `"build"` disables dev server. `"dev"` enables HMR. |
| `serverPort` | `number` | No | Dev server port. `0` = auto-assign (for server-proxied clients). |
| `replaceDeps` | `string[]` | No | Package names whose `dist/` dirs are watched for changes. |
| `onScopeRebuild` | `() => void` | No | Called when a `replaceDeps` package dist changes. |

**Returns:** `ViteUserConfig` (from the `vite` package)

**Vite plugins included:**
- `vite-tsconfig-paths` — TypeScript path alias resolution
- `vite-plugin-solid` — SolidJS JSX transform
- `vite-plugin-pwa` — Progressive Web App manifest and service worker
- `sd-tailwind-config-deps` — Watches scope-package Tailwind config changes (when `replaceDeps` is set)
- `sd-scope-watch` — Watches `replaceDeps` package `dist/` and triggers HMR (when `replaceDeps` is set)
- `sd-public-dev` — Serves `public-dev/` with priority over `public/` in dev mode

---

## Builders

These classes are exported for use in custom orchestration.

### `IBuilder`

Interface that all builders implement.

```typescript
interface IBuilder {
  initialize(): Promise<void>;
  build(): Promise<void>;
  startWatch(): Promise<void>;
  shutdown(): Promise<void>;
  getInitialBuildPromises(): Map<string, Promise<void>>;
}
```

---

### `BaseBuilder`

Abstract base class implementing common builder logic. Manages worker lifecycle, event handler registration, and initial-build promise tracking.

```typescript
import { BaseBuilder } from "@simplysm/sd-cli";
```

---

### `LibraryBuilder`

Builder for `node`/`browser`/`neutral` packages. Uses esbuild for JS compilation. Supports both watch mode and one-time production builds.

```typescript
import { LibraryBuilder } from "@simplysm/sd-cli";

const builder = new LibraryBuilder({
  cwd: process.cwd(),
  packages: [{ name: "core-common", dir: "/path/to/packages/core-common", config: { target: "neutral" } }],
  resultCollector,
  rebuildManager,
});
await builder.initialize();
await builder.startWatch(); // or builder.build() for production
```

---

### `DtsBuilder`

Builder for generating `.d.ts` declaration files using the TypeScript compiler. Supports both watch mode and one-time builds.

```typescript
import { DtsBuilder } from "@simplysm/sd-cli";

const builder = new DtsBuilder({
  cwd: process.cwd(),
  packages,
  resultCollector,
  rebuildManager,
});
await builder.initialize();
await builder.build();
```

---

### `PackageInfo`

```typescript
interface PackageInfo {
  name: string;
  dir: string;
  config: SdPackageConfig;
}
```

---

### `BuilderOptions`

```typescript
interface BuilderOptions {
  cwd: string;
  packages: PackageInfo[];
  resultCollector: ResultCollector;
  rebuildManager?: RebuildManager;
}
```

---

## Infrastructure

### `ResultCollector`

Collects and manages build results from multiple builders.

```typescript
import { ResultCollector } from "@simplysm/sd-cli";

const collector = new ResultCollector();
collector.add({ name: "core-common", target: "neutral", type: "build", status: "success" });
const result = collector.get("core-common:build");
const map = collector.toMap(); // Map<string, BuildResult>
```

**`BuildResult`:**

```typescript
interface BuildResult {
  name: string;
  target: string;
  type: "build" | "dts" | "server" | "capacitor";
  status: "pending" | "building" | "success" | "error" | "running";
  message?: string;
  port?: number;
}
```

---

### `SignalHandler`

Listens for `SIGINT` and `SIGTERM` and provides a `Promise` that resolves on termination.

```typescript
import { SignalHandler } from "@simplysm/sd-cli";

const handler = new SignalHandler();
await handler.waitForTermination();
// or
handler.requestTermination(); // programmatic termination
handler.isTerminated();       // boolean
```

---

### `WorkerManager`

Manages the lifecycle (create, lookup, terminate) of `Worker` threads.

```typescript
import { WorkerManager } from "@simplysm/sd-cli";

const manager = new WorkerManager();
const worker = manager.create<typeof MyWorkerModule>("core-common:build", workerPath);
const same = manager.get<typeof MyWorkerModule>("core-common:build");
await manager.terminate("core-common:build");
await manager.terminateAll();
manager.size; // number
manager.ids;  // string[]
```

---

## Orchestrators

### `BuildOrchestrator`

Coordinates a full production build (clean, lint, build all packages, Capacitor/Electron).

```typescript
import { BuildOrchestrator } from "@simplysm/sd-cli";

const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
await orchestrator.initialize();
const hasError = await orchestrator.start(); // returns true if errors occurred
await orchestrator.shutdown();
```

**`BuildOrchestratorOptions`:**

```typescript
interface BuildOrchestratorOptions {
  /** Package filter (empty = all packages) */
  targets: string[];
  /** Options to pass to sd.config.ts */
  options: string[];
}
```

---

### `WatchOrchestrator`

Coordinates watch mode for library packages (esbuild watch + `.d.ts` generation).

```typescript
import { WatchOrchestrator } from "@simplysm/sd-cli";

const orchestrator = new WatchOrchestrator({ targets: [], options: [] });
await orchestrator.initialize();
await orchestrator.start();
await orchestrator.awaitTermination();
await orchestrator.shutdown();
```

**`WatchOrchestratorOptions`:**

```typescript
interface WatchOrchestratorOptions {
  targets: string[];
  options: string[];
}
```

---

### `DevOrchestrator`

Coordinates dev mode for client (Vite) and server (esbuild + runtime) packages.

```typescript
import { DevOrchestrator } from "@simplysm/sd-cli";

const orchestrator = new DevOrchestrator({ targets: [], options: [] });
await orchestrator.initialize();
await orchestrator.start();
await orchestrator.awaitTermination();
await orchestrator.shutdown();
```

**`DevOrchestratorOptions`:**

```typescript
interface DevOrchestratorOptions {
  /** Package filter (empty = all client/server packages) */
  targets: string[];
  options: string[];
}
```

---

## Lint Programmatic API

### `runLint(options)`

Run lint and write output to stdout. Sets `process.exitCode = 1` on errors.

```typescript
import { runLint, type LintOptions } from "@simplysm/sd-cli";

await runLint({ targets: [], fix: false, timing: false });
```

### `executeLint(options)`

Run lint and return the result without writing to stdout or setting `process.exitCode`.

```typescript
import { executeLint, type LintResult } from "@simplysm/sd-cli";

const result: LintResult = await executeLint({ targets: [], fix: false, timing: false });
// result.success, result.errorCount, result.warningCount, result.formattedOutput
```

**`LintOptions`:**

```typescript
interface LintOptions {
  /** Path filter. Empty targets everything. */
  targets: string[];
  fix: boolean;
  timing: boolean;
}
```

**`LintResult`:**

```typescript
interface LintResult {
  success: boolean;
  errorCount: number;
  warningCount: number;
  /** Stylish-formatted ESLint + Stylelint output string */
  formattedOutput: string;
}
```

---

## Typecheck Programmatic API

### `runTypecheck(options)`

Run typecheck and write output to stdout. Sets `process.exitCode = 1` on errors.

```typescript
import { runTypecheck, type TypecheckOptions } from "@simplysm/sd-cli";

await runTypecheck({ targets: [], options: [] });
```

### `executeTypecheck(options)`

Run typecheck and return the result without writing to stdout or setting `process.exitCode`.

```typescript
import { executeTypecheck, type TypecheckResult } from "@simplysm/sd-cli";

const result: TypecheckResult = await executeTypecheck({ targets: [], options: [] });
// result.success, result.errorCount, result.warningCount, result.formattedOutput
```

**`TypecheckOptions`:**

```typescript
interface TypecheckOptions {
  targets: string[];
  options: string[];
}
```

**`TypecheckResult`:**

```typescript
interface TypecheckResult {
  success: boolean;
  errorCount: number;
  warningCount: number;
  /** TypeScript diagnostics formatted with color and context */
  formattedOutput: string;
}
```

---

## Check Programmatic API

### `runCheck(options)`

Run typecheck, lint, and/or tests, print sectioned output, and set `process.exitCode`.

```typescript
import { runCheck, type CheckOptions, type CheckType } from "@simplysm/sd-cli";

await runCheck({
  targets: [],
  types: ["typecheck", "lint", "test"],
});
```

**`CheckType`:**

```typescript
type CheckType = "typecheck" | "lint" | "test";
```

**`CheckOptions`:**

```typescript
interface CheckOptions {
  targets: string[];
  types: CheckType[];
}
```
