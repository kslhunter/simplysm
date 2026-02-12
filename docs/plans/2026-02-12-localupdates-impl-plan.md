# LocalUpdates Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Migrate the legacy `localUpdates` feature to the current CLI, using symlink replacement instead of file copy for pnpm compatibility.

**Architecture:** Add a lightweight utility function `setupLocalUpdates` that parses `pnpm-workspace.yaml`, resolves glob patterns from config, and replaces symlinks in all workspace `node_modules/` directories. Called once at startup by build/watch/dev commands before their main logic runs.

**Tech Stack:** Node.js `fs` (symlink/readlink), `glob` package (already a dependency), `@simplysm/core-node` fs utilities

---

### Task 1: Add `localUpdates` field to SdConfig type

**Files:**
- Modify: `packages/sd-cli/src/sd-config.types.ts:212-217`

**Step 1: Add localUpdates to SdConfig interface**

In `packages/sd-cli/src/sd-config.types.ts`, add the `localUpdates` field to `SdConfig`:

```typescript
/**
 * sd.config.ts 설정 타입
 */
export interface SdConfig {
  /** 패키지별 설정 (키: packages/ 하위 디렉토리 이름, 예: "core-common") */
  packages: Record<string, SdPackageConfig | undefined>;
  /**
   * 로컬 라이브러리 업데이트 설정
   * - 키: node_modules에서 찾을 패키지 glob 패턴 (예: "@simplysm/*")
   * - 값: 소스 디렉토리 경로 (키의 * 캡처값이 값의 *에 치환됨)
   * - 예: { "@simplysm/*": "../simplysm/packages/*" }
   */
  localUpdates?: Record<string, string>;
  /** 배포 완료 후 실행할 스크립트 */
  postPublish?: SdPostPublishScriptConfig[];
}
```

**Step 2: Run typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS (기존 코드에 영향 없음, optional 필드 추가)

**Step 3: Commit**

```bash
git add packages/sd-cli/src/sd-config.types.ts
git commit -m "feat(sd-cli): add localUpdates field to SdConfig type"
```

---

### Task 2: Implement `resolveLocalUpdateEntries` (pattern matching + path resolution)

**Files:**
- Create: `packages/sd-cli/src/utils/local-updates.ts`
- Create: `packages/sd-cli/tests/local-updates.spec.ts`

**Step 1: Write the failing test for pattern matching**

Create `packages/sd-cli/tests/local-updates.spec.ts`:

```typescript
import { describe, expect, test } from "vitest";
import { resolveLocalUpdateEntries } from "../src/utils/local-updates";

describe("resolveLocalUpdateEntries", () => {
  test("glob * 패턴이 캡처되어 소스 경로의 *에 치환된다", () => {
    const result = resolveLocalUpdateEntries(
      { "@simplysm/*": "../simplysm/packages/*" },
      ["@simplysm/solid", "@simplysm/core-common"],
    );
    expect(result).toEqual([
      { targetName: "@simplysm/solid", sourcePath: "../simplysm/packages/solid" },
      { targetName: "@simplysm/core-common", sourcePath: "../simplysm/packages/core-common" },
    ]);
  });

  test("* 없는 정확한 패키지명도 매칭된다", () => {
    const result = resolveLocalUpdateEntries(
      { "@other/lib": "../other-project/lib" },
      ["@other/lib", "@other/unused"],
    );
    expect(result).toEqual([
      { targetName: "@other/lib", sourcePath: "../other-project/lib" },
    ]);
  });

  test("매칭되지 않는 패키지는 결과에 포함되지 않는다", () => {
    const result = resolveLocalUpdateEntries(
      { "@simplysm/*": "../simplysm/packages/*" },
      ["@other/lib"],
    );
    expect(result).toEqual([]);
  });

  test("여러 localUpdates 항목이 모두 처리된다", () => {
    const result = resolveLocalUpdateEntries(
      {
        "@simplysm/*": "../simplysm/packages/*",
        "@other/lib": "../other/lib",
      },
      ["@simplysm/solid", "@other/lib"],
    );
    expect(result).toEqual([
      { targetName: "@simplysm/solid", sourcePath: "../simplysm/packages/solid" },
      { targetName: "@other/lib", sourcePath: "../other/lib" },
    ]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/sd-cli/tests/local-updates.spec.ts --project=node --run`
