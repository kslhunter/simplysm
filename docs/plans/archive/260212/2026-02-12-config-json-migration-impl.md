# `.config.json` Build-time Generation - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Migrate the legacy `.config.json` build-time generation to the current `sd-cli`, so that `sd.config.ts`'s `configs` field is written to `dist/.config.json` during server and client builds.

**Architecture:** Add `configs?: Record<string, unknown>` field to `SdServerPackageConfig` and `SdClientPackageConfig`. Server worker receives `configs` as a flat parameter (since it uses a flat info struct). Client worker already receives the full `SdClientPackageConfig`, so the field flows automatically. Both workers write `dist/.config.json` after build completes.

**Tech Stack:** TypeScript, esbuild (server), Vite (client), Node.js `fs`

---

### Task 1: Add `configs` field to config types

**Files:**
- Modify: `packages/sd-cli/src/sd-config.types.ts:183-190` (SdServerPackageConfig)
- Modify: `packages/sd-cli/src/sd-config.types.ts:161-178` (SdClientPackageConfig)

**Step 1: Add `configs` to `SdServerPackageConfig`**

In `packages/sd-cli/src/sd-config.types.ts`, add `configs` field to `SdServerPackageConfig` after `publish`:

```typescript
export interface SdServerPackageConfig {
  /** build target */
  target: "server";
  /** environment variables to replace at build time (process.env.KEY replaced with constants) */
  env?: Record<string, string>;
  /** publish config */
  publish?: SdPublishConfig;
  /** runtime config (written to dist/.config.json during build) */
  configs?: Record<string, unknown>;
}
```

**Step 2: Add `configs` to `SdClientPackageConfig`**

In the same file, add `configs` field to `SdClientPackageConfig` after `electron`:

```typescript
export interface SdClientPackageConfig {
  /** build target */
  target: "client";
  /** server config */
  server: string | number;
  /** environment variables to replace at build time */
  env?: Record<string, string>;
  /** publish config */
  publish?: SdPublishConfig;
  /** Capacitor config */
  capacitor?: SdCapacitorConfig;
  /** Electron config */
  electron?: SdElectronConfig;
  /** runtime config (written to dist/.config.json during build) */
  configs?: Record<string, unknown>;
}
```

**Step 3: Run typecheck to verify**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS (no errors, since `configs` is optional)

**Step 4: Commit**

```bash
git add packages/sd-cli/src/sd-config.types.ts
git commit -m "feat(sd-cli): add configs field to SdServerPackageConfig and SdClientPackageConfig"
```

---

### Task 2: Add `.config.json` generation to server worker

**Files:**
- Modify: `packages/sd-cli/src/workers/server.worker.ts`

**Step 1: Add `configs` to `ServerBuildInfo` and `ServerWatchInfo`**

In `packages/sd-cli/src/workers/server.worker.ts`, add `configs` field to both info types:

```typescript
export interface ServerBuildInfo {
  name: string;
  cwd: string;
  pkgDir: string;
  /** environment variables to replace at build time */
  env?: Record<string, string>;
  /** runtime config (written to dist/.config.json) */
  configs?: Record<string, unknown>;
}
```

```typescript
export interface ServerWatchInfo {
  name: string;
  cwd: string;
  pkgDir: string;
  /** environment variables to replace at build time */
  env?: Record<string, string>;
  /** runtime config (written to dist/.config.json) */
  configs?: Record<string, unknown>;
}
```

**Step 2: Add `fs` import**

Add `import fs from "fs";` at the top of the file (after `import path from "path";`).

**Step 3: Write `.config.json` after one-shot build**

In the `build()` function, after `await esbuild.build(esbuildOptions)` succeeds (line ~138), add config generation before the return:

```typescript
const result = await esbuild.build(esbuildOptions);

// Generate .config.json
const confDistPath = path.join(info.pkgDir, "dist", ".config.json");
fs.writeFileSync(confDistPath, JSON.stringify(info.configs ?? {}, undefined, 2));

const errors = result.errors.map((e) => e.text);
```

**Step 4: Write `.config.json` on first watch build**

In the `startWatch()` function, inside `pluginBuild.onEnd()` callback (line ~206), add config generation on first build only:

