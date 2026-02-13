# copySrc Build Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** sd-cli 라이브러리 빌드 시 `copySrc` glob 패턴에 매칭되는 파일을 `src/`에서 `dist/`로 복사하고, watch 모드에서도 자동 반영한다.

**Architecture:** `sd-config.types.ts`의 `SdBuildPackageConfig`에 `copySrc` 옵션을 추가하고, 새 유틸리티 `copy-src.ts`에서 glob 매칭 + 복사 + FsWatcher 감시를 담당한다. `build.ts`와 `WatchOrchestrator.ts`에서 이 유틸리티를 호출한다.

**Tech Stack:** `@simplysm/core-node` (fsGlob, fsCopy, fsMkdir, fsRm, FsWatcher)

---

### Task 1: `SdBuildPackageConfig`에 `copySrc` 추가

**Files:**
- Modify: `packages/sd-cli/src/sd-config.types.ts:55-60`

**Step 1: `copySrc` 속성 추가**

`SdBuildPackageConfig` 인터페이스에 옵셔널 속성을 추가한다:

```typescript
export interface SdBuildPackageConfig {
  /** 빌드 타겟 */
  target: BuildTarget;
  /** publish 설정 */
  publish?: SdPublishConfig;
  /** src/에서 dist/로 복사할 파일 glob 패턴 (src/ 기준 상대 경로) */
  copySrc?: string[];
}
```

**Step 2: typecheck**

Run: `pnpm typecheck sd-cli`
Expected: PASS

**Step 3: Commit**

```
feat(sd-cli): add copySrc option to SdBuildPackageConfig
```

---

### Task 2: `copySrcFiles` 유틸리티 함수 (일회성 복사)

**Files:**
- Test: `packages/sd-cli/tests/copy-src.spec.ts`
- Create: `packages/sd-cli/src/utils/copy-src.ts`

**Step 1: 테스트 작성**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import os from "os";
import fs from "fs/promises";
import { copySrcFiles } from "../src/utils/copy-src";

describe("copySrcFiles", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "copysrc-"));
    // src/ 구조 생성
    await fs.mkdir(path.join(tmpDir, "src", "components"), { recursive: true });
    await fs.mkdir(path.join(tmpDir, "dist"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, "src", "base.css"), "body {}");
    await fs.writeFile(path.join(tmpDir, "src", "components", "Card.css"), ".card {}");
    await fs.writeFile(path.join(tmpDir, "src", "index.ts"), "export {}");
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("glob 패턴에 매칭되는 파일을 src/에서 dist/로 복사한다", async () => {
    await copySrcFiles(tmpDir, ["**/*.css"]);

    const base = await fs.readFile(path.join(tmpDir, "dist", "base.css"), "utf-8");
    expect(base).toBe("body {}");

    const card = await fs.readFile(path.join(tmpDir, "dist", "components", "Card.css"), "utf-8");
    expect(card).toBe(".card {}");
  });

  it("매칭되지 않는 파일은 복사하지 않는다", async () => {
    await copySrcFiles(tmpDir, ["**/*.css"]);

    const exists = await fs.access(path.join(tmpDir, "dist", "index.ts")).then(() => true, () => false);
    expect(exists).toBe(false);
  });

  it("패턴이 빈 배열이면 아무것도 복사하지 않는다", async () => {
    await copySrcFiles(tmpDir, []);

    const files = await fs.readdir(path.join(tmpDir, "dist"));
    expect(files).toHaveLength(0);
  });
});
```

**Step 2: 테스트 실패 확인**

Run: `pnpm vitest packages/sd-cli/tests/copy-src.spec.ts --run --project=node`
Expected: FAIL — `copySrcFiles is not a function`

**Step 3: 구현**

```typescript
import path from "path";
import { fsGlob, fsCopy, fsMkdir, fsRm, FsWatcher } from "@simplysm/core-node";

/**
 * src/에서 glob 패턴에 매칭되는 파일을 dist/로 복사한다.
 * 상대 경로가 유지된다: src/a/b.css → dist/a/b.css
 *
 * @param pkgDir 패키지 루트 디렉토리
 * @param patterns glob 패턴 배열 (src/ 기준 상대 경로)
 */
export async function copySrcFiles(pkgDir: string, patterns: string[]): Promise<void> {
  const srcDir = path.join(pkgDir, "src");
  const distDir = path.join(pkgDir, "dist");

  for (const pattern of patterns) {
    const files = await fsGlob(pattern, { cwd: srcDir });
    for (const file of files) {
      const srcPath = path.join(srcDir, file);
      const distPath = path.join(distDir, file);
      await fsMkdir(path.dirname(distPath));
      await fsCopy(srcPath, distPath);
    }
  }
}
```

**Step 4: 테스트 통과 확인**

Run: `pnpm vitest packages/sd-cli/tests/copy-src.spec.ts --run --project=node`
Expected: PASS

**Step 5: Commit**

```
feat(sd-cli): add copySrcFiles utility for copying assets from src to dist
```

---

### Task 3: `watchCopySrcFiles` 유틸리티 함수 (watch 모드)

**Files:**
- Modify: `packages/sd-cli/src/utils/copy-src.ts`

**Step 1: 구현**

`copy-src.ts`에 추가한다:

```typescript
/**
 * src/에서 glob 패턴에 매칭되는 파일을 감시하여 dist/로 복사한다.
 * 초기 복사 후 변경/추가/삭제를 자동 반영한다.
 *
 * @param pkgDir 패키지 루트 디렉토리
 * @param patterns glob 패턴 배열 (src/ 기준 상대 경로)
 * @returns FsWatcher 인스턴스 (shutdown 시 close() 호출 필요)
 */
