# CLI Two-Phase Execution & Cross-Platform CPU Affinity

## Problem

After `replaceDeps` copies source files to the `.pnpm` store, the current process still has old modules cached in memory. The CLI needs to re-execute with fresh modules to use the updated packages.

Also, CPU affinity/priority settings from the legacy CLI (Windows-only) should be restored with Linux/WSL support.

## Solution

Split `sd-cli.ts` into a launcher and entry. The launcher handles `replaceDeps` and process management, then spawns the actual CLI in a new process.

## Design

### File Structure

| File | Role |
|------|------|
| `sd-cli.ts` | Launcher: replaceDeps + spawn + affinity |
| `sd-cli-entry.ts` | Actual CLI: yargs commands (current `sd-cli.ts` content) |

### Execution Flow

**`.ts` execution (development in simplysm monorepo):**

1. Apply CPU affinity + priority to current process
2. `await import("./sd-cli-entry.ts")` — direct execution

**`.js` execution (consumer app, dist):**

1. If `replaceDeps` configured in `sd.config.ts`: run `setupReplaceDeps` directly (inline)
2. Spawn child process: `node sd-cli-entry.js <actual args>`
3. On child spawn: apply CPU affinity + priority to child PID

### CPU Affinity — Cross-Platform

**Affinity mask calculation** (from legacy):
- Exclude front cores: `Math.ceil(cpuCount / 4)` cores excluded
- Remaining cores: bits ON in hex mask

**Platform commands:**

| | Windows | Linux/WSL |
|--|---------|-----------|
| Affinity | `powershell -Command "$p = Get-Process -Id ${pid}; $p.ProcessorAffinity = ${mask}"` | `taskset -p ${mask} ${pid}` |
| Priority | `powershell -Command "$p = Get-Process -Id ${pid}; $p.PriorityClass = 'BelowNormal'"` | `renice +10 -p ${pid}` |

- Platform detection: `process.platform === "win32"` → Windows, else → Linux
- WSL runs as Linux, so automatically supported
- Async `exec`, failure is warn-only (non-blocking)

### Launcher (`sd-cli.ts`) Detail

```typescript
#!/usr/bin/env node

const cliEntryPath = import.meta.resolve("./sd-cli-entry");

if (path.extname(cliEntryPath) === ".ts") {
  // Development: direct execution
  configureAffinityAndPriority(process.pid);
  await import(cliEntryPath);
} else {
  // Production: two-phase
  // Phase 1: replaceDeps (inline)
  await runReplaceDepsIfConfigured();
  // Phase 2: spawn actual CLI
  const child = spawn("node", [fileURLToPath(cliEntryPath), ...process.argv.slice(2)], {
    stdio: "inherit",
  });
  child.on("spawn", () => {
    if (child.pid != null) configureAffinityAndPriority(child.pid);
  });
}
```

### Entry (`sd-cli-entry.ts`) Detail

Current `sd-cli.ts` content moved as-is (yargs parser, all commands). No changes to command logic.

## Files Changed

1. `packages/sd-cli/src/sd-cli.ts` — rewrite as launcher
2. `packages/sd-cli/src/sd-cli-entry.ts` — new file, current CLI content moved here

## Reference

- Legacy launcher: `.legacy-packages/simplysm/sd-cli/src/sd-cli.ts`
- Legacy local-update: `.legacy-packages/simplysm/sd-cli/src/entry/SdCliLocalUpdate.ts`
