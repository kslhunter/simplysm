# core-* Packages Review Fixes — Repair & Completion Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Fix broken typecheck errors from previous session's incomplete implementation and complete remaining Finding 8d (copy helper extraction).

**Architecture:** Three independent fixes: (1) rename fs.spec.ts imports to match renamed fs.ts exports, (2) add `as any` casts to arr-ext.ts merge() implementation, (3) extract shared directory traversal helper from copy/copySync.

**Tech Stack:** TypeScript, Vitest, Node.js fs module

---

### Task 1: Fix fs.spec.ts import and usage renames

**Files:**
- Modify: `packages/core-node/tests/utils/fs.spec.ts:1-705`

**Context:** Finding 8a renamed all exported functions in `packages/core-node/src/utils/fs.ts` by removing the `fs` prefix (e.g., `fsExistsSync` → `existsSync`), but the test file was not updated. This causes ~70 typecheck errors.

**Step 1: Rename all imports and call sites**

Remove the `fs` prefix from all 29 imported names (lines 6-34) and every usage throughout the file. The rename map:

```
fsExistsSync → existsSync        fsExists → exists
fsMkdirSync → mkdirSync          fsMkdir → mkdir
fsRmSync → rmSync                fsRm → rm
fsCopySync → copySync            fsCopy → copy
fsReadSync → readSync            fsRead → read
fsReadBufferSync → readBufferSync  fsReadBuffer → readBuffer
fsReadJsonSync → readJsonSync    fsReadJson → readJson
fsWriteSync → writeSync          fsWrite → write
fsWriteJsonSync → writeJsonSync  fsWriteJson → writeJson
fsReaddirSync → readdirSync      fsReaddir → readdir
fsStatSync → statSync            fsStat → stat
fsLstatSync → lstatSync          fsLstat → lstat
fsGlobSync → globSync            fsGlob → glob
fsClearEmptyDirectory → clearEmptyDirectory
fsFindAllParentChildPathsSync → findAllParentChildPathsSync
fsFindAllParentChildPaths → findAllParentChildPaths
```

Also rename all `describe()` block names that reference old names (e.g., `describe("fsExistsSync", ...)` → `describe("existsSync", ...)`).

**Important:** Do NOT rename `fs.writeFileSync`, `fs.readFileSync`, `fs.mkdirSync`, `fs.rmSync`, `fs.existsSync`, `fs.statSync`, `fs.symlinkSync` — these are calls on the Node.js `fs` module import (line 3), not the custom utility functions.

**Step 2: Run typecheck on core-node to verify fix**

Run: `pnpm run typecheck 2>&1 | grep "fs.spec.ts"`
Expected: No errors from `fs.spec.ts`

**Step 3: Run tests to verify everything passes**

Run: `pnpm run vitest packages/core-node/tests/utils/fs.spec.ts --run`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add packages/core-node/tests/utils/fs.spec.ts
git commit -m "fix(core-node): rename fs-prefixed function calls in fs.spec.ts"
```

---

### Task 2: Fix arr-ext.ts merge() type errors

**Files:**
- Modify: `packages/core-common/src/extensions/arr-ext.ts:472,493`

**Context:** Finding 4 split `diffs()` and `merge()` into overloads in `arr-ext.types.ts`. The overloads with `keys`/`excludes` options constrain `TOtherItem extends Record<string, unknown>`. But the `merge()` implementation calls `this.diffs(target, options)` with unconstrained generic `P`, causing 2 type errors. Since the public API overloads guarantee caller-side type safety, implementation-level `as any` casts are acceptable.

**Step 1: Add `as any` casts to fix type errors**

Line 472 — cast `target` in `this.diffs()` call:
```typescript
// Before:
const diffs = this.diffs(target, options);
// After:
const diffs = this.diffs(target as any[], options);
```

Line 493 — cast `diff.target` in `result.push()`:
```typescript
// Before:
result.push(diff.target);
// After:
result.push(diff.target as any);
```

**Step 2: Run typecheck on core-common to verify fix**

Run: `pnpm run typecheck 2>&1 | grep "arr-ext.ts"`
Expected: No errors from `arr-ext.ts`

**Step 3: Run existing tests to verify no regression**

Run: `pnpm run vitest packages/core-common/tests/ --run`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add packages/core-common/src/extensions/arr-ext.ts
git commit -m "fix(core-common): resolve merge() type errors with implementation casts"
```

---

### Task 3: Extract copy helper function (Finding 8d)

**Files:**
- Modify: `packages/core-node/src/utils/fs.ts:96-208`

**Context:** `copySync` (line 112) and `copy` (line 167) share identical directory traversal logic: iterate children, apply filter, compute relative/target paths. Extract this into a private `collectCopyEntries()` helper. The `parallelAsync` call in async `copy` is a prototype extension from `@simplysm/core-common` that runs async callbacks in parallel on array items.

**Step 1: Run existing copy tests to establish baseline**

Run: `pnpm run vitest packages/core-node/tests/utils/fs.spec.ts --run`
Expected: All tests PASS (assuming Task 1 is complete)

**Step 2: Add `CopyEntry` interface and `collectCopyEntries` helper**

Add above the `copySync` function (inside the `#region Copy` block, after the region comment):

```typescript
interface CopyEntry {
  sourcePath: string;
  targetPath: string;
}

function collectCopyEntries(
  sourcePath: string,
  targetPath: string,
  children: string[],
  filter?: (absolutePath: string) => boolean,
): CopyEntry[] {
  const entries: CopyEntry[] = [];
  for (const childPath of children) {
    if (filter !== undefined && !filter(childPath)) {
      continue;
    }
    const relativeChildPath = path.relative(sourcePath, childPath);
    const childTargetPath = path.resolve(targetPath, relativeChildPath);
    entries.push({ sourcePath: childPath, targetPath: childTargetPath });
  }
  return entries;
}
```

**Step 3: Refactor `copySync` to use the helper**

Replace the directory branch of `copySync` (lines 128-141):

```typescript
if (stats.isDirectory()) {
  mkdirSync(targetPath);
  const children = globSync(path.resolve(sourcePath, "*"), { dot: true });
  for (const entry of collectCopyEntries(sourcePath, targetPath, children, filter)) {
    copySync(entry.sourcePath, entry.targetPath, filter);
  }
}
```

**Step 4: Refactor `copy` (async) to use the helper**

Replace the directory branch of `copy` (lines 183-196):

```typescript
if (stats.isDirectory()) {
  await mkdir(targetPath);
  const children = await glob(path.resolve(sourcePath, "*"), { dot: true });
  await collectCopyEntries(sourcePath, targetPath, children, filter)
    .parallelAsync(async (entry) => {
      await copy(entry.sourcePath, entry.targetPath, filter);
    });
}
```

**Step 5: Run tests to verify no regression**

Run: `pnpm run vitest packages/core-node/tests/utils/fs.spec.ts --run`
Expected: All copy-related tests PASS (file copy, directory copy, filter, nonexistent source)

**Step 6: Run typecheck**

Run: `pnpm run typecheck 2>&1 | grep "fs.ts"`
Expected: No errors from `fs.ts`

**Step 7: Commit**

```bash
git add packages/core-node/src/utils/fs.ts
git commit -m "refactor(core-node): extract collectCopyEntries helper from copy functions"
```
