# Publish Process Improvement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Make the publish flow safe by committing version changes explicitly, syncing template versions, and removing dangerous auto-rollback.

**Architecture:** Modify `upgradeVersion()` to also update template dependency versions and return changed file paths. Restructure git flow to commit specific files before tagging. Remove all `git checkout .` / `git clean -fd` auto-rollback.

**Tech Stack:** TypeScript, pnpm, git, semver

---

### Task 1: Extend `upgradeVersion` to sync template versions

**Files:**
- Modify: `packages/sd-cli/src/commands/publish.ts:97-125` (`upgradeVersion` function)

**Step 1: Update `upgradeVersion` to find and replace template versions**

The function currently only bumps `version` in package.json files. Add logic to also replace `@simplysm/*` dependency version ranges in template `.hbs` files.

Template files containing `@simplysm/*` dependencies:
- `packages/sd-cli/templates/init/package.json.hbs` — `"~13.0.0"` x3
- `packages/sd-cli/templates/add-client/__CLIENT__/package.json.hbs` — `"~13.0.0"` x1
- `packages/sd-cli/templates/add-server/__SERVER__/package.json.hbs` — `"~13.0.0"` x1

Change signature to return changed file paths:

```typescript
async function upgradeVersion(
  cwd: string,
  allPkgPaths: string[],
  dryRun: boolean,
): Promise<{ version: string; changedFiles: string[] }> {
```

After bumping package.json versions, add template sync:

```typescript
  // sd-cli 템플릿 내 @simplysm/* 의존성 버전 동기화
  const templateFiles = await fsGlob(path.resolve(cwd, "packages/sd-cli/templates/**/*.hbs"));
  for (const templateFile of templateFiles) {
    const content = await fsRead(templateFile);
    // "@simplysm/..." : "~X.Y.Z" or "~X.Y.Z-pre.N" 패턴 매칭
    const updated = content.replace(
      /("@simplysm\/[^"]+"\s*:\s*)"~[^"]+"/g,
      `$1"~${newVersion}"`,
    );
    if (updated !== content) {
      await fsWrite(templateFile, updated);
      changedFiles.push(templateFile);
    }
  }
```

Build `changedFiles` array throughout the function — add `projPkgPath` and each `pkgJsonPath` as they're written.

Return `{ version: newVersion, changedFiles }`.

**Step 2: Update all callers of `upgradeVersion`**

In `runPublish`, line ~428:

```typescript
// Before:
version = await upgradeVersion(cwd, allPkgPaths, dryRun);

// After:
const upgradeResult = await upgradeVersion(cwd, allPkgPaths, dryRun);
version = upgradeResult.version;
const changedFiles = upgradeResult.changedFiles;
```

**Step 3: Run typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

---

### Task 2: Remove `--no-git-checks` from `publishPackage`

**Files:**
- Modify: `packages/sd-cli/src/commands/publish.ts:148`

**Step 1: Remove `--no-git-checks` flag**

```typescript
// Before:
const args = ["publish", "--access", "public", "--no-git-checks"];

// After:
const args = ["publish", "--access", "public"];
```

---

### Task 3: Restructure git commit flow (Phase 3)

**Files:**
- Modify: `packages/sd-cli/src/commands/publish.ts:475-519` (Phase 3 git section)

**Step 1: Replace Phase 3 git section**

Uncomment `git add` + `git commit`, use explicit `changedFiles` list instead of `git add .`.
Remove commented-out rollback code.

Non-dry-run path:

```typescript
logger.debug("Git 커밋/태그/푸시...");
try {
  await spawn("git", ["add", ...changedFiles]);
  await spawn("git", ["commit", "-m", `v${version}`]);
  await spawn("git", ["tag", "-a", `v${version}`, "-m", `v${version}`]);
  await spawn("git", ["push"]);
  await spawn("git", ["push", "--tags"]);
  logger.debug("Git 작업 완료");
} catch (err) {
  consola.error(
    `Git 작업 실패: ${err instanceof Error ? err.message : err}\n` +
      "수동 복구가 필요할 수 있습니다:\n" +
      `  git revert HEAD  # 버전 커밋 되돌리기\n` +
      `  git tag -d v${version}  # 태그 삭제`,
  );
  process.exitCode = 1;
  return;
}
```

Dry-run path — add commit simulation logging:

```typescript
logger.info("[DRY-RUN] Git 커밋/태그/푸시 시뮬레이션...");
logger.info(`[DRY-RUN] git add (${changedFiles.length}개 파일)`);
logger.info(`[DRY-RUN] git commit -m "v${version}"`);
logger.info(`[DRY-RUN] git tag -a v${version} -m "v${version}"`);
logger.info("[DRY-RUN] git push --dry-run");
await spawn("git", ["push", "--dry-run"]);
logger.info("[DRY-RUN] git push --tags --dry-run");
await spawn("git", ["push", "--tags", "--dry-run"]);
logger.info("[DRY-RUN] Git 작업 시뮬레이션 완료");
```

**Step 2: Update Phase 3 region comment**

```typescript
// Before:
//#region Phase 3: Git 태그/푸시

// After:
//#region Phase 3: Git 커밋/태그/푸시
```

---

### Task 4: Remove dangerous auto-rollback on build failure

**Files:**
- Modify: `packages/sd-cli/src/commands/publish.ts:452-473` (build failure catch block)

**Step 1: Replace build failure handler**

Remove `git checkout .` and `git clean -fd` references. Replace with simple error message + recovery guidance.

```typescript
    } catch {
      if (dryRun) {
        logger.error("[DRY-RUN] 빌드 실패");
      } else {
        consola.error(
          "빌드 실패. 수동 복구가 필요할 수 있습니다:\n" +
            "  버전 변경을 되돌리려면:\n" +
            "    git checkout -- package.json packages/*/package.json packages/sd-cli/templates/",
        );
      }
      process.exitCode = 1;
      return;
    }
```

Note: Since the build failure happens BEFORE the git commit (Task 3), the version changes are still uncommitted at this point. So `git checkout` on specific files is safe here — it only reverts the version bump files, not unrelated work. But we don't auto-execute it; we just suggest it.

---

### Task 5: Update JSDoc and region comments

**Files:**
- Modify: `packages/sd-cli/src/commands/publish.ts:265-274` (`runPublish` JSDoc)

**Step 1: Update JSDoc to reflect new flow**

```typescript
/**
 * publish 명령을 실행한다.
 *
 * **배포 순서 (안전성 우선):**
 * 1. 사전 검증 (npm 인증, Git 상태)
 * 2. 버전 업그레이드 (package.json + 템플릿)
 * 3. 빌드
 * 4. Git 커밋/태그/푸시 (변경된 파일만 명시적으로 staging)
 * 5. pnpm 배포
 * 6. postPublish (실패해도 계속)
 */
```

---

### Task 6: Verify

**Step 1: Run typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 2: Run lint**

Run: `pnpm lint packages/sd-cli`
Expected: PASS (or only pre-existing warnings)

**Step 3: Commit**

```bash
git add packages/sd-cli/src/commands/publish.ts
git commit -m "refactor(sd-cli): improve publish safety — explicit git staging, template version sync, remove auto-rollback"
```
