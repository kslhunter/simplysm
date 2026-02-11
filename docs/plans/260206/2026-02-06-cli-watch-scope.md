# CLI Watch Scope 확장 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** dev/watch 모드에서 node*modules 안의 특정 scope 패키지(@myapp/*, @simplysm/\_) 파일 변경도 감지하여 리빌드한다.

**Architecture:** 루트 package.json에서 프로젝트 scope를 자동 추출하고, @simplysm을 하드코딩으로 추가한다. 이 watchScopes 배열을 Server(esbuild bundle:true)와 Client(Vite) worker에 전달하여 각 도구의 설정을 조정한다.

**Tech Stack:** esbuild (plugins: onResolve + watchFiles), Vite (optimizeDeps.exclude + server.watch)

---

## Task 1: watchScopes 추출 유틸리티 추가

**Files:**

- Modify: `packages/cli/src/utils/package-utils.ts`
- Test: `packages/cli/tests/package-utils.spec.ts`

**Step 1: 테스트 작성**

```typescript
// packages/cli/tests/package-utils.spec.ts
import { describe, it, expect } from "vitest";
import { getWatchScopes } from "../src/utils/package-utils";

describe("getWatchScopes", () => {
  it("scope가 있는 패키지명에서 scope를 추출한다", () => {
    const result = getWatchScopes("@myapp/root");
    expect(result).toContain("@myapp");
    expect(result).toContain("@simplysm");
  });

  it("scope가 없는 패키지명이면 @simplysm만 반환한다", () => {
    const result = getWatchScopes("simplysm");
    expect(result).toEqual(["@simplysm"]);
  });

  it("@simplysm scope 패키지면 중복 없이 반환한다", () => {
    const result = getWatchScopes("@simplysm/core-common");
    expect(result).toEqual(["@simplysm"]);
  });
});
```

**Step 2: 테스트 실패 확인**

Run: `pnpm vitest packages/cli/tests/package-utils.spec.ts --project=node --run`
Expected: FAIL - `getWatchScopes` 함수가 존재하지 않음

**Step 3: 구현**

`packages/cli/src/utils/package-utils.ts`에 추가:

```typescript
/**
 * 패키지명에서 watch scope 목록을 생성한다.
 * - 패키지명의 scope (예: "@myapp/root" → "@myapp")
 * - @simplysm (항상 포함)
 * @param packageName 루트 package.json의 name 필드
 * @returns scope 배열 (중복 제거)
 */
export function getWatchScopes(packageName: string): string[] {
  const scopes = new Set(["@simplysm"]);
  const match = packageName.match(/^(@[^/]+)\//);
  if (match != null) {
    scopes.add(match[1]);
  }
  return [...scopes];
}
```

**Step 4: 테스트 통과 확인**

Run: `pnpm vitest packages/cli/tests/package-utils.spec.ts --project=node --run`
Expected: PASS

**Step 5: 커밋**

```bash
git add packages/cli/src/utils/package-utils.ts packages/cli/tests/package-utils.spec.ts
git commit -m "feat(cli): watchScopes 추출 유틸리티 추가"
```

---

## Task 2: Server esbuild에 scope watch 플러그인 추가

**Files:**

- Modify: `packages/cli/src/utils/esbuild-config.ts` (ServerEsbuildOptions 타입 + 플러그인 팩토리)
- Modify: `packages/cli/src/workers/server.worker.ts` (watchScopes 전달)

**Step 1: esbuild-config.ts에 watchScopes 옵션 및 플러그인 팩토리 추가**

`ServerEsbuildOptions`에 `watchScopes` 필드 추가:

```typescript
export interface ServerEsbuildOptions {
  pkgDir: string;
  entryPoints: string[];
  compilerOptions: Record<string, unknown>;
  env?: Record<string, string>;
  /** watch 대상 scope 목록 (예: ["@myapp", "@simplysm"]) */
  watchScopes?: string[];
}
```

`createServerEsbuildOptions()`의 반환값에 plugins 추가:

```typescript
import type esbuild from "esbuild";

/**
 * scope 패키지의 파일 변경을 감지하는 esbuild 플러그인.
 * onResolve에서 scope 패키지를 감지하고, 해석된 파일을 watchFiles에 추가한다.
 */
function createScopeWatchPlugin(scopes: string[]): esbuild.Plugin {
  const scopePrefixes = scopes.map((s) => (s.endsWith("/") ? s : s + "/"));
  // 모든 scope를 하나의 정규식으로 결합
  const escapedScopes = scopes.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const filter = new RegExp(`^(${escapedScopes.join("|")})/`);

  return {
    name: "scope-watch",
    setup(build) {
      build.onResolve({ filter }, (args) => {
        return {
          path: args.path,
          external: true,
          watchFiles: args.resolveDir
            ? (() => {
                // node_modules에서 해당 패키지의 실제 경로를 찾아 watchFiles에 추가
                const parts = args.path.split("/");
                const pkgName = args.path.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
                const pkgDir = path.join(args.resolveDir, "node_modules", pkgName);
                try {
                  const realDir = fs.realpathSync(pkgDir);
                  const distDir = path.join(realDir, "dist");
                  if (fs.existsSync(distDir)) {
                    return [distDir];
                  }
                } catch {
                  // 패키지 디렉토리를 찾을 수 없으면 무시
                }
                return [];
              })()
            : [],
        };
      });
    },
  };
}
```

