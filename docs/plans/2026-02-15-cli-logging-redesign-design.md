# CLI Logging Redesign: Remove listr2, Improve consola Logging

## Summary

Remove `listr2` dependency from `sd-cli` package and replace all task progress visualization with `consola` logging. Add debug-level logging at each logical step for process state tracking.

## Changes

### 1. Remove listr2

- Delete `utils/listr-manager.ts`
- Remove `listr-manager` export from `utils/index.ts`
- Remove `listr2` from `package.json` dependencies
- Remove all `import { Listr } from "listr2"` statements

### 2. Replacement Patterns

**Concurrent execution** → `Promise.allSettled`:

```typescript
// Before (listr2)
const listr = new Listr([task1, task2], { concurrent: true });
await listr.run();

// After
const results = await Promise.allSettled([
  (async () => {
    logger.start("[core-common] Build");
    await buildPackage();
    logger.success("[core-common] Build complete");
  })(),
  // ...
]);
```

**Sequential execution** → direct sequential code:

```typescript
// Before
const listr = new Listr([step1, step2], { concurrent: false });

// After
logger.start("ESLint config loading");
const config = await loadConfig();
logger.success("ESLint config loaded");

logger.start("Collecting lint target files");
const files = await collectFiles();
logger.success(`${files.length} files collected`);
```

**RebuildListrManager** → queue-based Promise logic (keep batch rebuild queue, replace Listr with Promise.allSettled + consola logging).

### 3. Consola Logging Strategy

#### Log Levels

| Level | Methods | Usage |
|-------|---------|-------|
| 0 | `error()`, `fatal()` | Fatal errors |
| 1 | `warn()` | Non-fatal warnings |
| 3 | `start()`, `success()`, `fail()`, `info()` | User-facing status |
| 4 | `debug()` | Internal state tracking (--debug mode) |

#### Normal Mode (level 3, default)

Shows user-facing status only:

```typescript
logger.start("Build started");
logger.success("Build complete");
logger.fail("Build failed");
logger.info("http://localhost:40081/");
logger.warn("Package not found: core-common");
logger.error("sd.config.ts load failed", err);
```

#### Debug Mode (level 4, --debug flag)

Additional internal state tracking:

```typescript
logger.debug("sd.config.ts loaded", { packages: 12 });
logger.debug("Package classification done", { node: 3, browser: 2, client: 1 });
logger.debug("[core-common] Build started");
logger.debug("[core-common] esbuild done", { duration: "1.2s" });
logger.debug("[server] Worker started", { pid: 12345 });
logger.debug("Promise.allSettled complete", { fulfilled: 2, rejected: 0 });
```

#### Unify Tagged Logger

All `consola.error(...)` direct calls → `logger.error(...)` (tagged logger) for consistency.

### 4. Files to Change

| File | Change |
|------|--------|
| `utils/listr-manager.ts` | **Delete** |
| `utils/index.ts` | Remove listr-manager export |
| `build.ts` | Listr 3-step → sequential + `Promise.allSettled`. Add debug at each package build |
| `dev.ts` | Initial Listr → `Promise.allSettled`. RebuildListrManager → Promise-based queue. Add debug at worker state changes |
| `lint.ts` | Listr sequential → direct sequential + `start/success`. Add debug at file collection/lint execution |
| `typecheck.ts` | Listr + Worker pool → `Promise.allSettled` + Worker pool (keep concurrency control). Add debug at each worker start/complete |
| `publish.ts` | Nested Listr → level-sequential + `Promise.allSettled` per level. Add debug at each publish step |
| `device.ts` | Simple Listr → direct `start/success` calls |
| `WatchOrchestrator.ts` | Initial Listr → `Promise.allSettled`. RebuildListrManager → Promise-based queue. Add debug at file change detection/rebuild |
| `package.json` | Remove `listr2` dependency |
