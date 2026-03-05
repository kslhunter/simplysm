# sd-cli Review Findings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Fix 10 code review findings in `packages/sd-cli` covering race conditions, injection vulnerabilities, convention violations, and code simplification.

**Architecture:** Changes are modular and independent — each finding corresponds to a minimal changeset. Defects (F1-3) are fixed first, then API/conventions (F4-7), then refactoring (F9-11). Tests are updated where applicable.

**Tech Stack:** TypeScript, esbuild, ESLint, Vitest, yargs

---

## Task 1: Fix check command race condition (Finding 1)

**Files:**
- Modify: `packages/sd-cli/src/commands/check.ts:113`

**Step 1: Understand the issue**

Read line 113 to confirm `fix: true` is passed to lint worker. The race condition occurs because `Promise.allSettled` runs lint and typecheck in parallel — lint modifies files via `ESLint.outputFixes` while TypeScript reads them.

**Step 2: Fix the code**

Change `fix: true` to `fix: false` at line 113.

**Step 3: Verify no test failures**

Run: `pnpm run vitest packages/sd-cli/tests/ --run`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add packages/sd-cli/src/commands/check.ts
git commit -m "fix(sd-cli): disable lint auto-fix in check command

check is a validation-only command and should not modify files.
Parallel lint+typecheck race condition resolved by removing fix:true."
```

---

## Task 2: Validate appName in capacitor config (Finding 2)

**Files:**
- Modify: `packages/sd-cli/src/capacitor/capacitor.ts:88-92`

**Step 1: Review current validation**

Lines 81-99 show `_validateConfig`. appName is non-empty checked only (line 88).

**Step 2: Add appName validation**

After line 90, add regex check: `/^[a-zA-Z0-9 \-]+$/.test(config.appName)`

**Step 3: Run tests**

Run: `pnpm run vitest packages/sd-cli/tests/ --run`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add packages/sd-cli/src/capacitor/capacitor.ts
git commit -m "fix(sd-cli): validate appName in capacitor config

Reject appName with special characters that would break generated
capacitor.config.ts file or cause Android issues."
```

---

## Task 3: Escape signing passwords in build.gradle (Finding 3)

**Files:**
- Modify: `packages/sd-cli/src/capacitor/capacitor.ts:752-754`

**Step 1: Create helper function**

Add private static method `_escapeGroovyString` before `generateSigningConfig`.

**Step 2: Update string interpolation**

Replace `'${signConfig.storePassword}'` with `'${Capacitor._escapeGroovyString(signConfig.storePassword)}'` for all 3 fields.

**Step 3: Run tests**

Run: `pnpm run vitest packages/sd-cli/tests/ --run`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add packages/sd-cli/src/capacitor/capacitor.ts
git commit -m "fix(sd-cli): escape single quotes in gradle signing config

Prevents build.gradle syntax errors when signing passwords contain
single quotes."
```

---

## Task 4: Rename SdConfigParams.opt to options (Finding 4)

**Files:**
- Modify: `packages/sd-cli/src/sd-config.types.ts:252`
- Modify: `packages/sd-cli/src/orchestrators/DevOrchestrator.ts`
- Modify: `packages/sd-cli/src/commands/typecheck.ts`
- Modify: `packages/sd-cli/src/commands/device.ts`
- Modify: `packages/sd-cli/src/commands/publish.ts`
- Modify: `packages/sd-cli/src/commands/build.ts`
- Modify: `packages/sd-cli/src/commands/watch.ts`

**Step 1: Update type definition**

In `sd-config.types.ts` line 252, change `opt:` to `options:`.

**Step 2: Update all loadSdConfig call sites**

Find each `loadSdConfig` call and change `opt:` parameter to `options:`.

**Step 3: Run typecheck**

Run: `pnpm run typecheck`
Expected: All type errors resolved.

**Step 4: Run tests**

Run: `pnpm run vitest packages/sd-cli/tests/ --run`
Expected: All tests pass.

**Step 5: Commit**

All modified files in one commit.

---

## Task 5: Remove as unknown as BaseWorkerInfo casts (Finding 5)

**Files:**
- Modify: `packages/sd-cli/src/utils/worker-events.ts:66-74`
- Modify: `packages/sd-cli/src/orchestrators/DevOrchestrator.ts:327, 415`

**Step 1: Update worker-events.ts parameter type**

Change `registerWorkerEventHandlers` parameter from `T extends BaseWorkerInfo` to inline structural type with just needed fields.

**Step 2: Remove casts in DevOrchestrator.ts**

Remove `as unknown as BaseWorkerInfo` at lines 327 and 415.

**Step 3: Run typecheck and tests**

All tests should pass.

**Step 4: Commit**

Both files in one commit.

---

## Task 6: Add mock factory functions in tests (Finding 6)

**Files:**
- Modify: `packages/sd-cli/tests/run-typecheck.spec.ts`

**Step 1: Add mock factory functions at file top**

Create `createMockParsedCommandLine()`, `createMockDiagnostic()`, `createMockWorker()`.

**Step 2: Replace 18 casts with factory calls**

Use factories instead of `as unknown as`.

**Step 3: Run tests**

All tests pass.

**Step 4: Commit**

```bash
git add packages/sd-cli/tests/run-typecheck.spec.ts
git commit -m "refactor(sd-cli): add mock factory functions in tests

