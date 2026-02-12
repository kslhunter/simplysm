# CLI File-Based Cache Restoration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Re-introduce file-based caching (TypeScript incremental + ESLint cache) to sd-cli with proper cache separation by execution context.

**Architecture:** Restore `incremental: true` and `tsBuildInfoFile` to TypeScript compilation in `dts.worker.ts`, restore ESLint cache in `lint.ts`, and update documentation. Build/watch share `dts.tsbuildinfo`, typecheck uses separate `typecheck-{env}.tsbuildinfo`.

**Tech Stack:** TypeScript Compiler API, ESLint, sd-cli

---

### Task 1: Restore TypeScript incremental compilation in buildDts

**Files:**
- Modify: `packages/sd-cli/src/workers/dts.worker.ts:192-234`

**Step 1: Add incremental options to buildDts compiler options**

Change lines 192-195 from:

```typescript
    const options: ts.CompilerOptions = {
      ...baseOptions,
      sourceMap: false,
    };
```

to:

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

**Step 2: Change createCompilerHost to createIncrementalCompilerHost**

Change line 215-216 from:

```typescript
    // program 생성
    const host = ts.createCompilerHost(options);
```

to:

```typescript
    // incremental program 생성
    const host = ts.createIncrementalCompilerHost(options);
```

**Step 3: Change createProgram to createIncrementalProgram**

Change lines 230-234 from:

```typescript
    const program = ts.createProgram({
      rootNames: rootFiles,
      options,
      host,
    });
```

to:

```typescript
    const program = ts.createIncrementalProgram({
      rootNames: rootFiles,
      options,
      host,
    });
```

**Step 4: Verify typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 5: Commit**

```
feat(sd-cli): restore incremental compilation in buildDts
```

---

### Task 2: Restore TypeScript incremental compilation in startDtsWatch

**Files:**
- Modify: `packages/sd-cli/src/workers/dts.worker.ts`

> **Note:** Line numbers below assume Task 1 is already applied. After Task 1, the startDtsWatch options block shifts down by ~5 lines due to added code. Read the file fresh to confirm exact line numbers.

**Step 1: Add incremental options to startDtsWatch compiler options**

Find the `startDtsWatch` function's compiler options block (currently ends with `noEmit: false,`):

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

Change to:

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

**Step 2: Verify typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 3: Commit**

```
feat(sd-cli): restore incremental compilation in startDtsWatch
```

---

### Task 3: Restore ESLint file cache

**Files:**
- Modify: `packages/sd-cli/src/commands/lint.ts:98-160`

**Step 1: Add cache options to ESLint constructor**

Change lines 157-160 from:

```typescript
          ctx.eslint = new ESLint({
            cwd,
            fix,
          });
```

to:

```typescript
          ctx.eslint = new ESLint({
            cwd,
            fix,
            cache: true,
            cacheLocation: path.join(cwd, ".cache", "eslint.cache"),
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
 * - 캐시 활성화 (`.cache/eslint.cache`에 저장, 설정 변경 시 자동 무효화)
 * - 에러 발생 시 `process.exitCode = 1` 설정
 *
 * @param options - 린트 실행 옵션
 * @returns 완료 시 resolve. 에러 발견 시 `process.exitCode`를 1로 설정하고 resolve (throw하지 않음)
 */
```

**Step 3: Verify typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 4: Commit**

```
feat(sd-cli): restore ESLint file cache
```

---

### Task 4: Update documentation

**Files:**
- Modify: `packages/sd-cli/src/commands/typecheck.ts:137-138`
- Modify: `CLAUDE.md:96`

**Step 1: Add incremental mention to typecheck.ts JSDoc**

Find lines 137-138 in typecheck.ts:

```typescript
 * - Worker threads를 사용하여 실제 병렬 타입체크 수행
 * - listr2를 사용하여 진행 상황 표시
```

Change to:

```typescript
 * - Worker threads를 사용하여 실제 병렬 타입체크 수행
 * - incremental 컴파일 사용 (`.cache/typecheck-{env}.tsbuildinfo`)
 * - listr2를 사용하여 진행 상황 표시
```

**Step 2: Update CLAUDE.md**

Change line 96 from:

```markdown
- `.cache/`: (더 이상 사용되지 않음. 기존 파일이 남아있을 수 있으나 CLI가 읽거나 쓰지 않음)
```

to:

```markdown
- `.cache/`: 빌드 캐시 (`eslint.cache`, `typecheck-{env}.tsbuildinfo`, `dts.tsbuildinfo`). 초기화: `.cache/` 삭제
```

**Step 3: Commit**

```
docs: restore cache references after file cache restoration
```

---

### Task 5: Final verification

**Step 1: Run full typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 2: Run lint on changed files**

Run: `pnpm lint packages/sd-cli`
Expected: PASS (no lint errors)
