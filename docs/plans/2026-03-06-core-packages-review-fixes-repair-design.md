# core-* Packages Review Fixes — Repair & Completion Design

Fixes broken implementations from the previous session and completes remaining findings.

## Context

The original design (`2026-03-06-core-packages-review-fixes-design.md`) had 8 findings. Most were implemented but:
- `fs.spec.ts` was not updated after Finding 8a (fs function rename)
- `arr-ext.ts` merge() has typecheck errors from Finding 4 overload split
- Finding 4 cast removal is not achievable with overload structure — accepted as-is
- Finding 8d (copy helper extraction) was not implemented

## Fix 1: fs.spec.ts Import Rename

**File**: `packages/core-node/tests/utils/fs.spec.ts`

Remove `fs` prefix from all 29 imported function names and all usage sites throughout the file.

Import rename map (all are simple `fs` prefix removal):
```
fsExistsSync → existsSync, fsExists → exists,
fsMkdirSync → mkdirSync, fsMkdir → mkdir,
fsRmSync → rmSync, fsRm → rm,
fsCopySync → copySync, fsCopy → copy,
fsReadSync → readSync, fsRead → read,
fsReadBufferSync → readBufferSync, fsReadBuffer → readBuffer,
fsReadJsonSync → readJsonSync, fsReadJson → readJson,
fsWriteSync → writeSync, fsWrite → write,
fsWriteJsonSync → writeJsonSync, fsWriteJson → writeJson,
fsReaddirSync → readdirSync, fsReaddir → readdir,
fsStatSync → statSync, fsStat → stat,
fsLstatSync → lstatSync, fsLstat → lstat,
fsGlobSync → globSync, fsGlob → glob,
fsClearEmptyDirectory → clearEmptyDirectory,
fsFindAllParentChildPathsSync → findAllParentChildPathsSync,
fsFindAllParentChildPaths → findAllParentChildPaths
```

Must also rename all call sites in the test body (not just imports).

## Fix 2: arr-ext.ts merge() Type Errors

**File**: `packages/core-common/src/extensions/arr-ext.ts`

Two typecheck errors at lines 472 and 493. The public API overloads in `arr-ext.types.ts` ensure caller-side type safety; the implementation is an internal detail where casts are acceptable.

**Line 472**: `this.diffs(target, options)` — `P[]` not assignable to `Record<string, unknown>[]`
```typescript
// Before:
const diffs = this.diffs(target, options);
// After:
const diffs = this.diffs(target as any[], options);
```

**Line 493**: `diff.target` — `Record<string, unknown>` not assignable to result array type
```typescript
// Before:
result.push(diff.target);
// After:
result.push(diff.target as any);
```

## Task 3: Finding 8d — Copy Helper Extraction

**File**: `packages/core-node/src/utils/fs.ts`

Extract shared directory traversal logic from `copySync` (line 112) and `copy` (line 167) into a private helper.

### Helper function:

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

### Updated copySync:

```typescript
export function copySync(
  sourcePath: string,
  targetPath: string,
  filter?: (absolutePath: string) => boolean,
): void {
  if (!existsSync(sourcePath)) return;

  let stats: fs.Stats;
  try { stats = fs.lstatSync(sourcePath); }
  catch (err) { throw new SdError(err, sourcePath); }

  if (stats.isDirectory()) {
    mkdirSync(targetPath);
    const children = globSync(path.resolve(sourcePath, "*"), { dot: true });
    for (const entry of collectCopyEntries(sourcePath, targetPath, children, filter)) {
      copySync(entry.sourcePath, entry.targetPath, filter);
    }
  } else {
    mkdirSync(path.dirname(targetPath));
    try { fs.copyFileSync(sourcePath, targetPath); }
    catch (err) { throw new SdError(err, targetPath); }
  }
}
```

### Updated copy (async):

```typescript
export async function copy(
  sourcePath: string,
  targetPath: string,
  filter?: (absolutePath: string) => boolean,
): Promise<void> {
  if (!(await exists(sourcePath))) return;

  let stats: fs.Stats;
  try { stats = await fs.promises.lstat(sourcePath); }
  catch (err) { throw new SdError(err, sourcePath); }

  if (stats.isDirectory()) {
    await mkdir(targetPath);
    const children = await glob(path.resolve(sourcePath, "*"), { dot: true });
    await collectCopyEntries(sourcePath, targetPath, children, filter)
      .parallelAsync(async (entry) => {
        await copy(entry.sourcePath, entry.targetPath, filter);
      });
  } else {
    await mkdir(path.dirname(targetPath));
    try { await fs.promises.copyFile(sourcePath, targetPath); }
    catch (err) { throw new SdError(err, targetPath); }
  }
}
```

## Impact Summary

| File | Change | Error Count Fixed |
|------|--------|-------------------|
| `packages/core-node/tests/utils/fs.spec.ts` | rename imports + call sites | ~70 |
| `packages/core-common/src/extensions/arr-ext.ts` | 2 lines: add `as any` casts | 2 |
| `packages/core-node/src/utils/fs.ts` | extract `collectCopyEntries` helper | 0 (refactor) |

Total typecheck errors resolved: ~72 (service-client errors are out of scope).
