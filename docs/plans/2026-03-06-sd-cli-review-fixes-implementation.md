# sd-cli Review Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Fix 7 review findings in sd-cli: Content-Type bug, dead code, type safety, API uniformity, convention compliance, deduplication.

**Architecture:** Independent fixes applied sequentially. Types/configs modified first (F3, F5), then consumers (F4, F7), then structural refactoring (F8), then bug fix (F1+F2).

**Tech Stack:** TypeScript, esbuild, Vite, Node.js fs/path

---

### Task 1: Remove "neutral" from TypecheckEnv (F3)

**Files:**
- Modify: `packages/sd-cli/src/utils/tsconfig.ts:31-77`
- Modify: `packages/sd-cli/tests/get-compiler-options-for-package.spec.ts:70-86`

**Step 1: Update test — remove neutral test case, verify node/browser still pass**

In `packages/sd-cli/tests/get-compiler-options-for-package.spec.ts`, delete lines 70-86 (the `"neutral target: keeps lib, includes node in types"` test case). The `TypecheckEnv` type no longer includes `"neutral"`, so this test would fail to compile.

**Step 2: Run test to verify existing cases still pass**

Run: `pnpm vitest packages/sd-cli/tests/get-compiler-options-for-package.spec.ts --run`
Expected: PASS (3 remaining tests pass)

**Step 3: Modify TypecheckEnv type and remove dead code**

In `packages/sd-cli/src/utils/tsconfig.ts`:

1. Line 37: Change `export type TypecheckEnv = "node" | "browser" | "neutral";` to `export type TypecheckEnv = "node" | "browser";`
2. Lines 31-36: Update JSDoc to remove neutral description:
   ```typescript
   /**
    * Type check environment
    * - node: remove DOM lib + add node types
    * - browser: remove node types
    */
   ```
3. Lines 75-77: Delete the `case "neutral"` branch entirely.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/sd-cli/tests/get-compiler-options-for-package.spec.ts --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/sd-cli/src/utils/tsconfig.ts packages/sd-cli/tests/get-compiler-options-for-package.spec.ts
git commit -m "refactor(sd-cli): remove dead 'neutral' from TypecheckEnv"
```

---

### Task 2: SdPublishConfig uniform discriminated union (F5)

**Files:**
- Modify: `packages/sd-cli/src/sd-config.types.ts:9-17`
- Modify: `packages/sd-cli/src/commands/publish.ts:109,339,558`
- Test: `packages/sd-cli/tests/publish-config-narrowing.spec.ts`

**Step 1: Write the failing test**

Create `packages/sd-cli/tests/publish-config-narrowing.spec.ts`:

```typescript
import { describe, expect, it } from "vitest";
import type { SdPublishConfig, SdNpmPublishConfig } from "../src/sd-config.types";

