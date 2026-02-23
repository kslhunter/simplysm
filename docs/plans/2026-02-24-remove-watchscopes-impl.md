# watchScopes 제거 및 dependency 기반 watch 전환 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** `watchScopes` 개념을 전면 제거하고, package.json dependencies 기반으로 workspace/replaceDeps 의존성을 정확히 구분하여 watch하도록 전환

**Architecture:** `collectDeps()` 유틸 함수가 패키지의 dependencies를 재귀 탐색하여 `{ workspaceDeps, replaceDeps }` 반환. server worker, client worker, Vite 플러그인 모두 이 결과를 사용. `getWatchScopes` 및 관련 인프라 전부 제거.

**Tech Stack:** TypeScript, esbuild, Vite, vitest

---

### Task 1: `collectDeps` 유틸 함수 구현

**Files:**
- Modify: `packages/sd-cli/src/utils/package-utils.ts`
- Modify: `packages/sd-cli/tests/package-utils.spec.ts`

**Step 1: 테스트 작성**

`packages/sd-cli/tests/package-utils.spec.ts`에 `collectDeps` 테스트 추가:

```typescript
import { collectDeps } from "../src/utils/package-utils";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";

describe("collectDeps", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "collectDeps-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writePkgJson(dir: string, content: Record<string, unknown>): void {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify(content));
  }

  it("workspace 직접 의존성을 수집한다", () => {
    // root
    writePkgJson(tmpDir, { name: "@myapp/root" });
    // server
    writePkgJson(path.join(tmpDir, "packages", "server"), {
      name: "@myapp/server",
      dependencies: { "@myapp/core": "workspace:*" },
    });
    // core
    writePkgJson(path.join(tmpDir, "packages", "core"), {
      name: "@myapp/core",
    });

    const result = collectDeps(
      path.join(tmpDir, "packages", "server"),
      tmpDir,
    );
    expect(result.workspaceDeps).toEqual(["core"]);
    expect(result.replaceDeps).toEqual([]);
  });

  it("workspace 전이 의존성을 재귀 수집한다", () => {
    writePkgJson(tmpDir, { name: "@myapp/root" });
    writePkgJson(path.join(tmpDir, "packages", "server"), {
      name: "@myapp/server",
      dependencies: { "@myapp/b": "workspace:*" },
    });
    writePkgJson(path.join(tmpDir, "packages", "b"), {
      name: "@myapp/b",
      dependencies: { "@myapp/c": "workspace:*" },
    });
    writePkgJson(path.join(tmpDir, "packages", "c"), {
      name: "@myapp/c",
    });

    const result = collectDeps(
      path.join(tmpDir, "packages", "server"),
      tmpDir,
    );
    expect(result.workspaceDeps).toContain("b");
    expect(result.workspaceDeps).toContain("c");
  });

  it("replaceDeps glob 패턴에 매칭되는 의존성을 수집한다", () => {
    writePkgJson(tmpDir, { name: "@myapp/root" });
    writePkgJson(path.join(tmpDir, "packages", "server"), {
      name: "@myapp/server",
      dependencies: { "@simplysm/solid": "^13.0.0" },
    });
    // replaceDeps 패키지는 node_modules에 존재
    writePkgJson(path.join(tmpDir, "node_modules", "@simplysm", "solid"), {
      name: "@simplysm/solid",
    });

    const result = collectDeps(
      path.join(tmpDir, "packages", "server"),
      tmpDir,
      { "@simplysm/*": "../simplysm/packages/*" },
    );
    expect(result.workspaceDeps).toEqual([]);
    expect(result.replaceDeps).toContain("@simplysm/solid");
  });

  it("workspace → replaceDeps 전이 의존성을 추적한다", () => {
    writePkgJson(tmpDir, { name: "@myapp/root" });
    writePkgJson(path.join(tmpDir, "packages", "server"), {
      name: "@myapp/server",
      dependencies: { "@myapp/b": "workspace:*" },
    });
    writePkgJson(path.join(tmpDir, "packages", "b"), {
      name: "@myapp/b",
      dependencies: { "@simplysm/solid": "^13.0.0" },
    });
    writePkgJson(path.join(tmpDir, "node_modules", "@simplysm", "solid"), {
      name: "@simplysm/solid",
    });

    const result = collectDeps(
      path.join(tmpDir, "packages", "server"),
      tmpDir,
      { "@simplysm/*": "../simplysm/packages/*" },
    );
    expect(result.workspaceDeps).toContain("b");
    expect(result.replaceDeps).toContain("@simplysm/solid");
  });

  it("replaceDeps → replaceDeps 전이 의존성을 추적한다", () => {
    writePkgJson(tmpDir, { name: "@myapp/root" });
    writePkgJson(path.join(tmpDir, "packages", "server"), {
      name: "@myapp/server",
      dependencies: { "@simplysm/solid": "^13.0.0" },
    });
    writePkgJson(path.join(tmpDir, "node_modules", "@simplysm", "solid"), {
      name: "@simplysm/solid",
      dependencies: { "@simplysm/core-common": "^13.0.0" },
    });
    writePkgJson(path.join(tmpDir, "node_modules", "@simplysm", "core-common"), {
      name: "@simplysm/core-common",
    });

    const result = collectDeps(
      path.join(tmpDir, "packages", "server"),
      tmpDir,
      { "@simplysm/*": "../simplysm/packages/*" },
    );
    expect(result.replaceDeps).toContain("@simplysm/solid");
    expect(result.replaceDeps).toContain("@simplysm/core-common");
  });

  it("순환 의존성에서 무한루프에 빠지지 않는다", () => {
    writePkgJson(tmpDir, { name: "@myapp/root" });
    writePkgJson(path.join(tmpDir, "packages", "server"), {
      name: "@myapp/server",
      dependencies: { "@myapp/a": "workspace:*" },
    });
    writePkgJson(path.join(tmpDir, "packages", "a"), {
      name: "@myapp/a",
      dependencies: { "@myapp/b": "workspace:*" },
    });
    writePkgJson(path.join(tmpDir, "packages", "b"), {
      name: "@myapp/b",
      dependencies: { "@myapp/a": "workspace:*" },
    });

    const result = collectDeps(
      path.join(tmpDir, "packages", "server"),
      tmpDir,
    );
    expect(result.workspaceDeps).toContain("a");
    expect(result.workspaceDeps).toContain("b");
  });

  it("replaceDeps exact 패턴도 매칭한다", () => {
    writePkgJson(tmpDir, { name: "@myapp/root" });
    writePkgJson(path.join(tmpDir, "packages", "server"), {
      name: "@myapp/server",
      dependencies: { "@other/lib": "^1.0.0" },
    });
    writePkgJson(path.join(tmpDir, "node_modules", "@other", "lib"), {
      name: "@other/lib",
    });

    const result = collectDeps(
      path.join(tmpDir, "packages", "server"),
      tmpDir,
      { "@other/lib": "../other-lib" },
    );
    expect(result.replaceDeps).toContain("@other/lib");
  });

  it("workspace도 replaceDeps도 아닌 외부 패키지는 무시한다", () => {
    writePkgJson(tmpDir, { name: "@myapp/root" });
    writePkgJson(path.join(tmpDir, "packages", "server"), {
      name: "@myapp/server",
      dependencies: { lodash: "^4.0.0", express: "^4.0.0" },
    });

    const result = collectDeps(
      path.join(tmpDir, "packages", "server"),
      tmpDir,
    );
    expect(result.workspaceDeps).toEqual([]);
    expect(result.replaceDeps).toEqual([]);
  });
});
```

