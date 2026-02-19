# sd-cli Review Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Fix 19 verified code review issues (P0-P3) and unify build/watch/dev commands under Orchestrator pattern.

**Architecture:** Sequential implementation in dependency order. P0 critical fixes first, then utilities, type unification, DX improvements, orchestrator extraction.

**Tech Stack:** TypeScript, esbuild, Vite, Node.js workers, yargs CLI parser

---

## Task 1: Fix Shell Injection in SSH Public Key Registration

**Files:**
- Modify: `packages/sd-cli/src/commands/publish.ts:219`

**Step 1: Read the current code**

```bash
cd /home/kslhunter/projects/simplysm && \
  sed -n '210,230p' packages/sd-cli/src/commands/publish.ts
```

Expected: Show `echo '${publicKey}'` without escaping

**Step 2: Apply the fix**

Replace line 219 with escaping logic:

```typescript
// OLD
const cmd = [
  "mkdir -p ~/.ssh",
  "chmod 700 ~/.ssh",
  `echo '${publicKey}' >> ~/.ssh/authorized_keys`,
  "chmod 600 ~/.ssh/authorized_keys",
].join(" && ");

// NEW
const escapedKey = publicKey.replace(/'/g, "'\\''");
const cmd = [
  "mkdir -p ~/.ssh",
  "chmod 700 ~/.ssh",
  `echo '${escapedKey}' >> ~/.ssh/authorized_keys`,
  "chmod 600 ~/.ssh/authorized_keys",
].join(" && ");
```

**Step 3: Verify typecheck**

```bash
pnpm typecheck packages/sd-cli
```

Expected: PASS

**Step 4: Commit**

```bash
git add packages/sd-cli/src/commands/publish.ts
git commit -m "fix(sd-cli): escape single quotes in SSH public key registration"
```

---

## Task 2: Fix findAvailablePort Error Handling

**Files:**
- Modify: `packages/sd-cli/src/workers/server-runtime.worker.ts:116`

**Step 1: Read the current code**

```bash
sed -n '109,117p' packages/sd-cli/src/workers/server-runtime.worker.ts
```

Expected: Show `return startPort;` as fallback

**Step 2: Apply the fix**

Replace line 116:

```typescript
// OLD
return startPort;

// NEW
throw new Error(
  `${startPort}~${startPort + maxRetries - 1} 범위에서 사용 가능한 포트를 찾을 수 없습니다.`
);
```

**Step 3: Verify typecheck**

```bash
pnpm typecheck packages/sd-cli
```

Expected: PASS

**Step 4: Commit**

```bash
git add packages/sd-cli/src/workers/server-runtime.worker.ts
git commit -m "fix(sd-cli): throw error when no available port found instead of returning unavailable port"
```

---

## Task 3: Fix Workspace Path Filter

**Files:**
- Modify: `packages/sd-cli/src/commands/publish.ts:516`

**Step 1: Read the current code**

```bash
sed -n '514,517p' packages/sd-cli/src/commands/publish.ts
```

Expected: Show `.filter((item) => !item.includes("."))`

**Step 2: Apply the fix**

Replace filter to check basename:

```typescript
// OLD
.filter((item) => !item.includes("."));

// NEW
.filter((item) => !path.basename(item).includes("."));
```

**Step 3: Verify typecheck**

```bash
pnpm typecheck packages/sd-cli
```

Expected: PASS

**Step 4: Commit**

```bash
git add packages/sd-cli/src/commands/publish.ts
git commit -m "fix(sd-cli): check basename instead of full path for workspace filter"
```

---

## Task 4: Create registerCleanupHandlers Utility

**Files:**
- Create: `packages/sd-cli/src/utils/worker-utils.ts`

**Step 1: Create new file with helper**

```typescript
import type { ReturnType as Consola } from "consola";
import { consola } from "consola";

/**
 * Register SIGINT and SIGTERM handlers for graceful cleanup
 */
export function registerCleanupHandlers(
  cleanup: () => Promise<void>,
  logger: ReturnType<typeof consola.withTag>,
): void {
  const handler = async () => {
    process.off("SIGINT", wrappedHandler);
    process.off("SIGTERM", wrappedHandler);
    try {
      await cleanup();
    } catch (err) {
      logger.error("cleanup 실패", err);
    } finally {
      process.exit(0);
    }
  };

  const wrappedHandler = () => {
    void handler();
  };

  process.on("SIGINT", wrappedHandler);
  process.on("SIGTERM", wrappedHandler);
}
```