describe("SdPublishConfig", () => {
  it("all variants have .type field for uniform narrowing", () => {
    const configs: SdPublishConfig[] = [
      { type: "npm" },
      { type: "local-directory", path: "/deploy" },
      { type: "ftp", host: "example.com" },
    ];

    const types = configs.map((c) => c.type);
    expect(types).toEqual(["npm", "local-directory", "ftp"]);
  });

  it("npm config is an object with type field", () => {
    const npmConfig: SdNpmPublishConfig = { type: "npm" };
    expect(npmConfig.type).toBe("npm");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/sd-cli/tests/publish-config-narrowing.spec.ts --run`
Expected: FAIL — `SdNpmPublishConfig` does not exist, `"npm"` string has no `.type` property

**Step 3: Implement — add SdNpmPublishConfig, update union**

In `packages/sd-cli/src/sd-config.types.ts`:

1. Add new interface after line 9 (`//#region Publish configuration types`):
   ```typescript
   /**
    * npm registry publish configuration
    */
   export interface SdNpmPublishConfig {
     type: "npm";
   }
   ```

2. Update the JSDoc and type at line 17:
   ```typescript
   /**
    * Package publish configuration
    * - SdNpmPublishConfig: deploy to npm registry
    * - SdLocalDirectoryPublishConfig: copy to local directory
    * - SdStoragePublishConfig: upload to FTP/FTPS/SFTP server
    */
   export type SdPublishConfig = SdNpmPublishConfig | SdLocalDirectoryPublishConfig | SdStoragePublishConfig;
   ```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/sd-cli/tests/publish-config-narrowing.spec.ts --run`
Expected: PASS

**Step 5: Update publish.ts consumers**

In `packages/sd-cli/src/commands/publish.ts`, update 3 locations:

1. Line 109: `if (pkg.config === "npm") continue;` → `if (pkg.config.type === "npm") continue;`
2. Line 339: `if (publishConfig === "npm") {` → `if (publishConfig.type === "npm") {`
3. Line 558: `if (publishPackages.some((p) => p.config === "npm")) {` → `if (publishPackages.some((p) => p.config.type === "npm")) {`

**Step 6: Commit**

```bash
git add packages/sd-cli/src/sd-config.types.ts packages/sd-cli/src/commands/publish.ts packages/sd-cli/tests/publish-config-narrowing.spec.ts
git commit -m "refactor(sd-cli): make SdPublishConfig uniform discriminated union"
```

---

### Task 3: Add BuildPackageInfo type alias (F4)

**Files:**
- Modify: `packages/sd-cli/src/builders/types.ts:1-12`
- Modify: `packages/sd-cli/src/builders/LibraryBuilder.ts:4,6,40,56,64,71`
- Modify: `packages/sd-cli/src/orchestrators/WatchOrchestrator.ts:88-104`

This is a type-only change (no runtime behavior change). Verification is via typecheck.

**Step 1: Add BuildPackageInfo type alias**

In `packages/sd-cli/src/builders/types.ts`, add import and type alias after line 1:

```typescript
import type { SdBuildPackageConfig, SdPackageConfig } from "../sd-config.types";
```

Replace line 1 (`import type { SdPackageConfig } from "../sd-config.types";`).

After the `PackageInfo` interface (after line 12), add:

```typescript
/**
 * PackageInfo narrowed for build packages (node/browser/neutral)
 */
export type BuildPackageInfo = PackageInfo & { config: SdBuildPackageConfig };
```

**Step 2: Update LibraryBuilder to use BuildPackageInfo**

In `packages/sd-cli/src/builders/LibraryBuilder.ts`:

1. Line 4: Remove `import type { SdBuildPackageConfig } from "../sd-config.types";`
2. Line 6: Change `import type { PackageInfo } from "./types";` to `import type { BuildPackageInfo, PackageInfo } from "./types";`
3. Line 40: Change `protected async buildPackage(pkg: PackageInfo)` to `protected async buildPackage(pkg: BuildPackageInfo)`
4. Line 56: Remove `as SdBuildPackageConfig` — `pkg.config` is already `SdBuildPackageConfig`
5. Line 64: Change `protected startWatchPackage(pkg: PackageInfo)` to `protected startWatchPackage(pkg: BuildPackageInfo)`
6. Line 71: Remove `as SdBuildPackageConfig`

**Step 3: Update WatchOrchestrator to create BuildPackageInfo array**

In `packages/sd-cli/src/orchestrators/WatchOrchestrator.ts`:

1. Update import: add `BuildPackageInfo` to the import from `"../builders/types"`
2. Line 43 (field declaration): Change `private _packages: PackageInfo[] = [];` to `private _packages: BuildPackageInfo[] = [];`
3. Lines 88-104: Change the `libraryConfigs` type to use `SdBuildPackageConfig`:
   ```typescript
   const libraryConfigs: Record<string, SdBuildPackageConfig> = {};
   for (const [name, config] of Object.entries(allPackages)) {
     if (isLibraryTarget(config.target)) {
       libraryConfigs[name] = config as SdBuildPackageConfig;
     }
   }
   ```
   (The `isLibraryTarget` type guard confirms target is BuildTarget, and `SdBuildPackageConfig` has `target: BuildTarget`. This single cast at the entry point replaces the 2 casts in LibraryBuilder.)

**Step 4: Verify typecheck passes**

Run: `pnpm tsc --noEmit -p packages/sd-cli/tsconfig.json` (or equivalent typecheck command)
Expected: No errors

**Step 5: Commit**

```bash
git add packages/sd-cli/src/builders/types.ts packages/sd-cli/src/builders/LibraryBuilder.ts packages/sd-cli/src/orchestrators/WatchOrchestrator.ts
git commit -m "refactor(sd-cli): add BuildPackageInfo type alias, remove unsafe casts"
```

---

### Task 4: Type registerWorkerEventHandlers parameter (F7)

**Files:**
- Modify: `packages/sd-cli/src/utils/worker-events.ts:66-127`

This is a type-level change eliminating `any` and `as` casts. No runtime behavior change.

**Step 1: Update function signature and remove casts**

In `packages/sd-cli/src/utils/worker-events.ts`, replace lines 66-73 (the function signature):

```typescript
export function registerWorkerEventHandlers(
  workerInfo: {
    name: string;
    config: { target: string };
    worker: {
      on(event: "buildStart", handler: (data: unknown) => void): void;
      on(event: "build", handler: (data: BuildEventData) => void): void;
      on(event: "error", handler: (data: ErrorEventData) => void): void;
    };
    isInitialBuild: boolean;
    buildResolver: (() => void) | undefined;
  },
```

Then update the handler bodies:

1. Line 93: Change `workerInfo.worker.on("build", (_data) => {` + line 94 `const data = _data as BuildEventData;` to:
   ```typescript
   workerInfo.worker.on("build", (data) => {
   ```
   (Remove the `_data` + cast pattern — `data` is already `BuildEventData` from the overload.)

2. Line 114: Change `workerInfo.worker.on("error", (_data) => {` + line 115 `const data = _data as ErrorEventData;` to:
   ```typescript
   workerInfo.worker.on("error", (data) => {
   ```

**Step 2: Verify typecheck passes**

Run: `pnpm tsc --noEmit -p packages/sd-cli/tsconfig.json`
Expected: No errors. DevOrchestrator's `ClientWorkerInfo` has `worker: WorkerProxy<typeof ClientWorkerModule>` whose `on()` method is compatible with the overloaded signature.

**Step 3: Commit**

```bash
git add packages/sd-cli/src/utils/worker-events.ts
git commit -m "refactor(sd-cli): type registerWorkerEventHandlers, remove any/as casts"
```

---

### Task 5: Extract _setupClientWorkers in DevOrchestrator (F8)

**Files:**
- Modify: `packages/sd-cli/src/orchestrators/DevOrchestrator.ts:310-485`

**Step 1: Define ClientSetupOptions interface and _setupClientWorkers method**

In `packages/sd-cli/src/orchestrators/DevOrchestrator.ts`, add the interface in the `//#region Types` section (after `ClientWorkerInfo` at line 45):

```typescript
/**
 * Options for client worker setup
 */
interface ClientSetupOptions {
  workers: ClientWorkerInfo[];
  /** Called on serverReady event. If undefined, completeTask is called with running status. */
  onServerReady?: (workerInfo: ClientWorkerInfo, port: number, completeTask: (result: BuildResult) => void) => void;
  /** Called on error event (in addition to default error handling) */
  onError?: (workerInfo: ClientWorkerInfo) => void;
  /** Create the config to pass to worker.startWatch() */
  createConfig: (workerInfo: ClientWorkerInfo) => SdClientPackageConfig;
}
```

**Step 2: Implement _setupClientWorkers**

Replace `_setupStandaloneClients` (lines 312-382) and `_setupViteClients` (lines 387-485) with a single `_setupClientWorkers` method:

```typescript
/**
 * Setup and start client workers (shared logic for standalone and Vite clients)
 */
private _setupClientWorkers(opts: ClientSetupOptions): Array<{ name: string; promise: Promise<void> }> {
  const buildPromises = new Map<string, Promise<void>>();
  for (const workerInfo of opts.workers) {
    buildPromises.set(
      workerInfo.name,
      new Promise<void>((resolve) => {
        workerInfo.buildResolver = resolve;
      }),
    );
  }

  for (const workerInfo of opts.workers) {
    const completeTask = registerWorkerEventHandlers(
      workerInfo,
      {
        resultKey: `${workerInfo.name}:build`,
        listrTitle: `${workerInfo.name} (client)`,
        resultType: "build",
      },
      this._results,
      this._rebuildManager,
    );

    workerInfo.worker.on("serverReady", (data) => {
      const event = data as ServerReadyEventData;
      if (opts.onServerReady != null) {
        opts.onServerReady(workerInfo, event.port, completeTask);
      } else {
        completeTask({
          name: workerInfo.name,
          target: workerInfo.config.target,
          type: "server",
          status: "running",
          port: event.port,
        });
      }
    });

    if (opts.onError != null) {
      const onError = opts.onError;
      workerInfo.worker.on("error", () => {
        onError(workerInfo);
      });
    }

    workerInfo.worker.on("scopeRebuild", () => {
      this._schedulePrintServers();
    });

    const pkgDir = path.join(this._cwd, "packages", workerInfo.name);
    const config = opts.createConfig(workerInfo);
    workerInfo.worker
      .startWatch({
        name: workerInfo.name,
        config,
        cwd: this._cwd,
        pkgDir,
        replaceDeps: this._sdConfig!.replaceDeps,
      })
      .catch((err: unknown) => {
        completeTask({
          name: workerInfo.name,
          target: workerInfo.config.target,
          type: "build",
          status: "error",
          message: errNs.message(err),
        });
      });
  }

  return opts.workers.map((workerInfo) => ({
    name: `${workerInfo.name} (client)`,
    promise: buildPromises.get(workerInfo.name) ?? Promise.resolve(),
  }));
}
```

**Step 3: Update callers in start() method**

Find where `_setupStandaloneClients()` is called (in the `start()` method) and replace with:

```typescript
// Standalone clients
const standaloneBuildPromises = this._setupClientWorkers({
  workers: this._standaloneClientWorkers,
  createConfig: (w) => ({
    ...w.config,
    env: { ...this._baseEnv, ...w.config.env },
  }),
});
```

Find where `_setupViteClients()` is called and replace. The caller also uses `readyPromises`, which must be managed at the call site:

```typescript
// Vite clients — readyPromises managed here
const viteReadyPromises = new Map<string, { promise: Promise<void>; resolver: () => void }>();
for (const workerInfo of this._viteClientWorkers) {
  let readyResolver!: () => void;
  const readyPromise = new Promise<void>((resolve) => {
    readyResolver = resolve;
  });
  viteReadyPromises.set(workerInfo.name, { promise: readyPromise, resolver: readyResolver });
}

const viteBuildPromises = this._setupClientWorkers({
  workers: this._viteClientWorkers,
  onServerReady: (w, port, completeTask) => {
    this._logger.debug(`[${w.name}] Vite serverReady (port: ${String(port)})`);
    this._clientPorts[w.name] = port;
    viteReadyPromises.get(w.name)?.resolver();
    completeTask({
      name: w.name,
      target: w.config.target,
      type: "build",
      status: "success",
    });
  },
  onError: (w) => {
    viteReadyPromises.get(w.name)?.resolver();
  },
  createConfig: (w) => ({
    ...w.config,
    server: 0,
    env: { ...this._baseEnv, ...w.config.env },
  }),
});
```

Then update references to the old return values (`readyPromises` → `viteReadyPromises`, `buildPromises` → `viteBuildPromises`).

**Step 4: Verify typecheck passes**

Run: `pnpm tsc --noEmit -p packages/sd-cli/tsconfig.json`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/sd-cli/src/orchestrators/DevOrchestrator.ts
git commit -m "refactor(sd-cli): extract _setupClientWorkers, remove client setup duplication"
```

---

### Task 6: Fix sdPublicDevPlugin Content-Type and error handling (F1+F2)

**Files:**
- Modify: `packages/sd-cli/src/utils/vite-config.ts:85-133`
- Test: `packages/sd-cli/tests/sd-public-dev-plugin-mime.spec.ts`

**Step 1: Write the failing test**

Create `packages/sd-cli/tests/sd-public-dev-plugin-mime.spec.ts`. This tests the MIME lookup utility that will be extracted:

```typescript
import { describe, expect, it } from "vitest";
import { getMimeType } from "../src/utils/vite-config";

describe("getMimeType", () => {
  it("returns correct MIME for common web types", () => {
    expect(getMimeType(".html")).toBe("text/html");
    expect(getMimeType(".css")).toBe("text/css");
    expect(getMimeType(".js")).toBe("text/javascript");
    expect(getMimeType(".json")).toBe("application/json");
    expect(getMimeType(".png")).toBe("image/png");
    expect(getMimeType(".svg")).toBe("image/svg+xml");
    expect(getMimeType(".woff2")).toBe("font/woff2");
  });

  it("returns application/octet-stream for unknown extensions", () => {
    expect(getMimeType(".xyz")).toBe("application/octet-stream");
    expect(getMimeType("")).toBe("application/octet-stream");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/sd-cli/tests/sd-public-dev-plugin-mime.spec.ts --run`
Expected: FAIL — `getMimeType` is not exported from `vite-config`

**Step 3: Implement MIME map and update file serving**

In `packages/sd-cli/src/utils/vite-config.ts`:

1. Add MIME map and exported lookup function before `sdPublicDevPlugin` (before line 85):

```typescript
/** Common MIME types for web assets served from public-dev/ */
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

/** @internal Exported for testing */
export function getMimeType(ext: string): string {
  return MIME_TYPES[ext.toLowerCase()] ?? "application/octet-stream";
}
```

2. Replace lines 123-126 (the file serving block) with:

```typescript
if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
  const ext = path.extname(filePath);
  res.setHeader("Content-Type", getMimeType(ext));
  const stream = fs.createReadStream(filePath);
  stream.on("error", () => next());
  stream.pipe(res);
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/sd-cli/tests/sd-public-dev-plugin-mime.spec.ts --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/sd-cli/src/utils/vite-config.ts packages/sd-cli/tests/sd-public-dev-plugin-mime.spec.ts
git commit -m "fix(sd-cli): add Content-Type header and error handler to sdPublicDevPlugin"
```
