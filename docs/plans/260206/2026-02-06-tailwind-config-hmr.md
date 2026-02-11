# Tailwind Config HMR Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** dev 모드에서 `@simplysm/` 및 같은 scope의 패키지 tailwind config 변경 시 HMR이 동작하도록 한다.

**Architecture:** Tailwind의 `getModuleDependencies`가 비-상대 경로를 무시하는 문제를 보완하는 유틸리티 함수를 만들어 Vite 플러그인에서 활용한다. 유틸리티 함수는 import를 재귀 파싱하되, 지정된 scope 패키지도 `node_modules` → `realpathSync`로 resolve하여 추적한다. Vite 플러그인은 이 의존성을 watch하고, 변경 시 config touch + full-reload를 트리거한다.

**Tech Stack:** Vite 7.3.1 Plugin API, Node.js `fs`/`path`, Vitest

---

### Task 1: 의존성 추적 유틸리티 함수 — 테스트 작성

**Files:**

- Create: `packages/cli/tests/tailwind-config-deps.spec.ts`

**Step 1: 테스트 파일 작성**

```typescript
import { describe, expect, it } from "vitest";
import path from "path";
import { getTailwindConfigDeps } from "../src/utils/tailwind-config-deps";

const packagesDir = path.resolve(import.meta.dirname, "../..");

describe("getTailwindConfigDeps", () => {
  it("solid-demo tailwind config의 의존성에 solid tailwind config가 포함되어야 함", () => {
    const configPath = path.join(packagesDir, "solid-demo/tailwind.config.ts");
    const deps = getTailwindConfigDeps(configPath, ["@simplysm"]);

    const solidConfig = path.join(packagesDir, "solid/tailwind.config.ts");
    expect(deps).toContain(solidConfig);
  });

  it("config 자신도 의존성에 포함되어야 함", () => {
    const configPath = path.join(packagesDir, "solid-demo/tailwind.config.ts");
    const deps = getTailwindConfigDeps(configPath, ["@simplysm"]);

    expect(deps).toContain(path.resolve(configPath));
  });

  it("@simplysm/ 이외의 패키지(tailwindcss/colors 등)는 포함하지 않아야 함", () => {
    const configPath = path.join(packagesDir, "solid/tailwind.config.ts");
    const deps = getTailwindConfigDeps(configPath, ["@simplysm"]);

    // solid/tailwind.config.ts는 tailwindcss/colors를 import하지만 추적하지 않음
    expect(deps).toHaveLength(1); // 자기 자신만
  });
});
```

**Step 2: 테스트 실행 → 실패 확인**

Run: `pnpm vitest packages/cli/tests/tailwind-config-deps.spec.ts --project=node --run`
Expected: FAIL — 모듈을 찾을 수 없음

---

### Task 2: 의존성 추적 유틸리티 함수 — 구현

**Files:**

- Create: `packages/cli/src/utils/tailwind-config-deps.ts`

**Step 1: 유틸리티 함수 구현**