Replace 18 'as unknown as' casts with type-safe mock factories."
```

---

## Task 7: Delete unused barrel files (Finding 7)

**Files:**
- Delete: `packages/sd-cli/src/builders/index.ts`
- Delete: `packages/sd-cli/src/infra/index.ts`
- Delete: `packages/sd-cli/src/orchestrators/index.ts`

**Step 1: Verify no imports**

Grep for references (verified earlier — none).

**Step 2: Delete files**

```bash
rm packages/sd-cli/src/builders/index.ts \
   packages/sd-cli/src/infra/index.ts \
   packages/sd-cli/src/orchestrators/index.ts
```

**Step 3: Run typecheck and tests**

All pass.

**Step 4: Commit**

Delete in one commit.

---

## Task 8: Refactor DevOrchestrator._setupServers (Finding 9)

**Files:**
- Modify: `packages/sd-cli/src/orchestrators/DevOrchestrator.ts:491-738`

**Step 1: Review structure**

Understand the 6 repetitions of result-setting pattern.

**Step 2: Extract resolveServerStep helper**

Create local function inside `_setupServers` that encapsulates 3-step pattern.

**Step 3: Replace 6 duplicates with helper calls**

Each repetition becomes one-liner.

**Step 4: Promote startServerRuntime to _startServerRuntime**

Reduce nesting by one level.

**Step 5: Run tests**

All pass.

**Step 6: Commit**

DevOrchestrator in one commit.

---

## Task 9: Unify dependency tree scanning (Finding 10)

**Files:**
- Modify: `packages/sd-cli/src/utils/esbuild-config.ts:155-279`

**Step 1: Review both functions**

`scanOptionalPeerDeps` and `scanNativeModules` share structure.

**Step 2: Create unified scanDependencyTree**

Single parameterized function with collector predicate.

**Step 3: Update public functions to delegate**

Both remain public, internally call unified function.

**Step 4: Run tests**

All pass.

**Step 5: Commit**

esbuild-config in one commit.

---

## Task 10: Support sync cleanup in registerCleanupHandlers (Finding 11)

**Files:**
- Modify: `packages/sd-cli/src/utils/worker-utils.ts:13-29`
- Modify: `packages/sd-cli/src/workers/dts.worker.ts:98-114`

**Step 1: Change cleanup signature**

From `() => Promise<void>` to `() => void | Promise<void>`.

**Step 2: Wrap with Promise.resolve()**

Handles both sync and async.

**Step 3: Replace inline handlers in dts.worker.ts**

Use `registerCleanupHandlers(cleanup, logger)`.

**Step 4: Run tests**

All pass.

**Step 5: Commit**

Both files in one commit.

---

## Summary

10 tasks across 15 files. All changes preserve backward compatibility except Finding 4 (caught by TypeScript). No side effects — barrel file imports verified to be zero.