export async function watchCopySrcFiles(pkgDir: string, patterns: string[]): Promise<FsWatcher> {
  const srcDir = path.join(pkgDir, "src");
  const distDir = path.join(pkgDir, "dist");

  // 초기 복사
  await copySrcFiles(pkgDir, patterns);

  // watch 시작
  const watchPaths = patterns.map((p) => path.join(srcDir, p));
  const watcher = await FsWatcher.watch(watchPaths);

  watcher.onChange({ delay: 300 }, async (changes) => {
    for (const { event, path: filePath } of changes) {
      const relPath = path.relative(srcDir, filePath);
      const distPath = path.join(distDir, relPath);

      if (event === "unlink") {
        await fsRm(distPath);
      } else if (event === "add" || event === "change") {
        await fsMkdir(path.dirname(distPath));
        await fsCopy(filePath, distPath);
      }
    }
  });

  return watcher;
}
```

**Step 2: typecheck**

Run: `pnpm typecheck sd-cli`
Expected: PASS

**Step 3: Commit**

```
feat(sd-cli): add watchCopySrcFiles for watch mode asset copying
```

---

### Task 4: `build.ts`에 copySrc 통합

**Files:**
- Modify: `packages/sd-cli/src/commands/build.ts:221-268`

**Step 1: import 추가**

`build.ts` 상단에 추가:

```typescript
import { copySrcFiles } from "../utils/copy-src";
```

**Step 2: buildPackages 루프에 copySrc 호출 추가**

`build.ts`의 buildPackages 루프 (라인 221~268) 내에서, `finally` 블록 직후에 copySrc 처리를 추가한다.
기존 `task: async () => {` 함수 내부, try-finally 뒤에:

```typescript
// copySrc 파일 복사
if (config.copySrc != null && config.copySrc.length > 0) {
  await copySrcFiles(pkgDir, config.copySrc);
}
```

**Step 3: typecheck**

Run: `pnpm typecheck sd-cli`
Expected: PASS

**Step 4: 통합 테스트 — solid 빌드**

Run: `pnpm build solid`
Expected: `packages/solid/dist/base.css` 파일 존재 확인 (Task 6에서 sd.config.ts 설정 후)

**Step 5: Commit**

```
feat(sd-cli): integrate copySrc into production build
```

---

### Task 5: `WatchOrchestrator`에 copySrc 통합

**Files:**
- Modify: `packages/sd-cli/src/orchestrators/WatchOrchestrator.ts`

**Step 1: import 추가**

```typescript
import { watchCopySrcFiles } from "../utils/copy-src";
import type { FsWatcher } from "@simplysm/core-node";
import type { SdBuildPackageConfig } from "../sd-config.types";
```

**Step 2: watcher 배열 멤버 추가**

클래스에 멤버 추가:

```typescript
private _copySrcWatchers: FsWatcher[] = [];
```

**Step 3: `start()` 메서드에서 watch 시작**

`start()` 메서드 내, `void this._libraryBuilder.startWatch()` 호출 전후에:

```typescript
// copySrc watch 시작
for (const pkg of this._packages) {
  const buildConfig = pkg.config as SdBuildPackageConfig;
  if (buildConfig.copySrc != null && buildConfig.copySrc.length > 0) {
    const watcher = await watchCopySrcFiles(pkg.dir, buildConfig.copySrc);
    this._copySrcWatchers.push(watcher);
  }
}
```

**Step 4: `shutdown()` 메서드에서 watcher 정리**

기존 `Promise.all([...shutdown()])` 에 추가:

```typescript
await Promise.all([
  this._libraryBuilder.shutdown(),
  this._dtsBuilder.shutdown(),
  ...this._copySrcWatchers.map((w) => w.close()),
]);
this._copySrcWatchers = [];
```

**Step 5: typecheck**

Run: `pnpm typecheck sd-cli`
Expected: PASS

**Step 6: Commit**

```
feat(sd-cli): integrate copySrc watch into WatchOrchestrator
```

---

### Task 6: `sd.config.ts` 및 `solid/package.json` 설정

**Files:**
- Modify: `sd.config.ts:21`
- Modify: `packages/solid/package.json`

**Step 1: sd.config.ts에 copySrc 추가**

```typescript
"solid": { target: "browser", publish: "npm", copySrc: ["**/*.css"] },
```

**Step 2: solid package.json에 sideEffects 추가**

`"sideEffects": false`를 `"sideEffects": ["*.css"]`로 변경 (또는 없으면 추가):

```json
"sideEffects": ["*.css"],
```

**Step 3: 빌드 검증**

Run: `pnpm build solid`
Expected: `packages/solid/dist/` 내에 다음 CSS 파일들이 존재:
- `base.css`
- `components/display/Card.css`
- `components/feedback/loading/LoadingContainer.css`
- `components/data/sheet/DataSheet.css`
- `components/data/kanban/Kanban.css`
- `components/form-control/editor/editor.css`

**Step 4: Commit**

```
feat(solid): configure copySrc for CSS distribution and sideEffects
```
