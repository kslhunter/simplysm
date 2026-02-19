# CLI Two-Phase Execution Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Split sd-cli.ts into launcher + entry for two-phase execution with cross-platform CPU affinity.

**Architecture:** Launcher handles replaceDeps inline then spawns entry in new process. CPU affinity via platform-specific commands (Windows PowerShell / Linux taskset+renice).

**Tech Stack:** Node.js child_process, os

---

### Task 1: Move CLI content to sd-cli-entry.ts

**Files:**
- Create: `packages/sd-cli/src/sd-cli-entry.ts`
- Modify: `packages/sd-cli/tests/sd-cli.spec.ts`

**Step 1: Create sd-cli-entry.ts**

Copy the entire content of `packages/sd-cli/src/sd-cli.ts` to `packages/sd-cli/src/sd-cli-entry.ts`. No modifications needed — the file keeps all imports, `createCliParser`, and the main module execution block exactly as-is.

**Step 2: Update test import**

In `packages/sd-cli/tests/sd-cli.spec.ts`, change:
```typescript
import { createCliParser } from "../src/sd-cli";
```
to:
```typescript
import { createCliParser } from "../src/sd-cli-entry";
```

**Step 3: Verify tests pass**

Run: `pnpm vitest packages/sd-cli/tests/sd-cli.spec.ts --run`

---

### Task 2: Rewrite sd-cli.ts as launcher

**Files:**
- Modify: `packages/sd-cli/src/sd-cli.ts`

**Step 1: Rewrite sd-cli.ts**

Replace entire content with the launcher implementation:

```typescript
#!/usr/bin/env node

import { exec, spawn } from "child_process";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

// Entry point path resolution
const cliEntryUrl = import.meta.resolve("./sd-cli-entry");
const cliEntryFilePath = fileURLToPath(cliEntryUrl);

if (path.extname(cliEntryFilePath) === ".ts") {
  // Development (.ts): apply affinity to current process, direct import
  configureAffinityAndPriority(process.pid);
  await import(cliEntryUrl);
} else {
  // Production (.js): two-phase execution

  // Phase 1: replaceDeps (inline, using installed version)
  try {
    const { loadSdConfig } = await import("./utils/sd-config.js");
    const { setupReplaceDeps } = await import("./utils/replace-deps.js");
    const sdConfig = await loadSdConfig({ cwd: process.cwd(), dev: false, opt: [] });
    if (sdConfig.replaceDeps != null) {
      await setupReplaceDeps(process.cwd(), sdConfig.replaceDeps);
    }
  } catch {
    // sd.config.ts 없거나 replaceDeps 미설정 시 스킵
  }

  // Phase 2: spawn actual CLI (fresh module cache)
  const child = spawn("node", [cliEntryFilePath, ...process.argv.slice(2)], {
    stdio: "inherit",
  });
  child.on("spawn", () => {
    if (child.pid != null) configureAffinityAndPriority(child.pid);
  });
  child.on("exit", (code) => {
    process.exitCode = code ?? 0;
  });
}

/**
 * CPU affinity mask 계산 (앞쪽 코어 제외)
 * 4개당 1개 제외, 나머지 비트 ON
 */
function calculateAffinityMask(cpuCount: number): string {
  const exclude = cpuCount <= 1 ? 0 : Math.ceil(cpuCount / 4);
  let mask = 0n;
  for (let i = exclude; i < cpuCount; i++) {
    mask |= 1n << BigInt(i);
  }
  return "0x" + mask.toString(16).toUpperCase();
}

/**
 * Cross-platform CPU affinity + priority 설정
 * - Windows: PowerShell ProcessorAffinity + PriorityClass
 * - Linux/WSL: taskset + renice
 * 실패해도 경고만 출력 (non-blocking)
 */
function configureAffinityAndPriority(pid: number): void {
  const cpuCount = os.cpus().length;
  const mask = calculateAffinityMask(cpuCount);

  let command: string;
  if (process.platform === "win32") {
    const commands = [
      `$p = Get-Process -Id ${pid}`,
      `$p.ProcessorAffinity = ${mask}`,
      `$p.PriorityClass = 'BelowNormal'`,
    ].join("; ");
    command = `powershell -Command "${commands}"`;
  } else {
    // Linux/WSL: taskset for affinity, renice for priority
    command = `taskset -p ${mask} ${pid} && renice +10 -p ${pid}`;
  }

  exec(command, (err) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.warn("CPU affinity/priority 설정 실패:", err.message);
    }
  });
}
```

**Step 2: Verify typecheck**

Run: `pnpm typecheck packages/sd-cli`

**Step 3: Verify tests**

Run: `pnpm vitest packages/sd-cli --run`