**Step 2: 테스트 실패 확인**

Run: `pnpm vitest packages/sd-cli/tests/package-utils.spec.ts --run --project=node`
Expected: FAIL — `collectDeps is not a function`

**Step 3: `collectDeps` 구현**

`packages/sd-cli/src/utils/package-utils.ts`에 추가:

```typescript
/**
 * 의존성 수집 결과
 */
export interface DepsResult {
  /** workspace 패키지 디렉토리명 (예: ["core-common", "core-node"]) */
  workspaceDeps: string[];
  /** replaceDeps 매칭 패키지 전체 이름 (예: ["@simplysm/solid"]) */
  replaceDeps: string[];
}

/**
 * 패키지의 dependencies를 재귀 탐색하여 workspace 의존성과 replaceDeps 의존성을 분류한다.
 *
 * - workspace 의존성: cwd/packages/<name> 에 존재하는 같은 scope의 패키지
 * - replaceDeps 의존성: replaceDepsConfig 패턴에 매칭되는 패키지
 * - 그 외 외부 패키지는 무시
 *
 * @param pkgDir 탐색 시작 패키지 디렉토리
 * @param cwd workspace 루트 디렉토리
 * @param replaceDepsConfig sd.config.ts의 replaceDeps 설정
 */
export function collectDeps(
  pkgDir: string,
  cwd: string,
  replaceDepsConfig?: Record<string, string>,
): DepsResult {
  // 루트 package.json에서 workspace scope 추출
  const rootPkgJsonPath = path.join(cwd, "package.json");
  const rootPkgJson = JSON.parse(fs.readFileSync(rootPkgJsonPath, "utf-8")) as { name: string };
  const scopeMatch = rootPkgJson.name.match(/^(@[^/]+)\//);
  const workspaceScope = scopeMatch != null ? scopeMatch[1] : undefined;

  // replaceDeps 패턴을 정규식으로 변환
  const replaceDepsPatterns: Array<{ regex: RegExp; pattern: string }> = [];
  if (replaceDepsConfig != null) {
    for (const pattern of Object.keys(replaceDepsConfig)) {
      const regexStr = pattern
        .replace(/[.+]/g, (ch) => `\\${ch}`)
        .replace(/\*/g, "[^/]+");
      replaceDepsPatterns.push({ regex: new RegExp(`^${regexStr}$`), pattern });
    }
  }

  const workspaceDeps: string[] = [];
  const replaceDeps: string[] = [];
  const visited = new Set<string>();

  function traverse(dir: string): void {
    const pkgJsonPath = path.join(dir, "package.json");
    if (!fs.existsSync(pkgJsonPath)) return;

    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8")) as {
      dependencies?: Record<string, string>;
    };
    const deps = Object.keys(pkgJson.dependencies ?? {});

    for (const dep of deps) {
      if (visited.has(dep)) continue;
      visited.add(dep);

      // workspace 패키지 체크
      if (workspaceScope != null && dep.startsWith(workspaceScope + "/")) {
        const dirName = dep.slice(workspaceScope.length + 1);
        const depDir = path.join(cwd, "packages", dirName);
        if (fs.existsSync(path.join(depDir, "package.json"))) {
          workspaceDeps.push(dirName);
          traverse(depDir);
          continue;
        }
      }

      // replaceDeps 패턴 체크
      const matchedPattern = replaceDepsPatterns.find((p) => p.regex.test(dep));
      if (matchedPattern != null) {
        replaceDeps.push(dep);
        // replaceDeps 패키지의 dependencies도 재귀 탐색
        const depNodeModulesDir = path.join(cwd, "node_modules", ...dep.split("/"));
        if (fs.existsSync(path.join(depNodeModulesDir, "package.json"))) {
          traverse(depNodeModulesDir);
        }
        continue;
      }

      // 그 외 외부 패키지는 무시
    }
  }

  traverse(pkgDir);
  return { workspaceDeps, replaceDeps };
}
```

