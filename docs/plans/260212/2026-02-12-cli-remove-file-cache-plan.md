# CLI File-Based Cache Removal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Remove all file-based caching (TypeScript incremental, ESLint cache) from sd-cli so every invocation starts clean.

**Architecture:** Three files need modification: `dts.worker.ts` (TypeScript incremental removal), `lint.ts` (ESLint cache removal), `typecheck.ts` (JSDoc update). Plus `CLAUDE.md` documentation update. In-memory caches (esbuild context, Vite require cache, ts.createWatchProgram) are unaffected.

**Tech Stack:** TypeScript Compiler API, ESLint, sd-cli

---

### Task 1: Remove TypeScript incremental compilation from buildDts

**Files:**
- Modify: `packages/sd-cli/src/workers/dts.worker.ts:128-175`

**Step 1: Remove incremental options from buildDts compiler options**

In the `buildDts` function, change the compiler options block (lines 128-136) from:

```typescript
    const options: ts.CompilerOptions = {
      ...baseOptions,
      sourceMap: false,
      incremental: true,
      tsBuildInfoFile: path.join(
        info.pkgDir,
        ".cache",
        shouldEmit ? "dts.tsbuildinfo" : `typecheck-${info.env}.tsbuildinfo`,
      ),
    };
```

to:

```typescript
    const options: ts.CompilerOptions = {
      ...baseOptions,
      sourceMap: false,
    };
```

**Step 2: Change createIncrementalCompilerHost to createCompilerHost**

Change line 158 from:

```typescript
    const host = ts.createIncrementalCompilerHost(options);
```

to:

```typescript
    const host = ts.createCompilerHost(options);
```

**Step 3: Change createIncrementalProgram to createProgram**

Change lines 171-175 from:

```typescript
    const program = ts.createIncrementalProgram({
      rootNames: rootFiles,
      options,
      host,
    });
```

to:

```typescript
    const program = ts.createProgram({
      rootNames: rootFiles,
      options,
      host,
    });
```

**Step 4: Update comment**

Change line 157 comment from:

```typescript
    // incremental program 생성
```

to:

```typescript
    // program 생성
```

**Step 5: Verify typecheck works**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS (no type errors)

**Step 6: Commit**

```
feat(sd-cli): remove incremental compilation from buildDts
```

---

### Task 2: Remove TypeScript incremental compilation from startDtsWatch

**Files:**
- Modify: `packages/sd-cli/src/workers/dts.worker.ts:256-267`

**Step 1: Remove incremental options from startDtsWatch compiler options**

In the `startDtsWatch` function, change the compiler options block (lines 256-267) from:

```typescript
    const options: ts.CompilerOptions = {
      ...baseOptions,
      emitDeclarationOnly: true,
      declaration: true,
      declarationMap: true,
      outDir: path.join(info.pkgDir, "dist"),
      declarationDir: path.join(info.pkgDir, "dist"),
      sourceMap: false,
      noEmit: false,
      incremental: true,
      tsBuildInfoFile: path.join(info.pkgDir, ".cache", "dts.tsbuildinfo"),
    };
```

to:

```typescript
    const options: ts.CompilerOptions = {
      ...baseOptions,
      emitDeclarationOnly: true,
      declaration: true,
      declarationMap: true,
      outDir: path.join(info.pkgDir, "dist"),
      declarationDir: path.join(info.pkgDir, "dist"),
      sourceMap: false,
      noEmit: false,
    };
```

**Step 2: Verify typecheck still passes**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 3: Commit**

```
feat(sd-cli): remove incremental compilation from startDtsWatch
```

---

### Task 3: Remove ESLint cache

**Files:**
- Modify: `packages/sd-cli/src/commands/lint.ts:98-163`

**Step 1: Remove cache options from ESLint constructor**

Change lines 158-163 from:

```typescript
          ctx.eslint = new ESLint({
            cwd,
            fix,
            cache: true,
            cacheLocation: path.join(cwd, ".cache", "eslint.cache"),
          });
```

to:

```typescript
          ctx.eslint = new ESLint({
            cwd,
            fix,
          });
```

**Step 2: Update JSDoc comment**

Change lines 98-107 from:

```typescript
/**
 * ESLint를 실행한다.
 *
 * - `eslint.config.ts/js`에서 globalIgnores 패턴을 추출하여 glob 필터링에 적용
 * - listr2를 사용하여 진행 상황 표시
 * - 캐시가 기본 활성화되어 `.cache/eslint.cache`에 저장
 * - 에러 발생 시 `process.exitCode = 1` 설정
 *
 * @param options - 린트 실행 옵션
 * @returns 완료 시 resolve. 에러 발견 시 `process.exitCode`를 1로 설정하고 resolve (throw하지 않음)
 */
```

to:

```typescript
/**
 * ESLint를 실행한다.
 *
 * - `eslint.config.ts/js`에서 globalIgnores 패턴을 추출하여 glob 필터링에 적용
 * - listr2를 사용하여 진행 상황 표시
 * - 에러 발생 시 `process.exitCode = 1` 설정
 *
 * @param options - 린트 실행 옵션
 * @returns 완료 시 resolve. 에러 발견 시 `process.exitCode`를 1로 설정하고 resolve (throw하지 않음)
 */
```

**Step 3: Remove unused `path` import if it becomes unused**

Check if `path` is used elsewhere in `lint.ts`. If `cacheLocation` was the only usage, remove the import.

> Note: `path` is NOT used elsewhere in lint.ts except for the `cacheLocation` line. However, check if `loadIgnorePatterns` uses it — yes, `path.join(cwd, f)` on line 64 uses it. So `path` import stays.

**Step 4: Verify typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 5: Commit**

```
feat(sd-cli): remove ESLint file cache
```

---

### Task 4: Update documentation

**Files:**
- Modify: `packages/sd-cli/src/commands/typecheck.ts:138`
- Modify: `CLAUDE.md:96`

**Step 1: Update typecheck.ts JSDoc**

Change line 138 from:

```typescript
 * - incremental 컴파일 사용 (`.cache/typecheck-{env}.tsbuildinfo`)
```

to:

```typescript
 * - Worker threads를 사용하여 매번 전체 타입체크 수행
```

> Note: This line replaces the incremental mention. The previous line 137 already says "Worker threads를 사용하여 실제 병렬 타입체크 수행" — so update to avoid duplication. Change to just remove the incremental line entirely, since line 137 already covers worker threads.

Actually, simplest: just remove line 138 entirely (the incremental mention).

**Step 2: Update CLAUDE.md**

Change line 96 from:

```markdown
- `.cache/`: 빌드 캐시 (`eslint.cache`, `typecheck-{env}.tsbuildinfo`, `dts.tsbuildinfo`). 초기화: `.cache/` 삭제
```

to:

```markdown
- `.cache/`: (더 이상 사용되지 않음. 기존 파일이 남아있을 수 있으나 CLI가 읽거나 쓰지 않음)
```

**Step 3: Commit**

```
docs: update cache references after file cache removal
```

---

### Task 5: Final verification

**Step 1: Run full typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 2: Run lint on changed files**

Run: `pnpm lint packages/sd-cli`
Expected: PASS (no lint errors)

**Step 3: Verify build works (quick smoke test)**

Run: `pnpm build sd-cli`
Expected: PASS (build completes without errors)