**Step 2: Verify typecheck**

```bash
pnpm typecheck packages/sd-cli
```

Expected: PASS

**Step 3: Commit**

```bash
git add packages/sd-cli/src/utils/worker-utils.ts
git commit -m "feat(sd-cli): add registerCleanupHandlers utility for workers"
```

---

## Task 5: Extract findPackageRoot to Shared Utility

**Files:**
- Modify: `packages/sd-cli/src/utils/package-utils.ts`
- Modify: `packages/sd-cli/src/commands/init.ts`
- Modify: `packages/sd-cli/src/commands/add-client.ts`
- Modify: `packages/sd-cli/src/commands/add-server.ts`

**Step 1: Read package-utils.ts to understand structure**

```bash
head -40 packages/sd-cli/src/utils/package-utils.ts
```

**Step 2: Add findPackageRoot function to package-utils.ts**

After the `PackageResult` interface, add:

```typescript
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Find package root by walking up directory tree until package.json is found
 */
export function findPackageRoot(startDir: string): string {
  let dir = startDir;
  while (!fs.existsSync(path.join(dir, "package.json"))) {
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error("package.json을 찾을 수 없습니다.");
    dir = parent;
  }
  return dir;
}
```

**Step 3: Update init.ts to import and use**

Replace local `findPackageRoot` function:

```typescript
// Add import
import { findPackageRoot } from "../utils/package-utils";

// Remove local function definition
```

**Step 4: Update add-client.ts to import and use**

Same as step 3

**Step 5: Update add-server.ts to import and use**

Same as step 3

**Step 6: Verify typecheck**

```bash
pnpm typecheck packages/sd-cli
```

Expected: PASS

**Step 7: Commit**

```bash
git add \
  packages/sd-cli/src/utils/package-utils.ts \
  packages/sd-cli/src/commands/init.ts \
  packages/sd-cli/src/commands/add-client.ts \
  packages/sd-cli/src/commands/add-server.ts
git commit -m "refactor(sd-cli): extract findPackageRoot to shared utility"
```

---

## Task 6: Rename listr-manager.ts to rebuild-manager.ts

**Files:**
- Move: `packages/sd-cli/src/utils/listr-manager.ts` → `packages/sd-cli/src/utils/rebuild-manager.ts`
- Modify: `packages/sd-cli/src/orchestrators/WatchOrchestrator.ts`
- Modify: `packages/sd-cli/src/commands/dev.ts`
- Modify: `packages/sd-cli/src/builders/BaseBuilder.ts`

**Step 1: Move the file**

```bash
cd packages/sd-cli/src/utils && \
  mv listr-manager.ts rebuild-manager.ts && \
  ls -la rebuild-manager.ts
```

Expected: File exists at new location

**Step 2: Update WatchOrchestrator import**

```typescript
// OLD
import { RebuildManager } from "../utils/listr-manager";

// NEW
import { RebuildManager } from "../utils/rebuild-manager";
```

**Step 3: Update dev.ts import**

Same as step 2

**Step 4: Update BaseBuilder import**

Same as step 2

**Step 5: Verify typecheck**

```bash
pnpm typecheck packages/sd-cli
```

Expected: PASS

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor(sd-cli): rename listr-manager.ts to rebuild-manager.ts"
```

---

## Task 7: Unify BuildResult Types

**Files:**
- Modify: `packages/sd-cli/src/infra/ResultCollector.ts`
- Modify: `packages/sd-cli/src/commands/build.ts`
- Delete: Remove `PackageResult` from `packages/sd-cli/src/utils/package-utils.ts`

**Step 1: Update ResultCollector.ts BuildResult type**

Change the type union to include all variants:

```typescript
export interface BuildResult {
  name: string;
  target: string;
  type: "build" | "dts" | "vite" | "capacitor" | "electron" | "server";
  status: "pending" | "building" | "success" | "error" | "running";
  message?: string;
  port?: number;
}
```

Also change:

```typescript
// OLD
getServers(): BuildResult[] {
  return this.getAll().filter((r) => r.type === "server" && r.status === "server");
}