Expected: FAIL - `resolveLocalUpdateEntries` is not exported

**Step 3: Write minimal implementation**

Create `packages/sd-cli/src/utils/local-updates.ts`:

```typescript
/**
 * localUpdates 설정의 glob 패턴과 대상 패키지 목록을 매칭하여
 * { targetName, sourcePath } 쌍을 반환한다.
 *
 * @param localUpdates - sd.config.ts의 localUpdates 설정 (키: glob 패턴, 값: 소스 경로)
 * @param targetNames - node_modules에서 찾은 패키지 이름 목록 (예: ["@simplysm/solid", ...])
 * @returns 매칭된 { targetName, sourcePath } 배열
 */
export function resolveLocalUpdateEntries(
  localUpdates: Record<string, string>,
  targetNames: string[],
): Array<{ targetName: string; sourcePath: string }> {
  const results: Array<{ targetName: string; sourcePath: string }> = [];

  for (const [pattern, sourceTemplate] of Object.entries(localUpdates)) {
    // glob 패턴을 정규식으로 변환: * → (.*), . → \., / → [\\/]
    const regexpText = pattern.replace(/[\\/.+*]/g, (ch) => {
      if (ch === "*") return "(.*)";
      if (ch === ".") return "\\.";
      if (ch === "/" || ch === "\\") return "[\\\\/]";
      if (ch === "+") return "\\+";
      return ch;
    });
    const regex = new RegExp(`^${regexpText}$`);

    for (const targetName of targetNames) {
      const match = regex.exec(targetName);
      if (match == null) continue;

      // 캡처 그룹이 있으면 소스 경로의 *에 치환
      const captured = match[1];
      const sourcePath = captured != null
        ? sourceTemplate.replace(/\*/g, captured)
        : sourceTemplate;

      results.push({ targetName, sourcePath });
    }
  }

  return results;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/sd-cli/tests/local-updates.spec.ts --project=node --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/sd-cli/src/utils/local-updates.ts packages/sd-cli/tests/local-updates.spec.ts
git commit -m "feat(sd-cli): add resolveLocalUpdateEntries with pattern matching"
```

---

### Task 3: Implement `parseWorkspaceGlobs` (pnpm-workspace.yaml parsing)

**Files:**
- Modify: `packages/sd-cli/src/utils/local-updates.ts`
- Modify: `packages/sd-cli/tests/local-updates.spec.ts`

**Step 1: Write the failing test**

Append to `packages/sd-cli/tests/local-updates.spec.ts`:

```typescript
import { parseWorkspaceGlobs } from "../src/utils/local-updates";

describe("parseWorkspaceGlobs", () => {
  test("packages glob 배열을 파싱한다", () => {
    const yaml = `packages:\n  - "packages/*"\n  - "tools/*"`;
    expect(parseWorkspaceGlobs(yaml)).toEqual(["packages/*", "tools/*"]);
  });

  test("따옴표 없는 glob도 파싱한다", () => {
    const yaml = `packages:\n  - packages/*\n  - tools/*`;
    expect(parseWorkspaceGlobs(yaml)).toEqual(["packages/*", "tools/*"]);
  });

  test("빈 내용이면 빈 배열을 반환한다", () => {
    expect(parseWorkspaceGlobs("")).toEqual([]);
  });

  test("packages 섹션이 없으면 빈 배열을 반환한다", () => {
    const yaml = `# some comment\nsomething: value`;
    expect(parseWorkspaceGlobs(yaml)).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/sd-cli/tests/local-updates.spec.ts --project=node --run`
Expected: FAIL - `parseWorkspaceGlobs` is not exported

**Step 3: Write minimal implementation**

Add to `packages/sd-cli/src/utils/local-updates.ts`:

```typescript
/**
 * pnpm-workspace.yaml 내용을 파싱하여 workspace packages glob 배열을 반환한다.
 * 별도 YAML 라이브러리 없이 간단한 라인 파싱으로 처리한다.
 *
 * @param content - pnpm-workspace.yaml 파일 내용
 * @returns glob 패턴 배열 (예: ["packages/*", "tools/*"])
 */
