# Library Watch: New File Detection

## Problem

In `library.worker.ts`, esbuild watch mode does not detect newly created or deleted `.ts`/`.tsx` files. `getPackageSourceFiles()` computes entry points once at startup and they remain fixed. The d.ts builder (`dts.worker.ts`) does not have this problem because TypeScript's `createWatchCompilerHost` has built-in new file discovery. Server builds (`server.worker.ts`) are also unaffected because `bundle: true` discovers new files through the import chain.

## Solution

Replace esbuild's built-in `watch()` with a single `FsWatcher` + `context.rebuild()` approach.

### Scope

- **Modified**: `packages/sd-cli/src/workers/library.worker.ts` — `startWatch()` function only
- **Not modified**: `server.worker.ts`, `dts.worker.ts`, `WatchOrchestrator`, `LibraryBuilder`
- **No interface changes**: `startWatch`/`stopWatch` signatures and `buildStart`/`build`/`error` events remain the same

### New Flow

1. `parseRootTsconfig()` + `getPackageSourceFiles()` — initial entry points
2. `esbuild.context(options)` — create context
3. `ctx.rebuild()` — initial build
4. `FsWatcher.watch(["src/**/*.{ts,tsx}"])` — start file watching
5. `onChange` callback:
   - If `add` or `unlink` events present: dispose context → re-call `getPackageSourceFiles()` → create new context → `rebuild()`
   - If only `change` events: call `rebuild()` on existing context

### Key Details

- **Single watcher**: FsWatcher only — no esbuild `watch()` — avoids two watchers conflicting on the same files
- **Debounce**: FsWatcher's `onChange({ delay: 300 })` merges rapid file changes into a single rebuild
- **Sequential processing**: `DebounceQueue` ensures previous rebuild completes before next one starts
- **Event delivery**: esbuild's `watch-notify` plugin `onStart`/`onEnd` hooks fire on `rebuild()` calls — existing `buildStart`/`build` events work unchanged
- **Resource cleanup**: `stopWatch()` closes both FsWatcher and esbuild context
- **Full rebuild cost**: `bundle: false` with esbuild means per-file transpilation only (~0.1ms/file) — acceptable for infrequent add/delete events