**Step 4: 테스트 통과 확인**

Run: `pnpm vitest packages/sd-cli/tests/package-utils.spec.ts --run --project=node`
Expected: PASS

**Step 5: `getWatchScopes` 및 관련 테스트 제거**

`packages/sd-cli/src/utils/package-utils.ts`:
- `getWatchScopes` 함수 전체 삭제 (line 18-44)

`packages/sd-cli/tests/package-utils.spec.ts`:
- `getWatchScopes` describe 블록 전체 삭제 (line 1-30)
- `getWatchScopes` import 삭제

**Step 6: 테스트 재확인**

Run: `pnpm vitest packages/sd-cli/tests/package-utils.spec.ts --run --project=node`
Expected: PASS

**Step 7: 커밋**

```bash
git add packages/sd-cli/src/utils/package-utils.ts packages/sd-cli/tests/package-utils.spec.ts
git commit -m "refactor(cli): replace getWatchScopes with collectDeps"
```

---

### Task 2: server.worker.ts — watchScopes를 collectDeps로 교체

**Files:**
- Modify: `packages/sd-cli/src/workers/server.worker.ts:57-70` (ServerWatchInfo)
- Modify: `packages/sd-cli/src/workers/server.worker.ts:478-501` (watch paths)

**Step 1: `ServerWatchInfo` 인터페이스 변경**

