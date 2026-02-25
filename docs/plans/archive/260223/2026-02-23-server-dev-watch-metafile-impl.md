# Server Dev Watch + Metafile Filtering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** server dev 모드에서 workspace 의존성 패키지 source 변경 시 자동 rebuild/재시작 지원, metafile 필터링으로 불필요한 rebuild 방지

**Architecture:** 기존 FsWatcher 구조 유지, watch 범위 확장 + esbuild metafile.inputs 기반 필터링. output 변경 감지로 불필요한 서버 재시작도 방지.

**Tech Stack:** esbuild (metafile, write:false), chokidar (FsWatcher), pathNorm

---

### Task 1: `writeChangedOutputFiles` 반환값 추가

**Files:**
- Modify: `packages/sd-cli/src/utils/esbuild-config.ts:16-41`

**Step 1: 반환타입을 `Promise<boolean>`으로 변경**

`writeChangedOutputFiles`가 실제 파일 변경 여부를 반환하도록 수정.

```typescript
export async function writeChangedOutputFiles(outputFiles: esbuild.OutputFile[]): Promise<boolean> {
  let hasChanges = false;
  await Promise.all(
    outputFiles.map(async (file) => {
      const finalText = file.path.endsWith(".js")
        ? file.text.replace(
            /((?:from|import)\s*["'])(\.\.?\/[^"']*?)(["'])/g,
            (_match, prefix: string, importPath: string, suffix: string) => {
              if (/\.(js|mjs|cjs|json|css|wasm|node)$/i.test(importPath)) return _match;
              return `${prefix}${importPath}.js${suffix}`;
            },
          )
        : file.text;

      try {
        const existing = await fs.readFile(file.path, "utf-8");
        if (existing === finalText) return;
      } catch {
        // File doesn't exist yet
      }

      hasChanges = true;
      await fs.mkdir(path.dirname(file.path), { recursive: true });
      await fs.writeFile(file.path, finalText);
    }),
  );
  return hasChanges;
}
```

**Step 2: Typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS (반환타입 변경은 기존 호출부에 영향 없음 — void → boolean은 호환)

---

### Task 2: `createAndBuildContext`에 metafile + write:false + output 변경 감지 추가

**Files:**
- Modify: `packages/sd-cli/src/workers/server.worker.ts`

**Step 1: import 추가**

`@simplysm/core-node`에서 `pathNorm` 추가, `../utils/esbuild-config`에서 `writeChangedOutputFiles` 추가:

```typescript
import { createWorker, FsWatcher, pathNorm } from "@simplysm/core-node";
```

```typescript
import {
  createServerEsbuildOptions,
  collectUninstalledOptionalPeerDeps,
  collectNativeModuleExternals,
  writeChangedOutputFiles,
} from "../utils/esbuild-config";
```

**Step 2: 모듈 레벨 변수 추가**

`esbuildContext` 선언 아래에 추가:

```typescript
/** 마지막 빌드의 metafile (rebuild 시 변경 파일 필터링용) */
let lastMetafile: esbuild.Metafile | undefined;
```

**Step 3: `cleanup`에 `lastMetafile` 초기화 추가**

```typescript
async function cleanup(): Promise<void> {
  const contextToDispose = esbuildContext;
  esbuildContext = undefined;
  lastMetafile = undefined;  // 추가
  // ... 나머지 동일
```

**Step 4: `createAndBuildContext` 수정 — esbuild.context 옵션**

```typescript
const context = await esbuild.context({
  ...baseOptions,
  metafile: true,
  write: false,
  plugins: [
    {
      name: "watch-notify",
      setup(pluginBuild) {
        pluginBuild.onStart(() => {
          sender.send("buildStart", {});
        });

        pluginBuild.onEnd(async (result) => {
          // metafile 저장
          if (result.metafile != null) {
            lastMetafile = result.metafile;
          }

          const errors = result.errors.map((e) => e.text);
          const warnings = result.warnings.map((w) => w.text);
          const success = result.errors.length === 0;

          // output 파일 쓰기 및 변경 여부 확인
          let hasOutputChange = false;
          if (success && result.outputFiles != null) {
            hasOutputChange = await writeChangedOutputFiles(result.outputFiles);
          }

          if (isBuildFirstTime && success) {
            const confDistPath = path.join(info.pkgDir, "dist", ".config.json");
            fs.writeFileSync(confDistPath, JSON.stringify(info.configs ?? {}, undefined, 2));
          }

          // 첫 빌드이거나, output이 변경되었거나, 에러인 경우에만 build 이벤트 발생
          if (isBuildFirstTime || hasOutputChange || !success) {
            sender.send("build", {
              success,
              mainJsPath,
              errors: errors.length > 0 ? errors : undefined,
              warnings: warnings.length > 0 ? warnings : undefined,
            });
          } else {
            logger.debug("output 변경 없음, 서버 재시작 skip");
          }

          if (isBuildFirstTime) {
            isBuildFirstTime = false;
            resolveFirstBuild?.();
          }
        });
      },
    },
  ],
});
```

**Step 5: Typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

---

### Task 3: Watch 경로 교체

**Files:**
- Modify: `packages/sd-cli/src/workers/server.worker.ts` — `startWatch` 함수 내 watch 경로 수집 부분 (라인 455-474)

**Step 1: 기존 watch 경로 코드를 새 6개 경로로 교체**