// NEW
getServers(): BuildResult[] {
  return this.getAll().filter((r) => r.type === "server" && r.status === "running");
}
```

**Step 2: Remove PackageResult from package-utils.ts**

Delete the `PackageResult` interface and any related types.

**Step 3: Remove local BuildResult from build.ts**

Find and remove the local `interface BuildResult` definition in `build.ts`.

**Step 4: Update all usages of `status: "server"` to `status: "running"`**

Search for `status: "server"` and replace with `status: "running"`:

```bash
grep -r "status: \"server\"" packages/sd-cli/src/
```

Update all occurrences in:
- `output-utils.ts`
- `WatchOrchestrator.ts`
- `dev.ts`
- Any other files that reference this status

**Step 5: Verify typecheck**

```bash
pnpm typecheck packages/sd-cli
```

Expected: PASS

**Step 6: Commit**

```bash
git add \
  packages/sd-cli/src/infra/ResultCollector.ts \
  packages/sd-cli/src/commands/build.ts \
  packages/sd-cli/src/utils/package-utils.ts \
  packages/sd-cli/src/utils/output-utils.ts \
  packages/sd-cli/src/orchestrators/WatchOrchestrator.ts \
  packages/sd-cli/src/commands/dev.ts
git commit -m "refactor(sd-cli): unify BuildResult types and change 'server' status to 'running'"
```

---

## Task 8: Fix Capacitor versionCode Prerelease

**Files:**
- Modify: `packages/sd-cli/src/capacitor/capacitor.ts:671-675`

**Step 1: Read the current code**

```bash
sed -n '665,680p' packages/sd-cli/src/capacitor/capacitor.ts
```

**Step 2: Apply the fix**

```typescript
// OLD
const versionParts = version.split(".");
const versionCode =
  parseInt(versionParts[0] ?? "0") * 10000 +
  parseInt(versionParts[1] ?? "0") * 100 +
  parseInt(versionParts[2] ?? "0");

// NEW
const cleanVersion = version.replace(/-.*$/, "");
const versionParts = cleanVersion.split(".");
const versionCode =
  parseInt(versionParts[0] ?? "0") * 10000 +
  parseInt(versionParts[1] ?? "0") * 100 +
  parseInt(versionParts[2] ?? "0");
```

**Step 3: Verify typecheck**

```bash
pnpm typecheck packages/sd-cli
```

Expected: PASS

**Step 4: Commit**

```bash
git add packages/sd-cli/src/capacitor/capacitor.ts
git commit -m "fix(sd-cli): handle prerelease versions in Capacitor versionCode"
```

---

## Task 9: Fix Client Worker Undefined Port

**Files:**
- Modify: `packages/sd-cli/src/workers/client.worker.ts:209-211`

**Step 1: Read the current code**

```bash
sed -n '200,220p' packages/sd-cli/src/workers/client.worker.ts
```

**Step 2: Apply the fix**

```typescript
// OLD
const address = viteServer.httpServer?.address();
const actualPort = typeof address === "object" && address != null ? address.port : viteServer.config.server.port;
sender.send("serverReady", { port: actualPort });

// NEW
const address = viteServer.httpServer?.address();
const actualPort = typeof address === "object" && address != null
  ? address.port
  : viteServer.config.server.port;
