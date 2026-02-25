# execa Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Replace all `child_process` usage with `execa` for cross-platform stability and reduced technical debt.

**Architecture:** Direct 1:1 replacement. `spawn.ts` custom wrapper is deleted; all callers use execa directly. ESLint rule prevents future `child_process` usage.

**Tech Stack:** execa v9 (ESM-only)

---

### Task 1: Add execa dependency

**Files:**
- Modify: `packages/sd-cli/package.json`
- Modify: `tests/orm/package.json`

**Step 1: Add execa to sd-cli dependencies**

In `packages/sd-cli/package.json`, add to `"dependencies"`:
```json
"execa": "^9.6.0"
```

**Step 2: Add execa to tests/orm devDependencies**

In `tests/orm/package.json`, add to `"devDependencies"`:
```json
"execa": "^9.6.0"
```

**Step 3: Install**

Run: `pnpm install`

**Step 4: Commit**

```bash
git add packages/sd-cli/package.json tests/orm/package.json pnpm-lock.yaml
git commit -m "chore(sd-cli,orm): add execa v9 dependency"
```

---

### Task 2: Migrate spawn.ts consumers and delete spawn.ts

6 files import from `../utils/spawn`. Replace with execa direct calls, then delete spawn.ts.

**Key mapping:** The old `spawn(cmd, args, { cwd, env })` returned `Promise<string>` (combined stdout+stderr). With execa, use `execa(cmd, args, { cwd, env })` which returns `{ stdout }`. The old wrapper also:
- Set `FORCE_COLOR`/`CLICOLOR_FORCE`/`COLORTERM` env vars by default — drop this (callers don't display piped output with color)
- Used `shell: true` on Windows — execa handles this automatically

**Files:**
- Modify: `packages/sd-cli/src/electron/electron.ts`
- Modify: `packages/sd-cli/src/capacitor/capacitor.ts`
- Modify: `packages/sd-cli/src/commands/add-server.ts`
- Modify: `packages/sd-cli/src/commands/add-client.ts`
- Modify: `packages/sd-cli/src/commands/init.ts`
- Modify: `packages/sd-cli/src/commands/publish.ts`
- Delete: `packages/sd-cli/src/utils/spawn.ts`

**Step 1: Migrate electron.ts**

Replace:
```typescript
import { spawn } from "../utils/spawn";
```
With:
```typescript
import { execa } from "execa";
```

Replace all `await spawn(cmd, args, { cwd, env })` calls with:
```typescript
const { stdout } = await execa(cmd, args, { cwd, env });
```
The function returns `result` (a string) — change to return `stdout`.

**Step 2: Migrate capacitor.ts**

Same pattern as electron.ts. Replace import, change `await spawn(cmd, args, { cwd })` to:
```typescript
const { stdout } = await execa(cmd, args, { cwd });
```

**Step 3: Migrate add-server.ts**

Replace:
```typescript
import { spawn } from "../utils/spawn";
```
With:
```typescript
import { execa } from "execa";
```

Replace:
```typescript
await spawn("pnpm", ["install"], { cwd });
```
With:
```typescript
await execa("pnpm", ["install"], { cwd });
```
(Return value is not used, so no destructuring needed.)

**Step 4: Migrate add-client.ts**

Same pattern as add-server.ts.

**Step 5: Migrate init.ts**

Replace import. Replace all `await spawn(cmd, args, { cwd })` with `await execa(cmd, args, { cwd })`.
None of the return values are used.

**Step 6: Migrate publish.ts**

Replace:
```typescript
import { spawn } from "../utils/spawn";
```
With:
```typescript
import { execa } from "execa";
```

This file has many spawn calls. Two patterns:

Pattern A — return value used (e.g., `npm whoami`, `git diff`):
```typescript
// Before
const whoami = await spawn("npm", ["whoami"]);
// After
const { stdout: whoami } = await execa("npm", ["whoami"]);

// Before
const diff = await spawn("git", ["diff", "--name-only"]);
// After
const { stdout: diff } = await execa("git", ["diff", "--name-only"]);
```

Pattern B — return value not used (e.g., `git add`, `git commit`, `pnpm publish`):
```typescript
// Before
await spawn("git", ["add", ...files]);
// After
await execa("git", ["add", ...files]);
```

**Step 7: Delete spawn.ts**

```bash
rm packages/sd-cli/src/utils/spawn.ts
```

**Step 8: Run typecheck to verify**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS (no errors)

**Step 9: Commit**

```bash
git add packages/sd-cli/src/
git commit -m "refactor(sd-cli): replace spawn.ts wrapper with execa"
```

---

### Task 3: Migrate sd-cli.ts

**Files:**
- Modify: `packages/sd-cli/src/sd-cli.ts`

**Step 1: Replace imports**

Replace:
```typescript
import { exec, spawn } from "child_process";
```
With:
```typescript
import { execa } from "execa";
```

**Step 2: Replace spawn (line 43-58)**

Current code spawns a child node process with `stdio: "inherit"` and handles `spawn`/`exit` events.

Replace:
```typescript
const child = spawn(
  "node",
  [
    "--max-old-space-size=8192",
    "--max-semi-space-size=16",
    cliEntryFilePath,
    ...process.argv.slice(2),
  ],
  { stdio: "inherit" },
);
child.on("spawn", () => {
  if (child.pid != null) configureAffinityAndPriority(child.pid);
});
child.on("exit", (code) => {
  process.exitCode = code ?? 0;
});
```
With:
```typescript
const subprocess = execa("node", [
  "--max-old-space-size=8192",
  "--max-semi-space-size=16",
  cliEntryFilePath,
  ...process.argv.slice(2),
], { stdio: "inherit", reject: false });
if (subprocess.pid != null) configureAffinityAndPriority(subprocess.pid);
const result = await subprocess;
process.exitCode = result.exitCode ?? 0;
```

Note: `execa()` returns a `ResultPromise` that has `.pid` available immediately. `reject: false` prevents throwing on non-zero exit code (we handle it manually).

**Step 3: Replace exec (line 100-105)**

Replace:
```typescript
exec(command, (err) => {
  if (err) {
    // eslint-disable-next-line no-console
    console.warn("CPU affinity/priority 설정 실패:", err.message);
  }
});
```
With:
```typescript
execa({ shell: true })`${command}`.catch((err: Error) => {
  // eslint-disable-next-line no-console
  console.warn("CPU affinity/priority 설정 실패:", err.message);
});
```

**Step 4: Run typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/sd-cli/src/sd-cli.ts
git commit -m "refactor(sd-cli): migrate sd-cli.ts from child_process to execa"
```

---

### Task 4: Migrate check.ts

**Files:**
- Modify: `packages/sd-cli/src/commands/check.ts`

**Step 1: Replace import**

Replace:
```typescript
import { spawn as cpSpawn } from "child_process";
```
With:
```typescript
import { execa } from "execa";
```

**Step 2: Replace spawnVitest function (line 29-72)**

Replace the entire `spawnVitest` function body with:

```typescript
async function spawnVitest(targets: string[]): Promise<CheckResult> {
  try {
    const args = ["vitest", ...targets, "--run"];
    const result = await execa("pnpm", args, { cwd: process.cwd(), reject: false });
    const output = result.stdout + result.stderr;
    const code = result.exitCode;

    const failMatch =
      output.match(/(\d+)\s+tests?\s+failed/i) ??
      output.match(/Tests\s+(\d+)\s+failed/i) ??
      output.match(/(\d+)\s+fail/i);
    const failCount = failMatch ? Number(failMatch[1]) : 0;

    return {
      name: "TEST",
      success: code === 0,
      errorCount: failCount,
      warningCount: 0,
      formattedOutput: code === 0 ? "" : output,
    };
  } catch (err) {
    return {
      name: "TEST",
      success: false,
      errorCount: 1,
      warningCount: 0,
      formattedOutput: err instanceof Error ? err.message : String(err),
    };
  }
}
```

**Step 3: Run typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/sd-cli/src/commands/check.ts
git commit -m "refactor(sd-cli): migrate check.ts from child_process to execa"
```

---

### Task 5: Migrate server.worker.ts

**Files:**
- Modify: `packages/sd-cli/src/workers/server.worker.ts`

**Step 1: Replace import**

Replace:
```typescript
import cp from "child_process";
```
With:
```typescript
import { execaSync } from "execa";
```

**Step 2: Replace cp.execSync call (line 199)**

Replace:
```typescript
const nodeVersion = cp.execSync("node -v").toString().trim();
```
With:
```typescript
const nodeVersion = execaSync("node", ["-v"]).stdout.trim();
```

**Important:** Do NOT touch line 268 (`cp.execSync("mise which node")`) or line 271 (`require("child_process")`) — these are string templates for generated pm2.config.cjs.

**Step 3: Run typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/sd-cli/src/workers/server.worker.ts
git commit -m "refactor(sd-cli): migrate server.worker.ts from child_process to execa"
```

---

### Task 6: Migrate tests/orm/vitest.setup.ts

**Files:**
- Modify: `tests/orm/vitest.setup.ts`

**Step 1: Replace import**

Replace:
```typescript
import { execSync } from "child_process";
```
With:
```typescript
import { execaSync } from "execa";
```

**Step 2: Replace execSync calls**

Line 12 — `docker compose up`:
```typescript
// Before
execSync(`docker compose -f "${composePath}" up -d --wait`, {
  stdio: "inherit",
});
// After
execaSync("docker", ["compose", "-f", composePath, "up", "-d", "--wait"], {
  stdio: "inherit",
});
```

Line 22-24 — `docker compose exec` (MSSQL setup):
```typescript
// Before
execSync(
  `docker compose -f "${composePath}" exec -T mssql /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P YourStrong@Passw0rd -Q "IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'TestDb') CREATE DATABASE TestDb"`,
  { stdio: "pipe" },
);
// After
execaSync("docker", [
  "compose", "-f", composePath,
  "exec", "-T", "mssql",
  "/opt/mssql-tools/bin/sqlcmd",
  "-S", "localhost",
  "-U", "sa",
  "-P", "YourStrong@Passw0rd",
  "-Q", "IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'TestDb') CREATE DATABASE TestDb",
]);
```

Line 50 — `docker compose down`:
```typescript
// Before
execSync(`docker compose -f "${composePath}" down`, {
  stdio: "inherit",
});
// After
execaSync("docker", ["compose", "-f", composePath, "down"], {
  stdio: "inherit",
});
```

**Step 3: Run typecheck**

Run: `pnpm typecheck tests/orm`
Expected: PASS

**Step 4: Commit**

```bash
git add tests/orm/vitest.setup.ts
git commit -m "refactor(orm): migrate vitest.setup.ts from child_process to execa"
```

---

### Task 7: Add ESLint no-restricted-imports rule

**Files:**
- Modify: `packages/lint/src/eslint-recommended.ts`

**Step 1: Add child_process to no-restricted-imports**

In the `noNodeBuiltinsRules` object (line 44-63), add two more entries to the `paths` array:

```typescript
{
  name: "child_process",
  message: "execa를 사용하세요.",
},
{
  name: "node:child_process",
  message: "execa를 사용하세요.",
},
```

**Step 2: Run lint to verify rule works**

Run: `pnpm lint packages/sd-cli --fix`
Expected: PASS (all child_process imports should already be removed by Tasks 2-6)

**Step 3: Commit**

```bash
git add packages/lint/src/eslint-recommended.ts
git commit -m "chore(lint): add no-restricted-imports rule for child_process"
```

---

## Task Dependencies

```
Task 1 (dependency) → Task 2, 3, 4, 5, 6, 7 (all parallel)
```

Tasks 2-7 are all independent and can run in parallel after Task 1 completes.

## Verification

After all tasks: run `pnpm typecheck packages/sd-cli` and `pnpm lint packages/sd-cli` to confirm no regressions.