**주의**: 위 접근은 esbuild가 `external: true`인 모듈에서 `watchFiles`에 **디렉토리**를 추가하면 해당 디렉토리의 파일 변경을 감시합니다. 하지만 esbuild의 `watchFiles`/`watchDirs` 동작을 정확히 확인해야 합니다.

**대안 접근 (더 안정적)**: Server esbuild에서 `bundle: true`이면 이미 모든 import를 따라가므로, 문제는 esbuild가 node_modules 파일을 **캐싱**하여 변경을 무시하는 것입니다. 이 경우 esbuild의 `packages` 옵션을 사용할 수 있습니다:

```typescript
// createServerEsbuildOptions 반환값에 추가
// packages 옵션: "external"로 설정하면 node_modules를 번들에서 제외
// 하지만 우리는 bundle: true를 유지하면서 watch만 확장하고 싶음
```

**실제 검증 필요 사항**: esbuild `bundle: true` + watch 모드에서 node_modules 파일이 실제로 캐싱되어 변경 무시되는지 확인. esbuild 공식 문서에 따르면 watch 모드는 "빌드를 무효화할 수 있는 모든 파일"을 감시하므로, bundle: true에서는 node_modules도 이미 감시 대상일 수 있음.

**결론**: 이 Task는 실제로 esbuild bundle:true watch에서 node_modules 변경이 감지되지 않는 문제가 **실제로 발생하는지 먼저 검증**한 후 진행한다.

**Step 2: 검증 - esbuild bundle:true watch에서 node_modules 변경 감지 테스트**

실제 외부 프로젝트 환경에서 테스트하거나, simplysm 프로젝트 자체의 `solid-demo-server`로 테스트:

1. `pnpm dev solid-demo solid-demo-server` 실행
2. `node_modules/@simplysm/core-common/dist/` 파일 수동 변경
3. Server 빌더가 리빌드를 트리거하는지 확인

결과에 따라:

- **감지됨**: Server 쪽은 추가 작업 불필요
- **감지 안 됨**: 위의 플러그인 구현 진행

**Step 3: (감지 안 되는 경우만) ServerWatchInfo에 watchScopes 추가**

`server.worker.ts`의 `ServerWatchInfo` 인터페이스:

```typescript
export interface ServerWatchInfo {
  name: string;
  cwd: string;
  pkgDir: string;
  env?: Record<string, string>;
  /** watch 대상 scope 목록 */
  watchScopes?: string[];
}
```

`startWatch()` 함수에서 `createServerEsbuildOptions()`에 watchScopes 전달:

```typescript
const baseOptions = createServerEsbuildOptions({
  pkgDir: info.pkgDir,
  entryPoints,
  compilerOptions,
  env: info.env,
  watchScopes: info.watchScopes,
});
```

**Step 4: (감지 안 되는 경우만) dev.ts에서 watchScopes 전달**

`dev.ts`의 Server Build 워커 시작 부분에서:

```typescript
serverBuild.worker.startWatch({
  name,
  cwd,
  pkgDir,
  env: { ...baseEnv, ...config.env },
  watchScopes, // ← 추가
});
```

**Step 5: 커밋**

```bash
git add packages/cli/src/utils/esbuild-config.ts packages/cli/src/workers/server.worker.ts packages/cli/src/commands/dev.ts
git commit -m "feat(cli): Server esbuild watch에 scope 패키지 변경 감지 추가"
```

---

## Task 3: Client Vite에 scope watch 설정 추가

**Files:**

- Modify: `packages/cli/src/utils/vite-config.ts` (ViteConfigOptions + optimizeDeps/server.watch 설정)
- Modify: `packages/cli/src/workers/client.worker.ts` (watchScopes 전달)

**Step 1: ViteConfigOptions에 watchScopes 추가**

```typescript
export interface ViteConfigOptions {
  pkgDir: string;
  name: string;
  tsconfigPath: string;
  compilerOptions: Record<string, unknown>;
  env?: Record<string, string>;
  mode: "build" | "dev";
  serverPort?: number;
  /** watch 대상 scope 목록 (예: ["@myapp", "@simplysm"]) */
  watchScopes?: string[];
}
```

**Step 2: createViteConfig()에 optimizeDeps.exclude 및 server.watch 설정 추가**

dev 모드 분기에서:

```typescript
if (mode === "build") {
  config.logLevel = "silent";
} else {
  config.define = envDefine;
  config.server = {
    port: serverPort === 0 ? undefined : serverPort,
    strictPort: serverPort !== 0 && serverPort !== undefined,
  };

  // watchScopes에 해당하는 패키지를 watch 대상에 포함
  if (watchScopes != null && watchScopes.length > 0) {
    // scope 패키지를 pre-bundling에서 제외하여 소스 코드로 취급
    // (pre-bundled 패키지는 변경 감지 불가)
    config.optimizeDeps = {
      exclude: watchScopes.map((s) => `${s}/*`), // 와일드카드 지원 확인 필요
    };

    // node_modules 중 scope 패키지는 watch에서 제외하지 않음
    // Vite 기본값: node_modules 전체를 ignored에 포함
    // → scope 패키지만 제외하는 커스텀 ignored 함수 사용
    const scopePrefixes = watchScopes.map((s) => `node_modules/${s}/`);
    config.server.watch = {
      ignored: (filePath: string) => {
        // scope 패키지는 무시하지 않음
        if (scopePrefixes.some((prefix) => filePath.includes(prefix))) {
          return false;
        }
        // 나머지 node_modules는 무시
        return filePath.includes("node_modules/");
      },
    };
  }
}
```

**주의**: Vite의 `server.watch.ignored`는 chokidar의 `ignored` 옵션을 그대로 전달합니다. 문자열/정규식/함수 모두 사용 가능합니다. 단, Vite가 `node_modules`를 자동으로 추가하는 기본 동작과 충돌할 수 있으므로 실제 테스트 필요.

**대안**: `server.watch.ignored`를 `anymatch` 호환 패턴으로 설정:

```typescript
config.server.watch = {
  ignored: ["**/node_modules/!(" + watchScopes.join("|") + ")/**", "**/.git/**"],
};
```

**Step 3: ClientWatchInfo에 watchScopes 추가**

`client.worker.ts`:

```typescript
export interface ClientWatchInfo {
  name: string;
  config: SdClientPackageConfig;
  cwd: string;
  pkgDir: string;
  /** watch 대상 scope 목록 */
  watchScopes?: string[];
}
```

`startWatch()` 함수에서 `createViteConfig()`에 watchScopes 전달:

```typescript
const viteConfig = createViteConfig({
  pkgDir: info.pkgDir,
  name: info.name,
  tsconfigPath,
  compilerOptions,
  env: info.config.env,
  mode: "dev",
  serverPort,
  watchScopes: info.watchScopes,
});
```

**Step 4: 커밋**

```bash
git add packages/cli/src/utils/vite-config.ts packages/cli/src/workers/client.worker.ts
git commit -m "feat(cli): Client Vite에 scope 패키지 변경 감지 추가"
```

---

## Task 4: dev.ts에서 watchScopes 생성 및 Worker에 전달

**Files:**

- Modify: `packages/cli/src/commands/dev.ts`

**Step 1: watchScopes 생성 로직 추가**

`runDev()` 함수 상단 (sd.config.ts 로드 후)에:

```typescript
import { getWatchScopes } from "../utils/package-utils";
import fs from "fs";

// ...sd.config.ts 로드 후...

// watchScopes 생성 (루트 package.json에서 scope 추출)
const rootPkgJsonPath = path.join(cwd, "package.json");
const rootPkgName = JSON.parse(fs.readFileSync(rootPkgJsonPath, "utf-8")).name as string;
const watchScopes = getWatchScopes(rootPkgName);
```

**Step 2: Client worker.startWatch() 호출에 watchScopes 전달**

Standalone client와 Vite client 모두에서:

```typescript
workerInfo.worker.startWatch({
  name: workerInfo.name,
  config: clientConfig,
  cwd,
  pkgDir,
  watchScopes, // ← 추가
});
```

**Step 3: Server worker.startWatch() 호출에 watchScopes 전달**

```typescript
serverBuild.worker.startWatch({
  name,
  cwd,
  pkgDir,
  env: { ...baseEnv, ...config.env },
  watchScopes, // ← 추가
});
```

**Step 4: 커밋**

```bash
git add packages/cli/src/commands/dev.ts
git commit -m "feat(cli): dev 명령에서 watchScopes 생성 및 Worker에 전달"
```

---

## Task 5: 통합 검증

**Step 1: 타입체크**

Run: `pnpm typecheck packages/cli`
Expected: 에러 없음

**Step 2: 린트**

Run: `pnpm lint packages/cli`
Expected: 에러 없음

**Step 3: 테스트**

Run: `pnpm vitest packages/cli --project=node --run`
Expected: 모든 테스트 통과

**Step 4: 수동 검증 (simplysm 프로젝트에서)**

1. `pnpm dev` 실행
2. Server 빌드 성공 확인
3. Client Vite dev server 시작 확인
4. `node_modules/@simplysm/core-common/dist/` 파일에 주석 추가 등 변경
5. Client/Server가 리빌드되는지 확인

**Step 5: 최종 커밋**

```bash
git add -A
git commit -m "feat(cli): dev/watch에서 scope 패키지 파일 변경 감지 지원"
```