if (actualPort == null) {
  sender.send("error", { message: "Vite dev server 포트를 확인할 수 없습니다." });
  return;
}
sender.send("serverReady", { port: actualPort });
```

**Step 3: Verify typecheck**

```bash
pnpm typecheck packages/sd-cli
```

Expected: PASS

**Step 4: Commit**

```bash
git add packages/sd-cli/src/workers/client.worker.ts
git commit -m "fix(sd-cli): guard against undefined port in Vite dev server"
```

---

## Task 10: Reuse parseWorkspaceGlobs in publish.ts

**Files:**
- Modify: `packages/sd-cli/src/commands/publish.ts:493-512`

**Step 1: Read current implementation in publish.ts**

```bash
sed -n '493,512p' packages/sd-cli/src/commands/publish.ts
```

**Step 2: Add import at top of publish.ts**

```typescript
import { parseWorkspaceGlobs } from "../utils/replace-deps";
```

**Step 3: Replace inline YAML parsing**

```typescript
// OLD
let inPackages = false;
for (const line of yamlContent.split("\n")) {
  if (/^packages:\s*$/.test(line)) {
    inPackages = true;
    continue;
  }
  if (inPackages) {
    const match = /^\s+-\s+(.+)$/.exec(line);
    if (match != null) {
      workspaceGlobs.push(match[1].trim());
    } else {
      break;
    }
  }
}

// NEW
workspaceGlobs.push(...parseWorkspaceGlobs(yamlContent));
```

**Step 4: Verify typecheck**

```bash
pnpm typecheck packages/sd-cli
```

Expected: PASS

**Step 5: Commit**

```bash
git add packages/sd-cli/src/commands/publish.ts
git commit -m "refactor(sd-cli): reuse parseWorkspaceGlobs in publish.ts"
```

---

## Task 11: Extract collectSearchRoots from replace-deps.ts

**Files:**
- Modify: `packages/sd-cli/src/utils/replace-deps.ts`

**Step 1: Read lines 136-149 and 229-241 to understand duplication**

```bash
sed -n '136,149p' packages/sd-cli/src/utils/replace-deps.ts
sed -n '229,241p' packages/sd-cli/src/utils/replace-deps.ts
```

**Step 2: Extract collectSearchRoots helper**

Add before `setupReplaceDeps`:

```typescript
async function collectSearchRoots(projectRoot: string): Promise<string[]> {
  const searchRoots = [projectRoot];
  const workspaceYamlPath = path.join(projectRoot, "pnpm-workspace.yaml");
  try {
    const yamlContent = await fs.promises.readFile(workspaceYamlPath, "utf-8");
    const workspaceGlobs = parseWorkspaceGlobs(yamlContent);
    for (const pattern of workspaceGlobs) {
      const dirs = await glob(pattern, { cwd: projectRoot, absolute: true });
      searchRoots.push(...dirs);
    }
  } catch {
    // pnpm-workspace.yaml가 없으면 루트만 처리
  }
  return searchRoots;
}
```

**Step 3: Update setupReplaceDeps to use helper**

```typescript
// OLD (lines 136-149)
const searchRoots = [projectRoot];
const workspaceYamlPath = path.join(projectRoot, "pnpm-workspace.yaml");
try {
  const yamlContent = await fs.promises.readFile(workspaceYamlPath, "utf-8");
  const workspaceGlobs = parseWorkspaceGlobs(yamlContent);
  for (const pattern of workspaceGlobs) {
    const dirs = await glob(pattern, { cwd: projectRoot, absolute: true });
    searchRoots.push(...dirs);
  }
} catch {
  // pnpm-workspace.yaml가 없으면 루트만 처리
}

// NEW
const searchRoots = await collectSearchRoots(projectRoot);
```

**Step 4: Update watchReplaceDeps to use helper**

Same as step 3 (lines 229-241 → `const searchRoots = await collectSearchRoots(projectRoot);`)

**Step 5: Verify typecheck**

```bash
pnpm typecheck packages/sd-cli
```

Expected: PASS

**Step 6: Commit**

```bash
git add packages/sd-cli/src/utils/replace-deps.ts
git commit -m "refactor(sd-cli): extract collectSearchRoots helper in replace-deps.ts"
```

---

## Task 12: Update CLI --options to --config-opt

**Files:**
- Modify: `packages/sd-cli/src/sd-cli-entry.ts` (7 command definitions)

**Step 1: Read first occurrence in build command**

```bash
sed -n '88,94p' packages/sd-cli/src/sd-cli-entry.ts
```

**Step 2: Update build command options**

```typescript
// OLD
options: {
  type: "string",
  array: true,
  alias: "o",
  description: "sd.config.ts에 전달할 옵션 (예: -o key=value)",
  default: [] as string[],
},

