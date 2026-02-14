# esbuild Incremental Write for Watch Mode

## Problem

When a single `.tsx` file is changed during watch mode, esbuild's `rebuild()` with `bundle: false` and `write: true` (default) rewrites ALL output files to disk, updating their timestamps. This causes:

1. `esmRelativeImportPlugin` to scan all `.js` files again
2. FsWatcher in `watchReplaceDeps` to detect change events for ALL dist files
3. All files to be copied to `node_modules` targets

**Expected**: Only the changed file's output should be written and copied.

## Solution

Use esbuild's `write: false` option to get `outputFiles` in memory, then compare content with existing disk files and write only those that actually changed.

## Changes

### 1. `packages/sd-cli/src/utils/esbuild-config.ts`

- Add `write: false` to `createLibraryEsbuildOptions`
- Remove `esmRelativeImportPlugin` from plugins (it reads from disk, incompatible with `write: false`)
- Add new exported function `writeChangedOutputFiles(outputFiles, outdir)`:
  - For `.js` files: apply ESM relative import `.js` extension rewriting (moved from `esmRelativeImportPlugin`)
  - Compare final content with existing disk file via `Buffer.equals`
  - Write only files where content differs
  - Create parent directories as needed

### 2. `packages/sd-cli/src/workers/library.worker.ts`

- After `rebuild()`, call `writeChangedOutputFiles()` with the result's `outputFiles`
- Same for initial build in `createAndBuildContext`

### 3. One-shot `build()` function

- Also apply `write: false` + `writeChangedOutputFiles()` for consistency (optional, less critical since one-shot builds don't trigger watch cascades)

## Files Affected

| File | Change |
|------|--------|
| `packages/sd-cli/src/utils/esbuild-config.ts` | Add `write: false`, remove `esmRelativeImportPlugin`, add `writeChangedOutputFiles()` |
| `packages/sd-cli/src/workers/library.worker.ts` | Call `writeChangedOutputFiles()` after `rebuild()` |