```typescript
pluginBuild.onEnd((result) => {
  const errors = result.errors.map((e) => e.text);
  const success = result.errors.length === 0;

  // Generate .config.json on first successful build
  if (isFirstBuild && success) {
    const confDistPath = path.join(info.pkgDir, "dist", ".config.json");
    fs.writeFileSync(confDistPath, JSON.stringify(info.configs ?? {}, undefined, 2));
  }

  sender.send("build", { success, mainJsPath, errors: errors.length > 0 ? errors : undefined });

  if (isFirstBuild) {
    isFirstBuild = false;
    resolveFirstBuild();
  }
});
```

**Step 5: Run typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/sd-cli/src/workers/server.worker.ts
git commit -m "feat(sd-cli): generate dist/.config.json in server worker build"
```

---

### Task 3: Add `.config.json` generation to client worker

**Files:**
- Modify: `packages/sd-cli/src/workers/client.worker.ts`

**Step 1: Add `fs` import**

Add `import fs from "fs";` at the top of the file (after `import path from "path";`).

**Step 2: Write `.config.json` after one-shot Vite build**

In the `build()` function, after `await viteBuild(viteConfig)` succeeds (line ~145), add config generation:

```typescript
await viteBuild(viteConfig);

// Generate .config.json
const confDistPath = path.join(info.pkgDir, "dist", ".config.json");
fs.writeFileSync(confDistPath, JSON.stringify(info.config.configs ?? {}, undefined, 2));

return { success: true };
```

Note: Client worker already has `info.config` which is `SdClientPackageConfig`, so `info.config.configs` is directly accessible.

**Step 3: Write `.config.json` after watch mode Vite server starts**

In the `startWatch()` function, after `await viteServer.listen()` (line ~196), add config generation:

```typescript
await viteServer.listen();

// Generate .config.json
const confDistPath = path.join(info.pkgDir, "dist", ".config.json");
fs.mkdirSync(path.dirname(confDistPath), { recursive: true });
fs.writeFileSync(confDistPath, JSON.stringify(info.config.configs ?? {}, undefined, 2));

// Return the actual assigned port
sender.send("serverReady", { port: viteServer.config.server.port });
```

Note: In watch/dev mode, Vite dev server does not create `dist/`, so `fs.mkdirSync` with `recursive: true` ensures the directory exists.

**Step 4: Run typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/sd-cli/src/workers/client.worker.ts
git commit -m "feat(sd-cli): generate dist/.config.json in client worker build"
```

---

### Task 4: Pass `configs` to server worker in build.ts and dev.ts

**Files:**
- Modify: `packages/sd-cli/src/commands/build.ts:390-395`
- Modify: `packages/sd-cli/src/commands/dev.ts:516-521`

**Step 1: Pass `configs` in build.ts server worker call**

In `packages/sd-cli/src/commands/build.ts`, find the server worker `build()` call (~line 390) and add `configs`:

```typescript
const buildResult = await serverWorker.build({
  name,
  cwd,
  pkgDir,
  env: { ...baseEnv, ...config.env },
  configs: config.configs,
});
```

Note: No changes needed for client in build.ts - `clientConfig` already spreads `config` which includes `configs`.

**Step 2: Pass `configs` in dev.ts server worker startWatch call**

In `packages/sd-cli/src/commands/dev.ts`, find the server build worker `startWatch()` call (~line 516) and add `configs`:

```typescript
serverBuild.worker
  .startWatch({
    name,
    cwd,
    pkgDir,
    env: { ...baseEnv, ...config.env },
    configs: config.configs,
  })
```

Note: No changes needed for client in dev.ts - `clientConfig`/`viteConfig` already spreads `workerInfo.config` which includes `configs`.

**Step 3: Run typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 4: Run lint**

Run: `pnpm lint packages/sd-cli`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/sd-cli/src/commands/build.ts packages/sd-cli/src/commands/dev.ts
git commit -m "feat(sd-cli): pass configs to server worker in build and dev commands"
```

---

### Task 5: Final verification

**Step 1: Run full typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 2: Run full lint**

Run: `pnpm lint packages/sd-cli`
Expected: PASS

**Step 3: Run sd-cli tests**

Run: `pnpm vitest packages/sd-cli --project=node --run`
Expected: PASS (existing tests should not break)