`packages/sd-cli/src/workers/server.worker.ts`:
- `watchScopes?: string[]` 제거 (line 69)
- `replaceDeps?: Record<string, string>` 추가

변경 후:
```typescript
export interface ServerWatchInfo {
  name: string;
  cwd: string;
  pkgDir: string;
  env?: Record<string, string>;
  configs?: Record<string, unknown>;
  externals?: string[];
  /** sd.config.ts의 replaceDeps 설정 */
  replaceDeps?: Record<string, string>;
}
```

**Step 2: import 추가 및 watch path 로직 교체**

`packages/sd-cli/src/workers/server.worker.ts` 상단 import에 추가:
```typescript
import { collectDeps } from "../utils/package-utils";
```

`startWatch` 함수 내 watch path 조립 (line 478-501) 전면 교체:

```typescript
    // 의존성 기반 감시 경로 수집
    const { workspaceDeps, replaceDeps } = collectDeps(
      info.pkgDir,
      info.cwd,
      info.replaceDeps,
    );

    const watchPaths: string[] = [];

    // 1) 서버 패키지 자신 + workspace 의존 패키지 소스
    const watchDirs = [
      info.pkgDir,
      ...workspaceDeps.map((d) => path.join(info.cwd, "packages", d)),
    ];
    for (const dir of watchDirs) {
      watchPaths.push(path.join(dir, "src", "**", "*"));
      watchPaths.push(path.join(dir, "*.{ts,js,css}"));
    }

    // 2) replaceDeps 의존 패키지 dist (루트 + 패키지 node_modules)
    for (const pkg of replaceDeps) {
      watchPaths.push(path.join(info.cwd, "node_modules", ...pkg.split("/"), "dist", "**", "*.js"));
      watchPaths.push(path.join(info.pkgDir, "node_modules", ...pkg.split("/"), "dist", "**", "*.js"));
    }
```

**Step 3: 타입 체크**

Run: `pnpm typecheck packages/sd-cli`
Expected: 에러 발생 (DevOrchestrator에서 아직 watchScopes를 전달하므로). 다음 Task에서 수정.

**Step 4: 커밋**

```bash
git add packages/sd-cli/src/workers/server.worker.ts
git commit -m "refactor(cli): use collectDeps in server worker watch paths"
```

---

### Task 3: Vite 플러그인 — watchScopes를 replaceDeps 기반으로 교체

**Files:**
- Modify: `packages/sd-cli/src/utils/vite-config.ts:20` (sdTailwindConfigDepsPlugin)
- Modify: `packages/sd-cli/src/utils/vite-config.ts:136` (sdScopeWatchPlugin)
- Modify: `packages/sd-cli/src/utils/vite-config.ts:268-281` (ViteConfigOptions)
- Modify: `packages/sd-cli/src/utils/vite-config.ts:290-331` (createViteConfig)
- Modify: `packages/sd-cli/src/utils/tailwind-config-deps.ts:53` (getTailwindConfigDeps)