// NEW
configOpt: {
  type: "string",
  array: true,
  alias: "o",
  description: "sd.config.ts에 전달할 옵션 (예: -o key=value)",
  default: [] as string[],
},
```

**Step 3: Update build command handler**

```typescript
// OLD
sdConfig = await loadSdConfig({ cwd, dev: false, opt: options.options });

// NEW
sdConfig = await loadSdConfig({ cwd, dev: false, opt: options.configOpt });
```

**Step 4: Repeat steps 2-3 for all 7 commands**

Commands: `build`, `watch`, `dev`, `typecheck`, `lint`, `device`, `publish`

Find each with:
```bash
grep -n "type: \"string\"" packages/sd-cli/src/sd-cli-entry.ts | grep -A 5 "array: true"
```

**Step 5: Verify typecheck**

```bash
pnpm typecheck packages/sd-cli
```

Expected: PASS

**Step 6: Verify CLI help**

```bash
pnpm build && \
  dist/sd-cli.js build --help
```

Expected: Show `--config-opt` in help output

**Step 7: Commit**

```bash
git add packages/sd-cli/src/sd-cli-entry.ts
git commit -m "refactor(sd-cli): rename CLI --options flag to --config-opt"
```

---

## Task 13: Expand index.ts Exports

**Files:**
- Modify: `packages/sd-cli/src/index.ts`

**Step 1: Read current index.ts**

```bash
cat packages/sd-cli/src/index.ts
```

**Step 2: Update exports**

```typescript
// OLD
export * from "./sd-config.types";

// NEW
export * from "./sd-config.types";
export { createViteConfig, type ViteConfigOptions } from "./utils/vite-config";
export { sdTailwindConfigDepsPlugin, sdScopeWatchPlugin } from "./utils/vite-config";
```

**Step 3: Verify types exist in vite-config.ts**

```bash
grep -n "export.*createViteConfig\|export.*Vite.*Plugin\|type ViteConfigOptions" \
  packages/sd-cli/src/utils/vite-config.ts
```

**Step 4: Verify typecheck**

```bash
pnpm typecheck packages/sd-cli
```

Expected: PASS

**Step 5: Commit**

```bash
git add packages/sd-cli/src/index.ts
git commit -m "feat(sd-cli): export Vite utilities and createViteConfig from main index"
```

---

## Task 14: Extract isSubpathOnlyPackage Helper in vite-config.ts

**Files:**
- Modify: `packages/sd-cli/src/utils/vite-config.ts`

**Step 1: Read the nested try/catch structure**

```bash
sed -n '106,147p' packages/sd-cli/src/utils/vite-config.ts
```

**Step 2: Extract helper function**

Add before `sdScopeWatchPlugin`:

```typescript
/**
 * Check if a package only exports subpaths (e.g., @tiptap/pm)
 */
function isSubpathOnlyPackage(pkgJsonPath: string): boolean {
  try {
    const depPkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8")) as { exports?: unknown };
    if (depPkg.exports != null && typeof depPkg.exports === "object" && !("." in depPkg.exports)) {
      return true;
    }
  } catch {
    // If JSON parse fails, assume it's not subpath-only
  }
  return false;
}
```

**Step 3: Replace nested try/catch in sdScopeWatchPlugin**

```typescript
// OLD (4-level nesting)
try {
  const realPkgPath = fs.realpathSync(path.join(scopeDir, name));
  // ...
  const depPkg = JSON.parse(fs.readFileSync(depPkgJsonResolved, "utf-8")) as { ... };
  if (depPkg.exports != null && typeof depPkg.exports === "object" && ...) {
    continue;
  }
} catch {
  try {
    const depPkgJsonFallback = path.join(scopeDir, name, "node_modules", dep, "package.json");
    const depPkg = JSON.parse(fs.readFileSync(depPkgJsonFallback, "utf-8")) as { ... };
    if (depPkg.exports != null && typeof depPkg.exports === "object" && ...) {
      continue;
    }
  } catch {
    // 둘 다 실패하면 일단 포함
  }
}