기존 코드:
```typescript
// FsWatcher 감시 경로 수집
const watchPaths: string[] = [];

// 1) 서버 자체 소스
watchPaths.push(path.join(info.pkgDir, "src", "**", "*.{ts,tsx}"));

// 2) scope 패키지 dist 디렉토리
if (info.watchScopes != null) {
  for (const scope of info.watchScopes) {
    const scopeDir = path.join(info.pkgDir, "node_modules", scope);
    if (!fs.existsSync(scopeDir)) continue;

    for (const pkgName of fs.readdirSync(scopeDir)) {
      const distDir = path.join(scopeDir, pkgName, "dist");
      if (fs.existsSync(distDir)) {
        watchPaths.push(distDir);
      }
    }
  }
}
```

교체:
```typescript
// FsWatcher 감시 경로 수집
const watchPaths: string[] = [];

// 1) workspace 패키지 소스
watchPaths.push(path.join(info.cwd, "packages", "*", "src", "**", "*"));

// 2) workspace 패키지 루트 설정 파일
watchPaths.push(path.join(info.cwd, "packages", "*", "*.{ts,js,css}"));

// 3-4) scope 패키지 (루트 node_modules)
if (info.watchScopes != null) {
  for (const scope of info.watchScopes) {
    watchPaths.push(path.join(info.cwd, "node_modules", scope, "*", "dist", "**", "*.js"));
    watchPaths.push(path.join(info.cwd, "node_modules", scope, "*", "*.{ts,js,css}"));
  }
}

// 5-6) scope 패키지 (현재 패키지 node_modules, hoisting 안 된 경우)
if (info.watchScopes != null) {
  for (const scope of info.watchScopes) {
    watchPaths.push(path.join(info.pkgDir, "node_modules", scope, "*", "dist", "**", "*.js"));
    watchPaths.push(path.join(info.pkgDir, "node_modules", scope, "*", "*.{ts,js,css}"));
  }
}
```

**Step 2: Typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

---

### Task 4: onChange 핸들러 metafile 필터링 적용

**Files:**
- Modify: `packages/sd-cli/src/workers/server.worker.ts` — onChange 콜백 (라인 480-509)

**Step 1: onChange 핸들러 재작성**

기존 코드:
```typescript
srcWatcher.onChange({ delay: 300 }, async (changes) => {
  try {
    const srcDir = path.join(info.pkgDir, "src");
    const hasEntryPointChange = changes.some(
      (c) =>
        (c.event === "add" || c.event === "unlink") &&
        c.path.startsWith(srcDir.replace(/\\/g, "/")),
    );

    if (hasEntryPointChange) {
      logger.debug("서버 소스 파일 추가/삭제 감지, context 재생성");
      const oldContext = esbuildContext;
      esbuildContext = await createAndBuildContext(info, false);
      if (oldContext != null) {
        await oldContext.dispose();
      }
    } else {
      if (esbuildContext != null) {
        await esbuildContext.rebuild();
      }
    }
  } catch (err) {
    sender.send("error", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
```

교체:
```typescript
srcWatcher.onChange({ delay: 300 }, async (changes) => {
  try {
    // 파일 추가/삭제가 있으면 context 재생성 (import graph 변경 가능)
    const hasFileAddOrRemove = changes.some(
      (c) => c.event === "add" || c.event === "unlink",
    );

    if (hasFileAddOrRemove) {
      logger.debug("파일 추가/삭제 감지, context 재생성");

      const oldContext = esbuildContext;
      esbuildContext = await createAndBuildContext(info, false);

      if (oldContext != null) {
        await oldContext.dispose();
      }
      return;
    }

    // 파일 변경만 있는 경우: metafile 필터링
    if (esbuildContext == null) return;

    // metafile이 없으면 (첫 빌드 전) 무조건 rebuild
    if (lastMetafile == null) {
      await esbuildContext.rebuild();
      return;
    }

    // metafile.inputs 키를 절대경로(NormPath)로 변환하여 비교
    const metafileAbsPaths = new Set(
      Object.keys(lastMetafile.inputs).map((key) => pathNorm(info.cwd, key)),
    );

    const hasRelevantChange = changes.some((c) => metafileAbsPaths.has(c.path));

    if (hasRelevantChange) {
      await esbuildContext.rebuild();
    } else {
      logger.debug("변경된 파일이 빌드에 포함되지 않음, rebuild skip");
    }
  } catch (err) {
    sender.send("error", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
```

**핵심 포인트:**
- `c.path`는 FsWatcher에서 `pathNorm(changedPath)`로 정규화된 절대경로 (NormPath)
- `lastMetafile.inputs`의 키는 esbuild cwd 기준 상대경로 → `pathNorm(info.cwd, key)`로 변환
- 둘 다 NormPath이므로 직접 비교 가능

**Step 2: Typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

---

### Task 5: Lint + Commit

**Step 1: Lint**

Run: `pnpm lint packages/sd-cli --fix`
Expected: PASS

**Step 2: Commit**

```bash
git add packages/sd-cli/src/workers/server.worker.ts packages/sd-cli/src/utils/esbuild-config.ts
git commit -m "feat(sd-cli): add metafile-based watch filtering for server dev mode

- Expand watch paths to include workspace package sources and root config files
- Filter rebuilds using esbuild metafile.inputs to avoid unnecessary rebuilds
- Detect output changes to skip server restart when build output is identical
- Expand file add/remove detection to all watched paths (not just server src)"
```
