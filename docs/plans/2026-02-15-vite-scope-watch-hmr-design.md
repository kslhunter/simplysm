# Vite Scope Package Watch HMR Fix

## Problem

`sdScopeWatchPlugin` in `vite-config.ts` calls `server.watcher.add(distDir)` to watch scope package dist directories (e.g., `node_modules/@simplysm/*/dist/`). However, Vite's chokidar watcher uses `**/node_modules/**` in its `ignored` pattern, and `add()` does not override this. Vite docs explicitly state: "It's currently not possible to watch files and packages in node_modules."

**Result**: When `replaceDeps` copies updated files into `node_modules/@simplysm/*/`, Vite's HMR does not trigger.

## Solution

Create a separate `FsWatcher` (from `@simplysm/core-node`) inside the Vite plugin's `configureServer` hook. This watcher has no `node_modules` ignore pattern, so it can detect changes in scope package dist directories.

When changes are detected, emit `"change"` events on Vite's own watcher with the resolved real path. This triggers Vite's internal HMR pipeline (module graph lookup, HMR boundary detection, handleHotUpdate hooks), providing:
- CSS changes: HMR update (no page reload)
- JS changes: full-reload (when no HMR boundary exists)

### Key Implementation Detail: Symlink Resolution

pnpm uses symlinks: `node_modules/@simplysm/solid` -> `.pnpm/.../node_modules/@simplysm/solid`. FsWatcher reports the symlink path, but Vite's module graph stores the real path (`preserveSymlinks: false` by default). Use `fs.realpathSync()` to convert before emitting.

## Changes

**File**: `packages/sd-cli/src/utils/vite-config.ts`

### 1. Add import

```typescript
import { FsWatcher } from "@simplysm/core-node";
```

### 2. Replace `configureServer` hook in `sdScopeWatchPlugin`

Before (ineffective):
```typescript
configureServer(server) {
  for (const scope of scopes) {
    const scopeDir = path.join(pkgDir, "node_modules", scope);
    if (!fs.existsSync(scopeDir)) continue;
    for (const pkgName of fs.readdirSync(scopeDir)) {
      const distDir = path.join(scopeDir, pkgName, "dist");
      if (fs.existsSync(distDir)) {
        server.watcher.add(distDir);
      }
    }
  }
},
```

After (working):
```typescript
async configureServer(server) {
  const distDirs: string[] = [];

  for (const scope of scopes) {
    const scopeDir = path.join(pkgDir, "node_modules", scope);
    if (!fs.existsSync(scopeDir)) continue;

    for (const pkgName of fs.readdirSync(scopeDir)) {
      const distDir = path.join(scopeDir, pkgName, "dist");
      if (fs.existsSync(distDir)) {
        distDirs.push(distDir);
      }
    }
  }

  if (distDirs.length === 0) return;

  // Vite's default watcher ignores **/node_modules/** and
  // server.watcher.add() does not override the ignored pattern.
  // Create a separate FsWatcher for scope package dist directories.
  const scopeWatcher = await FsWatcher.watch(distDirs);
  scopeWatcher.onChange({ delay: 300 }, (changeInfos) => {
    for (const { path: changedPath } of changeInfos) {
      // pnpm symlink -> real path (Vite module graph uses real paths)
      let realPath: string;
      try {
        realPath = fs.realpathSync(changedPath);
      } catch {
        continue; // File deleted
      }

      // Trigger Vite's internal HMR pipeline
      server.watcher.emit("change", realPath);
    }
  });

  // Cleanup on server close
  server.httpServer?.on("close", () => void scopeWatcher.close());
},
```

### Unchanged

- `config()` hook: `optimizeDeps.exclude` and nested deps `include` logic remains unchanged.

## Edge Cases

| Case | Handling |
|------|----------|
| dist/ doesn't exist yet | `fs.existsSync(distDir)` skips (pre-existing behavior) |
| File deletion events | `fs.realpathSync` catch skips (deleted files don't need HMR) |
| Rapid successive changes | `FsWatcher.onChange({ delay: 300 })` debounce batches events |
| Server shutdown watcher leak | `server.httpServer.on("close")` calls `scopeWatcher.close()` |
| Duplicate processing | Vite module graph uses timestamps to prevent redundant HMR |

## Verification

1. Run `pnpm dev` in consumer app
2. Modify `@simplysm/solid` source file
3. Confirm `replaceDeps` watcher logs file copy
4. Confirm browser auto-reloads
5. Confirm CSS-only changes update without page reload