// NEW (flattened)
if (isSubpathOnlyPackage(depPkgJsonResolved)) {
  continue;
}
// Try fallback path
if (fs.existsSync(depPkgJsonFallback) && isSubpathOnlyPackage(depPkgJsonFallback)) {
  continue;
}
// If neither exists or neither is subpath-only, include it
```

**Step 4: Verify typecheck**

```bash
pnpm typecheck packages/sd-cli
```

Expected: PASS

**Step 5: Commit**

```bash
git add packages/sd-cli/src/utils/vite-config.ts
git commit -m "refactor(sd-cli): extract isSubpathOnlyPackage helper and flatten nested try/catch"
```

---

## Task 15: Extract BaseBuilder Event Handler Consolidation

**Files:**
- Modify: `packages/sd-cli/src/builders/BaseBuilder.ts`
- Modify: `packages/sd-cli/src/builders/LibraryBuilder.ts`
- Modify: `packages/sd-cli/src/builders/DtsBuilder.ts`

**Step 1: Read BaseBuilder.ts structure**

```bash
head -80 packages/sd-cli/src/builders/BaseBuilder.ts
```

**Step 2: Add protected method to BaseBuilder**

```typescript
protected registerEventHandlersForWorker(
  workerKey: string,
  resultType: "build" | "dts" | "server",
  listrTitle: (name: string) => string,
): void {
  for (const pkg of this.packages) {
    const worker = this.workerManager.get<any>(`${pkg.name}:${workerKey}`)!;
    const resultKey = `${pkg.name}:${resultType}`;
    let isInitialBuild = true;
    worker.on("buildStart", () => { ... });
    worker.on("build", (data: any) => { ... });
    worker.on("error", (data: any) => { ... });
  }
}
```

**Step 3: Update LibraryBuilder.registerEventHandlers**

Replace the entire method with:

```typescript
protected registerEventHandlers(): void {
  this.registerEventHandlersForWorker(
    "build",
    "build",
    (name) => `${name} (${this.packages.find(p => p.name === name)?.config.target})`
  );
}
```

**Step 4: Update DtsBuilder.registerEventHandlers**

Same pattern as step 3

**Step 5: Verify typecheck**

```bash
pnpm typecheck packages/sd-cli
```

Expected: PASS

**Step 6: Commit**

```bash
git add \
  packages/sd-cli/src/builders/BaseBuilder.ts \
  packages/sd-cli/src/builders/LibraryBuilder.ts \
  packages/sd-cli/src/builders/DtsBuilder.ts
git commit -m "refactor(sd-cli): consolidate event handler registration in BaseBuilder"
```

---

## Task 16: Replace library.worker Signal Handler with registerCleanupHandlers

**Files:**
- Modify: `packages/sd-cli/src/workers/library.worker.ts:93-111`

**Step 1: Add import**

```typescript
import { registerCleanupHandlers } from "../utils/worker-utils";
```

**Step 2: Replace SIGINT/SIGTERM handlers**

```typescript
// OLD
process.on("SIGTERM", () => { ... });
process.on("SIGINT", () => { ... });