**Step 1: `sdScopeWatchPlugin` — scopes를 replaceDeps로 교체**

시그니처 변경:
```typescript
function sdScopeWatchPlugin(pkgDir: string, replaceDeps: string[], onScopeRebuild?: () => void): Plugin {
```

`config()` 내부: scope 디렉토리를 readdirSync하는 대신 replaceDeps 배열을 직접 사용:
```typescript
    config() {
      const excluded: string[] = [];
      const nestedDepsToInclude: string[] = [];

      for (const pkg of replaceDeps) {
        excluded.push(pkg);

        const pkgParts = pkg.split("/");
        const depPkgJsonPath = path.join(pkgDir, "node_modules", ...pkgParts, "package.json");
        try {
          const depPkgJson = JSON.parse(fs.readFileSync(depPkgJsonPath, "utf-8")) as {
            dependencies?: Record<string, string>;
          };
          for (const dep of Object.keys(depPkgJson.dependencies ?? {})) {
            // replaceDeps 패키지는 이미 excluded이므로 제외
            if (replaceDeps.includes(dep)) continue;
            // SolidJS 관련 패키지
            if (dep === "solid-js" || dep.startsWith("@solidjs/") || dep.startsWith("solid-"))
              continue;
            if (dep === "tailwindcss") continue;

            // subpath-only 패키지 필터링
            const realPkgPath = fs.realpathSync(path.join(pkgDir, "node_modules", ...pkgParts));
            const pnpmNodeModules = path.resolve(realPkgPath, "../..");
            const depPkgJsonResolved = path.join(pnpmNodeModules, dep, "package.json");
            if (isSubpathOnlyPackage(depPkgJsonResolved)) continue;

            const depPkgJsonFallback = path.join(
              pkgDir, "node_modules", ...pkgParts, "node_modules", dep, "package.json",
            );
            if (isSubpathOnlyPackage(depPkgJsonFallback)) continue;

            nestedDepsToInclude.push(`${pkg} > ${dep}`);
          }
        } catch {
          // package.json 읽기 실패 시 스킵
        }
      }

      return {
        optimizeDeps: {
          force: true,
          exclude: excluded,
          include: [...new Set(nestedDepsToInclude)],
        },
      };
    },
```

`configureServer()` 내부: scope 순회 대신 replaceDeps 패키지 직접 사용:
```typescript
    async configureServer(server) {
      const watchPaths: string[] = [];

      for (const pkg of replaceDeps) {
        const pkgParts = pkg.split("/");
        const pkgRoot = path.join(pkgDir, "node_modules", ...pkgParts);
        if (!fs.existsSync(pkgRoot)) continue;

        const distDir = path.join(pkgRoot, "dist");
        if (fs.existsSync(distDir)) {
          watchPaths.push(distDir);
        }

        for (const file of fs.readdirSync(pkgRoot)) {
          if (
            file.endsWith(".css") ||
            file === "tailwind.config.ts" ||
            file === "tailwind.config.js"
          ) {
            watchPaths.push(path.join(pkgRoot, file));
          }
        }
      }

      // ... 나머지 watcher 로직은 동일
    },
```

**Step 2: `sdTailwindConfigDepsPlugin` — scopes를 replaceDeps로 교체**

시그니처 변경:
```typescript
function sdTailwindConfigDepsPlugin(pkgDir: string, replaceDeps: string[]): Plugin {
```

내부에서 `getTailwindConfigDeps`에 전달:
```typescript
const allDeps = getTailwindConfigDeps(configPath, replaceDeps);
```

**Step 3: `getTailwindConfigDeps` — scopes를 replaceDeps로 교체**