```typescript
import fs from "fs";
import path from "path";

const jsExtensions = [".js", ".cjs", ".mjs"];

const jsResolutionOrder = ["", ".js", ".cjs", ".mjs", ".ts", ".cts", ".mts", ".jsx", ".tsx"];
const tsResolutionOrder = ["", ".ts", ".cts", ".mts", ".tsx", ".js", ".cjs", ".mjs", ".jsx"];

function resolveWithExtension(file: string, extensions: string[]): string | null {
  for (const ext of extensions) {
    const full = `${file}${ext}`;
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      return full;
    }
  }
  for (const ext of extensions) {
    const full = `${file}/index${ext}`;
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      return full;
    }
  }
  return null;
}

function resolvePackageFile(specifier: string, fromDir: string): string | null {
  const parts = specifier.split("/");
  const pkgName = specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
  const subPath = specifier.startsWith("@") ? parts.slice(2).join("/") : parts.slice(1).join("/");

  let searchDir = fromDir;
  while (true) {
    const candidate = path.join(searchDir, "node_modules", pkgName);
    if (fs.existsSync(candidate)) {
      const realDir = fs.realpathSync(candidate);
      if (subPath) {
        return resolveWithExtension(path.join(realDir, subPath), tsResolutionOrder);
      }
      return resolveWithExtension(path.join(realDir, "index"), tsResolutionOrder);
    }
    const parent = path.dirname(searchDir);
    if (parent === searchDir) break;
    searchDir = parent;
  }
  return null;
}

/**
 * Tailwind config 파일의 의존성을 재귀적으로 수집한다.
 *
 * Tailwind 내장 `getModuleDependencies`는 상대 경로 import만 추적하지만,
 * 이 함수는 지정된 scope의 패키지 경로도 `node_modules` symlink를 풀어 실제 파일을 추적한다.
 */
export function getTailwindConfigDeps(configPath: string, scopes: string[]): string[] {
  const scopePrefixes = scopes.map((s) => (s.endsWith("/") ? s : s + "/"));
  const seen = new Set<string>();

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
      } else if (scopePrefixes.some((p) => specifier.startsWith(p))) {
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

**Step 2: 테스트 실행 → 통과 확인**

Run: `pnpm vitest packages/cli/tests/tailwind-config-deps.spec.ts --project=node --run`
Expected: PASS (3개 테스트 모두 통과)

**Step 3: 커밋**

```bash
git add packages/cli/src/utils/tailwind-config-deps.ts packages/cli/tests/tailwind-config-deps.spec.ts
git commit -m "feat(cli): tailwind config 의존성 재귀 추적 유틸리티 추가"
```

---

### Task 3: Vite 플러그인 적용

**Files:**

- Modify: `packages/cli/src/utils/vite-config.ts`

**Step 1: import 추가**

파일 상단 기존 import 뒤에 추가:

```typescript
import fs from "fs";
import type { Plugin } from "vite";
import { getTailwindConfigDeps } from "./tailwind-config-deps.js";
```

**Step 2: 플러그인 함수 추가**

`createViteConfig` 함수 앞에 추가:

```typescript
/**
 * Tailwind config의 scope 패키지 의존성을 watch하는 Vite 플러그인.
 *
 * Tailwind CSS의 내장 의존성 추적은 상대 경로 import만 처리하므로,
 * preset 등으로 참조하는 scope 패키지의 config 변경을 감지하지 못한다.
 * 이 플러그인이 해당 파일들을 watch하고, 변경 시 Tailwind 캐시를 무효화한다.
 */
function sdTailwindConfigDepsPlugin(pkgDir: string): Plugin {
  return {
    name: "sd-tailwind-config-deps",
    configureServer(server) {
      const configPath = path.join(pkgDir, "tailwind.config.ts");
      if (!fs.existsSync(configPath)) return;

      // 현재 패키지의 scope + @simplysm 을 항상 포함
      const pkgJsonPath = path.join(pkgDir, "package.json");
      const pkgName = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8")).name as string;
      const pkgScope = pkgName.match(/^(@[^/]+)\//)?.[1];
      const scopes = new Set(["@simplysm"]);
      if (pkgScope != null) {
        scopes.add(pkgScope);
      }

      const allDeps = getTailwindConfigDeps(configPath, [...scopes]);
      const configAbsolute = path.resolve(configPath);
      const externalDeps = allDeps.filter((d) => d !== configAbsolute);
      if (externalDeps.length === 0) return;

      for (const dep of externalDeps) {
        server.watcher.add(dep);
      }

      server.watcher.on("change", (changed) => {
        if (externalDeps.some((d) => path.normalize(d) === path.normalize(changed))) {
          // Tailwind 캐시 무효화: config의 mtime을 갱신하여 재로드 유도
          const now = new Date();
          fs.utimesSync(configPath, now, now);
          server.ws.send({ type: "full-reload" });
        }
      });
    },
  };
}
```

**Step 3: plugins 배열에 추가**

`createViteConfig` 함수 내부, `solidPlugin()` 뒤에 추가:

```typescript
plugins: [
  tsconfigPaths({ projects: [tsconfigPath] }),
  solidPlugin(),
  sdTailwindConfigDepsPlugin(pkgDir),
],
```

**Step 4: 타입체크**

Run: `pnpm typecheck packages/cli`
Expected: PASS

**Step 5: 커밋**

```bash
git add packages/cli/src/utils/vite-config.ts
git commit -m "feat(cli): tailwind config workspace 의존성 HMR 지원"
```

---

### Task 4: 수동 검증

**Step 1: dev 서버 실행**

Run: `pnpm dev`
접속: `http://localhost:40081/solid-demo/`

**Step 2: solid tailwind config 변경 테스트**

`packages/solid/tailwind.config.ts`에서 `primary: colors.blue` → `primary: colors.indigo` 변경

Expected: 브라우저가 자동 reload되며 primary 색상이 변경됨

**Step 3: 변경 되돌리기**

`packages/solid/tailwind.config.ts` 원복