export function parseWorkspaceGlobs(content: string): string[] {
  const lines = content.split("\n");
  const globs: string[] = [];
  let inPackages = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "packages:") {
      inPackages = true;
      continue;
    }

    // packages 섹션 내의 리스트 항목
    if (inPackages && trimmed.startsWith("- ")) {
      const value = trimmed.slice(2).trim().replace(/^["']|["']$/g, "");
      globs.push(value);
      continue;
    }

    // 다른 섹션이 시작되면 종료
    if (inPackages && trimmed !== "" && !trimmed.startsWith("#")) {
      break;
    }
  }

  return globs;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/sd-cli/tests/local-updates.spec.ts --project=node --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/sd-cli/src/utils/local-updates.ts packages/sd-cli/tests/local-updates.spec.ts
git commit -m "feat(sd-cli): add parseWorkspaceGlobs for pnpm-workspace.yaml"
```

---

### Task 4: Implement `setupLocalUpdates` main function (symlink replacement)

**Files:**
- Modify: `packages/sd-cli/src/utils/local-updates.ts`
- Modify: `packages/sd-cli/tests/local-updates.spec.ts`

**Step 1: Write the failing integration test**

Append to `packages/sd-cli/tests/local-updates.spec.ts`:

```typescript
import { setupLocalUpdates } from "../src/utils/local-updates";
import fs from "fs";
import path from "path";
import os from "os";

describe("setupLocalUpdates", () => {
  let tmpDir: string;

  beforeEach(async () => {
    // 임시 디렉토리에 테스트용 프로젝트 구조 생성
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sd-local-updates-"));

    // 소스 패키지 (simplysm/packages/solid)
    const sourceDir = path.join(tmpDir, "simplysm", "packages", "solid");
    await fs.promises.mkdir(sourceDir, { recursive: true });
    await fs.promises.writeFile(path.join(sourceDir, "index.js"), "export default 1;");

    // 대상 프로젝트 (app/node_modules/@simplysm/solid)
    const appRoot = path.join(tmpDir, "app");
    const nodeModulesTarget = path.join(appRoot, "node_modules", "@simplysm", "solid");
    await fs.promises.mkdir(nodeModulesTarget, { recursive: true });
    await fs.promises.writeFile(path.join(nodeModulesTarget, "index.js"), "old");
  });

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  test("node_modules 내 패키지를 소스 디렉토리로 symlink 교체한다", async () => {
    const appRoot = path.join(tmpDir, "app");

    await setupLocalUpdates(appRoot, {
      "@simplysm/*": "../simplysm/packages/*",
    });

    const targetPath = path.join(appRoot, "node_modules", "@simplysm", "solid");
    const stat = await fs.promises.lstat(targetPath);
    expect(stat.isSymbolicLink()).toBe(true);

    const linkTarget = await fs.promises.readlink(targetPath);
    const resolved = path.resolve(path.dirname(targetPath), linkTarget);
    expect(resolved).toBe(path.join(tmpDir, "simplysm", "packages", "solid"));
  });

  test("소스 경로가 없으면 해당 패키지를 스킵한다", async () => {
    const appRoot = path.join(tmpDir, "app");

    // no-exist 패키지의 node_modules 생성
    const noExistTarget = path.join(appRoot, "node_modules", "@simplysm", "no-exist");
    await fs.promises.mkdir(noExistTarget, { recursive: true });

    // 에러 없이 완료되어야 함
    await setupLocalUpdates(appRoot, {
      "@simplysm/*": "../simplysm/packages/*",
    });

    // solid은 symlink, no-exist는 그대로
    const solidStat = await fs.promises.lstat(
      path.join(appRoot, "node_modules", "@simplysm", "solid"),
    );
    expect(solidStat.isSymbolicLink()).toBe(true);

    const noExistStat = await fs.promises.lstat(noExistTarget);
    expect(noExistStat.isDirectory()).toBe(true);
    expect(noExistStat.isSymbolicLink()).toBe(false);
  });

  test("workspace 패키지의 node_modules도 처리한다", async () => {
    const appRoot = path.join(tmpDir, "app");

    // workspace 패키지 구조 생성
    const pkgNodeModules = path.join(appRoot, "packages", "client", "node_modules", "@simplysm", "solid");
    await fs.promises.mkdir(pkgNodeModules, { recursive: true });
    await fs.promises.writeFile(path.join(pkgNodeModules, "index.js"), "old");

    // pnpm-workspace.yaml 생성
    await fs.promises.writeFile(
      path.join(appRoot, "pnpm-workspace.yaml"),
      "packages:\n  - packages/*\n",
    );

    await setupLocalUpdates(appRoot, {
      "@simplysm/*": "../simplysm/packages/*",
    });

    // workspace 패키지의 node_modules도 symlink 교체 확인
    const stat = await fs.promises.lstat(pkgNodeModules);
    expect(stat.isSymbolicLink()).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/sd-cli/tests/local-updates.spec.ts --project=node --run`
Expected: FAIL - `setupLocalUpdates` is not exported

**Step 3: Write minimal implementation**

Add to `packages/sd-cli/src/utils/local-updates.ts`:

```typescript
import fs from "fs";
import path from "path";
import { glob } from "glob";
import { consola } from "consola";

/**
 * localUpdates 설정에 따라 node_modules 내 패키지를 소스 디렉토리로 symlink 교체한다.
 *
 * 1. pnpm-workspace.yaml 파싱 → workspace 패키지 경로 목록
 * 2. [루트, ...workspace 패키지]의 node_modules에서 매칭되는 패키지 찾기
 * 3. 기존 symlink/디렉토리 제거 → 소스 경로로 symlink 생성
 *
 * @param projectRoot - 프로젝트 루트 경로
 * @param localUpdates - sd.config.ts의 localUpdates 설정
 */
export async function setupLocalUpdates(
  projectRoot: string,
  localUpdates: Record<string, string>,
): Promise<void> {
  const logger = consola.withTag("sd:cli:local-updates");

  // 1. Workspace 패키지 경로 목록 수집
  const searchRoots = [projectRoot];

  const workspaceYamlPath = path.join(projectRoot, "pnpm-workspace.yaml");
  try {
    const yamlContent = await fs.promises.readFile(workspaceYamlPath, "utf-8");
    const workspaceGlobs = parseWorkspaceGlobs(yamlContent);

    for (const pattern of workspaceGlobs) {
      const dirs = await glob(pattern, { cwd: projectRoot, absolute: true });
      searchRoots.push(...dirs);
    }
  } catch {
    // pnpm-workspace.yaml가 없으면 루트만 처리
  }

  // 2. 각 searchRoot의 node_modules에서 매칭되는 패키지 찾기
  for (const searchRoot of searchRoots) {
    const nodeModulesDir = path.join(searchRoot, "node_modules");

    try {
      await fs.promises.access(nodeModulesDir);
    } catch {
      continue; // node_modules 없으면 스킵
    }

    // localUpdates의 각 glob 패턴으로 node_modules 내 디렉토리 탐색
    const targetNames: string[] = [];
    for (const pattern of Object.keys(localUpdates)) {
      const matches = await glob(pattern, { cwd: nodeModulesDir });
      targetNames.push(...matches);
    }

    if (targetNames.length === 0) continue;

    // 패턴 매칭 및 경로 해석
    const entries = resolveLocalUpdateEntries(localUpdates, targetNames);

    // 3. Symlink 교체
    for (const { targetName, sourcePath } of entries) {
      const targetPath = path.join(nodeModulesDir, targetName);
      const resolvedSourcePath = path.resolve(projectRoot, sourcePath);

      // 소스 경로 존재 확인
      try {
        await fs.promises.access(resolvedSourcePath);
      } catch {
        logger.warn(`소스 경로가 존재하지 않아 스킵합니다: ${resolvedSourcePath}`);
        continue;
      }

      try {
        // 기존 symlink/디렉토리 제거
        await fs.promises.rm(targetPath, { recursive: true, force: true });

        // 상대 경로로 symlink 생성
        const relativePath = path.relative(path.dirname(targetPath), resolvedSourcePath);
        await fs.promises.symlink(relativePath, targetPath, "dir");

        logger.info(`${targetName} → ${sourcePath}`);
      } catch (err) {
        logger.error(`symlink 교체 실패 (${targetName}): ${err instanceof Error ? err.message : err}`);
      }
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/sd-cli/tests/local-updates.spec.ts --project=node --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/sd-cli/src/utils/local-updates.ts packages/sd-cli/tests/local-updates.spec.ts
git commit -m "feat(sd-cli): add setupLocalUpdates with symlink replacement"
```

---

### Task 5: Integrate into build, watch, and dev commands

**Files:**
- Modify: `packages/sd-cli/src/commands/build.ts:121-137`
- Modify: `packages/sd-cli/src/orchestrators/WatchOrchestrator.ts:53-69`
- Modify: `packages/sd-cli/src/commands/dev.ts:62-78`

**Step 1: Add to build.ts**

In `packages/sd-cli/src/commands/build.ts`, add import at top:

```typescript
import { setupLocalUpdates } from "../utils/local-updates";
```

After `sdConfig` is loaded (after line 133), add:

```typescript
  // localUpdates 설정이 있으면 symlink 교체
  if (sdConfig.localUpdates != null) {
    await setupLocalUpdates(cwd, sdConfig.localUpdates);
  }
```

Insert between existing `logger.debug("sd.config.ts 로드 완료");` (line 132) and `// VER, DEV 환경변수 준비` (line 139).

**Step 2: Add to WatchOrchestrator.ts**

In `packages/sd-cli/src/orchestrators/WatchOrchestrator.ts`, add import at top:

```typescript
import { setupLocalUpdates } from "../utils/local-updates";
```

After `sdConfig` is loaded (after line 64), add:

```typescript
    // localUpdates 설정이 있으면 symlink 교체
    if (sdConfig.localUpdates != null) {
      await setupLocalUpdates(this._cwd, sdConfig.localUpdates);
    }
```

Insert between existing `this._logger.debug("sd.config.ts 로드 완료");` (line 64) and `// targets 필터링` (line 72).

**Step 3: Add to dev.ts**

In `packages/sd-cli/src/commands/dev.ts`, add import at top:

```typescript
import { setupLocalUpdates } from "../utils/local-updates";
```

After `sdConfig` is loaded (after line 77), add:

```typescript
  // localUpdates 설정이 있으면 symlink 교체
  if (sdConfig.localUpdates != null) {
    await setupLocalUpdates(cwd, sdConfig.localUpdates);
  }
```

Insert between existing `logger.debug("sd.config.ts 로드 완료");` (line 73) and `// VER, DEV 환경변수 준비` (line 80).

**Step 4: Run typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 5: Run lint**

Run: `pnpm lint packages/sd-cli`
Expected: PASS

**Step 6: Run all tests**

Run: `pnpm vitest packages/sd-cli/tests/local-updates.spec.ts --project=node --run`
Expected: PASS

**Step 7: Commit**

```bash
git add packages/sd-cli/src/commands/build.ts packages/sd-cli/src/orchestrators/WatchOrchestrator.ts packages/sd-cli/src/commands/dev.ts
git commit -m "feat(sd-cli): integrate setupLocalUpdates into build/watch/dev commands"
```

---

### Task 6: Final verification and cleanup

**Step 1: Run full typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 2: Run full lint**

Run: `pnpm lint packages/sd-cli`
Expected: PASS

**Step 3: Run all tests**

Run: `pnpm vitest packages/sd-cli --project=node --run`
Expected: PASS

**Step 4: Final commit (if lint/typecheck fixes were needed)**

If any fixes were made:
```bash
git add -A
git commit -m "fix(sd-cli): address lint/typecheck issues in localUpdates"
```