// NEW
registerCleanupHandlers(cleanup, logger);
```

**Step 3: Verify typecheck**

```bash
pnpm typecheck packages/sd-cli
```

Expected: PASS

**Step 4: Commit**

```bash
git add packages/sd-cli/src/workers/library.worker.ts
git commit -m "refactor(sd-cli): use registerCleanupHandlers in library worker"
```

---

## Task 17: Replace client.worker Signal Handler

**Files:**
- Modify: `packages/sd-cli/src/workers/client.worker.ts:100-118`

**Step 1: Add import**

Same as Task 16, Step 1

**Step 2: Replace handlers**

Same pattern as Task 16, Step 2

**Step 3: Verify typecheck**

```bash
pnpm typecheck packages/sd-cli
```

Expected: PASS

**Step 4: Commit**

```bash
git add packages/sd-cli/src/workers/client.worker.ts
git commit -m "refactor(sd-cli): use registerCleanupHandlers in client worker"
```

---

## Task 18: Replace server.worker Signal Handler

**Files:**
- Modify: `packages/sd-cli/src/workers/server.worker.ts:251-272`

**Step 1: Add import**

Same as Task 16, Step 1

**Step 2: Replace handlers**

Same pattern as Task 16, Step 2

**Step 3: Verify typecheck**

```bash
pnpm typecheck packages/sd-cli
```

Expected: PASS

**Step 4: Commit**

```bash
git add packages/sd-cli/src/workers/server.worker.ts
git commit -m "refactor(sd-cli): use registerCleanupHandlers in server worker"
```

---

## Task 19: Replace server-runtime.worker Signal Handler

**Files:**
- Modify: `packages/sd-cli/src/workers/server-runtime.worker.ts:72-90`

**Step 1: Add import**

Same as Task 16, Step 1

**Step 2: Replace handlers**

Same pattern as Task 16, Step 2

**Step 3: Verify typecheck**

```bash
pnpm typecheck packages/sd-cli
```

Expected: PASS

**Step 4: Commit**

```bash
git add packages/sd-cli/src/workers/server-runtime.worker.ts
git commit -m "refactor(sd-cli): use registerCleanupHandlers in server-runtime worker"
```

---

## Task 20: Type-Safe Worker Events (Phase 1 - Infrastructure)

**Files:**
- Modify: `packages/sd-cli/src/utils/worker-events.ts`

**Step 1: Read current structure**

```bash
head -100 packages/sd-cli/src/utils/worker-events.ts
```

**Step 2: Add generic type to BaseWorkerInfo**

```typescript
export interface BaseWorkerInfo<TEvents extends Record<string, any[]> = Record<string, any[]>> {
  worker: {
    on<K extends keyof TEvents>(
      event: K,
      handler: (data: TEvents[K][0]) => void
    ): void;
    send<K extends keyof TEvents>(event: K, data: TEvents[K][0]): void;
  };
}
```

**Step 3: Verify typecheck**

```bash
pnpm typecheck packages/sd-cli
```

Expected: May have errors — this is step 1 of 2

**Step 4: Commit**

```bash
git add packages/sd-cli/src/utils/worker-events.ts
git commit -m "refactor(sd-cli): add generic types to BaseWorkerInfo for type-safe events"
```

---

## Task 21: Type-Safe Worker Events (Phase 2 - Usage in dev.ts)

**Files:**
- Modify: `packages/sd-cli/src/commands/dev.ts`

**Step 1: Update worker creation type casts**

Change worker creation lines to use properly typed generics:

```typescript
// OLD
const viteClientWorker: WorkerProxy<typeof ClientWorkerModule> = Worker.create<typeof ClientWorkerModule>(
  ...
);
viteClientWorker.on("serverReady", (data) => {
  const event = data as ServerReadyEventData;
  ...
});

// NEW
const viteClientWorker: WorkerProxy<typeof ClientWorkerModule, ClientWorkerEvents> = ...;
viteClientWorker.on("serverReady", (data) => {
  // data is now typed as ServerReadyEventData automatically
  ...
});
```

**Step 2: Remove all `as EventType` casts in dev.ts**

Casts become unnecessary with proper typing

**Step 3: Verify typecheck**

```bash
pnpm typecheck packages/sd-cli
```

Expected: PASS

**Step 4: Commit**

```bash
git add packages/sd-cli/src/commands/dev.ts
git commit -m "refactor(sd-cli): use type-safe worker events in dev.ts"
```

---

## Task 22: Create BuildOrchestrator

**Files:**
- Create: `packages/sd-cli/src/orchestrators/BuildOrchestrator.ts`
- Modify: `packages/sd-cli/src/commands/build.ts`

**Step 1: Create BuildOrchestrator skeleton**

```typescript
import type { PackageInfo } from "../utils/package-utils";
import type { SdConfig } from "../sd-config.types";
import { BaseOrchestrator } from "./BaseOrchestrator";
import { LibraryBuilder } from "../builders/LibraryBuilder";
import { DtsBuilder } from "../builders/DtsBuilder";

export class BuildOrchestrator extends BaseOrchestrator {
  private libraryBuilder: LibraryBuilder | null = null;
  private dtsBuilder: DtsBuilder | null = null;

  async initialize(): Promise<void> {
    // Load config, validate, classify packages
  }