`packages/sd-cli/src/utils/tailwind-config-deps.ts:53` 변경:
```typescript
export function getTailwindConfigDeps(configPath: string, replaceDeps: string[]): string[] {
  const scopePrefixes = replaceDeps.map((dep) => {
    const parts = dep.split("/");
    return parts.length >= 2 && dep.startsWith("@") ? `${parts[0]}/` : `${dep}/`;
  });
  // 중복 제거
  const uniquePrefixes = [...new Set(scopePrefixes)];
```

실제로 이 함수는 import specifier가 scope prefix로 시작하는지 체크하므로, replaceDeps 패키지명에서 scope prefix를 추출하는 게 맞다. 하지만 더 정확하게는 replaceDeps 패키지명과 직접 매칭:

```typescript
export function getTailwindConfigDeps(configPath: string, replaceDeps: string[]): string[] {
  const seen = new Set<string>();

  function isReplaceDepImport(specifier: string): boolean {
    return replaceDeps.some((dep) => specifier === dep || specifier.startsWith(dep + "/"));
  }

  function walk(absoluteFile: string): void {
    if (seen.has(absoluteFile)) return;
    if (!fs.existsSync(absoluteFile)) return;
    seen.add(absoluteFile);

    const base = path.dirname(absoluteFile);
    const ext = path.extname(absoluteFile);
    const extensions = jsExtensions.includes(ext) ? jsResolutionOrder : tsResolutionOrder;

    let contents: string;
    try {
      contents = fs.readFileSync(absoluteFile, "utf-8");
    } catch {
      return;
    }

    for (const match of [
      ...contents.matchAll(/import[\s\S]*?['"](.{3,}?)['"]/gi),
      ...contents.matchAll(/import[\s\S]*from[\s\S]*?['"](.{3,}?)['"]/gi),
      ...contents.matchAll(/require\(['"`](.+)['"`]\)/gi),
    ]) {
      const specifier = match[1];
      let resolved: string | null = null;

      if (specifier.startsWith(".")) {
        resolved = resolveWithExtension(path.resolve(base, specifier), extensions);
      } else if (isReplaceDepImport(specifier)) {
        resolved = resolvePackageFile(specifier, base);
      }

      if (resolved != null) {
        walk(resolved);
      }
    }
  }

  walk(path.resolve(configPath));
  return [...seen];
}
```

**Step 4: `ViteConfigOptions` 인터페이스 변경**

```typescript
export interface ViteConfigOptions {
  pkgDir: string;
  name: string;
  tsconfigPath: string;
  compilerOptions: Record<string, unknown>;
  env?: Record<string, string>;
  mode: "build" | "dev";
  serverPort?: number;
  /** replaceDeps 패키지명 배열 (resolve 완료된 상태) */
  replaceDeps?: string[];
  /** replaceDeps 패키지 dist 변경 감지 시 콜백 */
  onScopeRebuild?: () => void;
}
```

**Step 5: `createViteConfig` 내부 변경**

```typescript
export function createViteConfig(options: ViteConfigOptions): ViteUserConfig {
  const { pkgDir, name, tsconfigPath, compilerOptions, env, mode, serverPort, replaceDeps } =
    options;
  // ... (중간 로직 동일)

  plugins: [
    // ...
    ...(replaceDeps != null && replaceDeps.length > 0
      ? [sdTailwindConfigDepsPlugin(pkgDir, replaceDeps)]
      : []),
    ...(replaceDeps != null && replaceDeps.length > 0
      ? [sdScopeWatchPlugin(pkgDir, replaceDeps, options.onScopeRebuild)]
      : []),
    // ...
  ],
```

**Step 6: 커밋**

```bash
git add packages/sd-cli/src/utils/vite-config.ts packages/sd-cli/src/utils/tailwind-config-deps.ts
git commit -m "refactor(cli): replace watchScopes with replaceDeps in Vite plugins"
```

---

### Task 4: client.worker.ts — watchScopes를 collectDeps로 교체

**Files:**
- Modify: `packages/sd-cli/src/workers/client.worker.ts:34-41` (ClientWatchInfo)
- Modify: `packages/sd-cli/src/workers/client.worker.ts:180-191` (startWatch)

**Step 1: `ClientWatchInfo` 인터페이스 변경**

```typescript
export interface ClientWatchInfo {
  name: string;
  config: SdClientPackageConfig;
  cwd: string;
  pkgDir: string;
  /** sd.config.ts의 replaceDeps 설정 */
  replaceDeps?: Record<string, string>;
}
```

**Step 2: startWatch에서 collectDeps 호출 및 Vite config에 전달**

import 추가:
```typescript
import { collectDeps } from "../utils/package-utils";
```

startWatch 내부 (line 180-191):
```typescript
    // 의존성 기반 replaceDeps 수집
    const { replaceDeps } = collectDeps(info.pkgDir, info.cwd, info.replaceDeps);

    // Vite 설정 생성
    const viteConfig = createViteConfig({
      pkgDir: info.pkgDir,
      name: info.name,
      tsconfigPath,
      compilerOptions,
      env: info.config.env,
      mode: "dev",
      serverPort,
      replaceDeps,
      onScopeRebuild: () => sender.send("scopeRebuild", {}),
    });
```

**Step 3: 커밋**

```bash
git add packages/sd-cli/src/workers/client.worker.ts
git commit -m "refactor(cli): use collectDeps in client worker"
```

---

### Task 5: DevOrchestrator — watchScopes 인프라 제거

**Files:**
- Modify: `packages/sd-cli/src/orchestrators/DevOrchestrator.ts`

**Step 1: import에서 getWatchScopes 제거**

line 15-17:
```typescript
import {
  filterPackagesByTargets,
  type PackageResult,
} from "../utils/package-utils";
```

(`getWatchScopes` 제거)

**Step 2: 멤버 변수 제거**

line 73 `private _watchScopes: string[] = [];` 삭제

**Step 3: initialize()에서 watchScopes 계산 로직 제거**

line 156-159 전체 삭제:
```typescript
    // watchScopes 생성 (루트 package.json에서 scope 추출)
    const rootPkgJsonPath = path.join(this._cwd, "package.json");
    const rootPkgName = JSON.parse(fs.readFileSync(rootPkgJsonPath, "utf-8")).name as string;
    this._watchScopes = getWatchScopes(rootPkgName, this._sdConfig.replaceDeps);
```

**Step 4: worker에 watchScopes 전달하던 부분을 replaceDeps로 교체**

standalone client (line 589):
```typescript
          watchScopes: this._watchScopes,
```
→
```typescript
          replaceDeps: this._sdConfig!.replaceDeps,
```

vite client (line 618):
```typescript
          watchScopes: this._watchScopes,
```
→
```typescript
          replaceDeps: this._sdConfig!.replaceDeps,
```

server build (line 640):
```typescript
          watchScopes: this._watchScopes,
```
→
```typescript
          replaceDeps: this._sdConfig!.replaceDeps,
```

**Step 5: 타입 체크**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 6: 커밋**

```bash
git add packages/sd-cli/src/orchestrators/DevOrchestrator.ts
git commit -m "refactor(cli): remove watchScopes from DevOrchestrator"
```

---

### Task 6: 최종 검증

**Step 1: 전체 typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 2: 전체 lint**

Run: `pnpm lint packages/sd-cli`
Expected: PASS (또는 기존 warning만)

**Step 3: 전체 테스트**

Run: `pnpm vitest packages/sd-cli --run --project=node`
Expected: PASS

**Step 4: watchScopes 잔재 확인**

Run: `grep -r "watchScopes\|getWatchScopes" packages/sd-cli/src/`
Expected: 결과 없음 (README.md 제외)

**Step 5: 커밋 (필요 시)**

README.md에서 watchScopes 관련 내용이 있으면 업데이트 후 커밋.
