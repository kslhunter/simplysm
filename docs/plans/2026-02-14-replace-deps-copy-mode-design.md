# replaceDeps: Symlink to Copy Mode Migration

## Problem

`replaceDeps` currently replaces node_modules packages with symlinks to source directories.
This forces `preserveSymlinks: true` in Vite config, which breaks pnpm's dependency resolution
(transitive dependencies like `@solid-primitives/event-listener` cannot be resolved).

## Solution

Change `replaceDeps` from symlink replacement to file copying into the resolved `.pnpm` store path.
This preserves pnpm's dependency tree while enabling real-time source updates.

## Design

### Core Logic (`packages/sd-cli/src/utils/replace-deps.ts`)

**`setupReplaceDeps(projectRoot, replaceDeps)`** (modified)

1. Reuse existing `resolveReplaceDepEntries` for pattern matching
2. Resolve target symlink path via `fs.realpath` to get actual `.pnpm` store path
3. Copy source files to resolved path

Excluded from copy:
- `node_modules/`
- `package.json`
- `.cache/`
- `tests/`

**`watchReplaceDeps(projectRoot, replaceDeps)`** (new)

1. Watch source directories for changes
2. On change: copy only the changed file to resolved `.pnpm` store path
3. On delete: remove the corresponding file from target
4. Returns a dispose function for watcher cleanup
5. Delay: 300ms (matches legacy `localUpdates` behavior)

### Call Sites

| Location | Current | After |
|----------|---------|-------|
| `commands/build.ts` | `setupReplaceDeps()` | `setupReplaceDeps()` (copy, same signature) |
| `commands/dev.ts` | `setupReplaceDeps()` | `setupReplaceDeps()` + `watchReplaceDeps()` |
| `orchestrators/WatchOrchestrator.ts` | `setupReplaceDeps()` | `setupReplaceDeps()` + `watchReplaceDeps()` |

### Vite Config (`packages/sd-cli/src/utils/vite-config.ts`)

Remove `preserveSymlinks: true`. Default (`false`) restores normal pnpm dependency resolution.

## Files Changed

1. `packages/sd-cli/src/utils/replace-deps.ts` — core logic change
2. `packages/sd-cli/src/commands/dev.ts` — add watch call
3. `packages/sd-cli/src/orchestrators/WatchOrchestrator.ts` — add watch call
4. `packages/sd-cli/src/utils/vite-config.ts` — remove `preserveSymlinks: true`

## Reference

Legacy implementation: `.legacy-packages/simplysm/sd-cli/src/entry/SdCliLocalUpdate.ts`