  async start(): Promise<void> {
    // Create builders, run builds
  }

  async shutdown(): Promise<void> {
    // Clean up workers
  }
}
```

**Step 2: Implement initialize()**

Adapt logic from `build.ts:130-160`

**Step 3: Implement start()**

Adapt logic from `build.ts:162-410` (but without watch)

**Step 4: Implement shutdown()**

Call `await this.workerManager.shutdown()`

**Step 5: Simplify build.ts**

```typescript
const orchestrator = new BuildOrchestrator(cwd, opt);
try {
  await orchestrator.initialize();
  const results = await orchestrator.start();
  const errors = results.getErrors();
  if (errors.length > 0) {
    process.exitCode = 1;
  }
} finally {
  await orchestrator.shutdown();
}
```

**Step 6: Verify typecheck**

```bash
pnpm typecheck packages/sd-cli
```

Expected: PASS

**Step 7: Test build command**

```bash
pnpm build && pnpm build solid
```

Expected: Builds succeed

**Step 8: Commit**

```bash
git add \
  packages/sd-cli/src/orchestrators/BuildOrchestrator.ts \
  packages/sd-cli/src/commands/build.ts
git commit -m "feat(sd-cli): extract BuildOrchestrator and simplify build command"
```

---

## Task 23: Create DevOrchestrator

**Files:**
- Create: `packages/sd-cli/src/orchestrators/DevOrchestrator.ts`
- Modify: `packages/sd-cli/src/commands/dev.ts`

**Step 1: Create DevOrchestrator skeleton**

Similar to BuildOrchestrator but with more complex worker management

```typescript
export class DevOrchestrator extends BaseOrchestrator {
  private signalHandler: SignalHandler | null = null;
  private standaloneClientBuilders = new Map<string, ClientDevBuilder>();
  private serverBuildBuilders = new Map<string, LibraryBuilder>();
  // ... other maps for state

  async initialize(): Promise<void> { ... }
  async start(): Promise<void> { ... }
  async awaitTermination(): Promise<void> { ... }
  async shutdown(): Promise<void> { ... }
}
```

**Step 2: Implement initialize()**

Adapt from `dev.ts:70-160`

**Step 3: Implement start()**

Adapt worker creation and coordination from `dev.ts:186-550`

**Step 4: Implement awaitTermination()**

```typescript
async awaitTermination(): Promise<void> {
  await this.signalHandler!.waitForTermination();
}
```

**Step 5: Implement shutdown()**

Terminate all workers, clean up resources

**Step 6: Simplify dev.ts to ~40 lines**

```typescript
const orchestrator = new DevOrchestrator(cwd, options);
try {
  await orchestrator.initialize();
  await orchestrator.start();
  await orchestrator.awaitTermination();
} finally {
  await orchestrator.shutdown();
}
```

**Step 7: Verify typecheck**

```bash
pnpm typecheck packages/sd-cli
```

Expected: PASS

**Step 8: Test dev command**

```bash
pnpm dev
```

Expected: Dev server starts, Ctrl+C gracefully exits

**Step 9: Commit**

```bash
git add \
  packages/sd-cli/src/orchestrators/DevOrchestrator.ts \
  packages/sd-cli/src/commands/dev.ts
git commit -m "feat(sd-cli): extract DevOrchestrator and simplify dev command"
```

---

## Final Verification

**Step 1: Run full typecheck**

```bash
pnpm typecheck
```

Expected: PASS

**Step 2: Run lint**

```bash
pnpm lint packages/sd-cli
```

Expected: PASS

**Step 3: Run build**

```bash
pnpm build solid
```

Expected: SUCCESS

**Step 4: Run watch**

```bash
pnpm watch solid &
```

After 10 seconds:
```bash
kill %1
```

Expected: Watch starts and gracefully stops

**Step 5: Final commit summary**

```bash
git log --oneline -20
```

Expected: 23 commits for this refactoring

---

## Notes

- Each commit should be small and focused (2-5 minute tasks)
- Always verify typecheck/lint after each task
- Manual test the commands (dev, watch, build) after orchestrator changes
- The refactoring maintains all existing functionality while improving code organization
