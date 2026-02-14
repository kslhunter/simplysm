# CLI Worker 구조 리팩토링 구현 계획서

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** CLI 패키지의 Worker 구조를 빌드 타입별(client/library/server)로 통일하여 일관성 확보 및 코드 중복 제거

**Architecture:** 기존 6개 Worker 파일을 4개로 통합. 각 Worker는 `build()` (일회성) + `startWatch()` (watch 모드) 인터페이스를 제공. Vite/esbuild 설정은 별도 유틸 모듈로 추출.

**Tech Stack:** TypeScript, esbuild, Vite, TypeScript Compiler API, @simplysm/core-node Worker

---

## Phase 1: 공통 설정 모듈 추출

### Task 1: esbuild-config.ts 생성

**Files:**

- Create: `packages/cli/src/utils/esbuild-config.ts`
- Reference: `packages/cli/src/workers/build.worker.ts`
- Reference: `packages/cli/src/workers/watch.worker.ts`
- Reference: `packages/cli/src/workers/server-build.worker.ts`

**Step 1: 기존 esbuild 설정 패턴 분석**

기존 코드에서 공통 esbuild 옵션 파악:

- `build.worker.ts`: library 일회성 빌드 (bundle: false)
- `watch.worker.ts`: library watch 모드 (bundle: false)
- `server-build.worker.ts`: server watch 모드 (bundle: true, packages: "external")

**Step 2: esbuild-config.ts 파일 생성**

```typescript
// packages/cli/src/utils/esbuild-config.ts
import path from "path";
import type esbuild from "esbuild";
import type { TypecheckEnv } from "./tsconfig";

/**
 * Library 빌드용 esbuild 설정 (bundle: false)
 */
export interface LibraryEsbuildOptions {
  pkgDir: string;
  entryPoints: string[];
  target: "node" | "browser";
  compilerOptions: Record<string, unknown>;
}

/**
 * Server 빌드용 esbuild 설정 (bundle: true, packages: external)
 */
export interface ServerEsbuildOptions {
  pkgDir: string;
  entryPoints: string[];
  compilerOptions: Record<string, unknown>;
  env?: Record<string, string>;
}

/**
 * Library용 esbuild 설정 생성
 * - bundle: false (개별 파일 트랜스파일)
 * - platform: target에 따라 node 또는 browser
 */
export function createLibraryEsbuildOptions(options: LibraryEsbuildOptions): esbuild.BuildOptions {
  return {
    entryPoints: options.entryPoints,
    outdir: path.join(options.pkgDir, "dist"),
    format: "esm",
    sourcemap: true,
    platform: options.target === "node" ? "node" : "browser",
    target: options.target === "node" ? "node20" : "chrome84",
    bundle: false,
    tsconfigRaw: { compilerOptions: options.compilerOptions as esbuild.TsconfigRaw["compilerOptions"] },
  };
}

/**
 * Server용 esbuild 설정 생성
 * - bundle: true (단일 번들)
 * - packages: external (외부 패키지는 번들에서 제외)
 * - env를 define으로 치환
 */
export function createServerEsbuildOptions(options: ServerEsbuildOptions): esbuild.BuildOptions {
  const define: Record<string, string> = {};
  if (options.env != null) {
    for (const [key, value] of Object.entries(options.env)) {
      define[`process.env["${key}"]`] = JSON.stringify(value);
    }
  }

  return {
    entryPoints: options.entryPoints,
    outdir: path.join(options.pkgDir, "dist"),
    format: "esm",
    sourcemap: true,
    platform: "node",
    target: "node20",
    bundle: true,
    packages: "external",
    define,
    tsconfigRaw: { compilerOptions: options.compilerOptions as esbuild.TsconfigRaw["compilerOptions"] },
  };
}

/**
 * 타겟에서 TypecheckEnv 추출
 */
export function getTypecheckEnvFromTarget(target: "node" | "browser" | "neutral"): TypecheckEnv {
  return target === "node" ? "node" : "browser";
}
```

**Step 3: 린트 검증**

Run: `pnpm lint packages/cli/src/utils/esbuild-config.ts`
Expected: 에러 없음

**Step 4: 커밋**

```bash
git add packages/cli/src/utils/esbuild-config.ts
git commit -m "$(cat <<'EOF'
feat(cli): add esbuild-config utility module

Extract common esbuild configuration patterns into reusable functions.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: vite-config.ts 생성

**Files:**

- Create: `packages/cli/src/utils/vite-config.ts`
- Reference: `packages/cli/src/commands/build.ts:286-303`
- Reference: `packages/cli/src/workers/watch.worker.ts:213-233`

**Step 1: vite-config.ts 파일 생성**

```typescript
// packages/cli/src/utils/vite-config.ts
import path from "path";
import type { UserConfig as ViteUserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import solidPlugin from "vite-plugin-solid";
import tailwindcss from "tailwindcss";
import type esbuild from "esbuild";

/**
 * Vite 설정 생성 옵션
 */
export interface ViteConfigOptions {
  pkgDir: string;
  name: string;
  tsconfigPath: string;
  compilerOptions: Record<string, unknown>;
  env?: Record<string, string>;
  mode: "build" | "dev";
  /** dev 모드일 때 서버 포트 (0이면 자동 할당) */
  serverPort?: number;
}

/**
 * Vite 설정 생성
 * - SolidJS + TailwindCSS + tsconfig paths 플러그인
 * - build 모드: production 빌드
 * - dev 모드: dev server
 */
export function createViteConfig(options: ViteConfigOptions): ViteUserConfig {
  const { pkgDir, name, tsconfigPath, compilerOptions, env, mode, serverPort } = options;

  // process.env 치환 (dev 모드에서만 사용, build 모드는 inline으로 처리됨)
  const envDefine: Record<string, string> = {};
  if (env != null) {
    envDefine["process.env"] = JSON.stringify(env);
  }

  const config: ViteUserConfig = {
    root: pkgDir,
    base: `/${name}/`,
    plugins: [tsconfigPaths({ projects: [tsconfigPath] }), solidPlugin()],
    css: {
      postcss: {
        plugins: [tailwindcss({ config: path.join(pkgDir, "tailwind.config.ts") })],
      },
    },
    esbuild: {
      tsconfigRaw: { compilerOptions: compilerOptions as esbuild.TsconfigRaw["compilerOptions"] },
    },
  };

  if (mode === "build") {
    config.logLevel = "silent";
  } else {
    // dev 모드
    config.define = envDefine;
    config.server = {
      port: serverPort === 0 ? undefined : serverPort,
      strictPort: serverPort !== 0 && serverPort !== undefined,
    };
  }

  return config;
}
```

**Step 2: 린트 검증**

Run: `pnpm lint packages/cli/src/utils/vite-config.ts`
Expected: 에러 없음

**Step 3: 커밋**

```bash
git add packages/cli/src/utils/vite-config.ts
git commit -m "$(cat <<'EOF'
feat(cli): add vite-config utility module

Extract common Vite configuration for SolidJS + TailwindCSS apps.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2: 새 Worker 파일 생성

### Task 3: library.worker.ts 생성

**Files:**

- Create: `packages/cli/src/workers/library.worker.ts`
- Reference: `packages/cli/src/workers/build.worker.ts`
- Reference: `packages/cli/src/workers/watch.worker.ts:125-181`
- Reference: `packages/cli/src/utils/esbuild-config.ts`

**Step 1: library.worker.ts 파일 생성**

```typescript
// packages/cli/src/workers/library.worker.ts
import path from "path";
import esbuild from "esbuild";
import { createWorker } from "@simplysm/core-node";
import { consola } from "consola";
import type { SdBuildPackageConfig } from "../sd-config.types";
import { parseRootTsconfig, getPackageSourceFiles, getCompilerOptionsForPackage } from "../utils/tsconfig";
import { createLibraryEsbuildOptions, getTypecheckEnvFromTarget } from "../utils/esbuild-config";

//#region Types

/**
 * Library 빌드 정보 (일회성 빌드)
 */
export interface LibraryBuildInfo {
  name: string;
  config: SdBuildPackageConfig;
  cwd: string;
  pkgDir: string;
}

/**
 * Library Watch 정보
 */
export interface LibraryWatchInfo {
  name: string;
  config: SdBuildPackageConfig;
  cwd: string;
  pkgDir: string;
}

/**
 * 빌드 결과
 */
export interface LibraryBuildResult {
  success: boolean;
  errors?: string[];
}

/**
 * 빌드 이벤트
 */
export interface LibraryBuildEvent {
  success: boolean;
  errors?: string[];
}

/**
 * 에러 이벤트
 */
export interface LibraryErrorEvent {
  message: string;
}

/**
 * Worker 이벤트 타입
 */
export interface LibraryWorkerEvents extends Record<string, unknown> {
  buildStart: Record<string, never>;
  build: LibraryBuildEvent;
  error: LibraryErrorEvent;
}

//#endregion

//#region 리소스 관리

const logger = consola.withTag("sd:cli:library:worker");

/** esbuild build context (정리 대상) */
let esbuildContext: esbuild.BuildContext | undefined;

/**
 * 리소스 정리
 */
async function cleanup(): Promise<void> {
  const contextToDispose = esbuildContext;
  if (contextToDispose != null) {
    await contextToDispose.dispose();
  }
  esbuildContext = undefined;
}

process.on("SIGTERM", () => {
  cleanup()
    .catch((err) => {
      logger.error("cleanup 실패", err);
    })
    .finally(() => {
      process.exit(0);
    });
});

process.on("SIGINT", () => {
  cleanup()
    .catch((err) => {
      logger.error("cleanup 실패", err);
    })
    .finally(() => {
      process.exit(0);
    });
});

//#endregion

//#region build (일회성 빌드)

/**
 * Library esbuild 일회성 빌드
 */
async function build(info: LibraryBuildInfo): Promise<LibraryBuildResult> {
  try {
    const parsedConfig = parseRootTsconfig(info.cwd);
    const entryPoints = getPackageSourceFiles(info.pkgDir, parsedConfig);
    const env = getTypecheckEnvFromTarget(info.config.target);
    const compilerOptions = await getCompilerOptionsForPackage(parsedConfig.options, env, info.pkgDir);

    const esbuildOptions = createLibraryEsbuildOptions({
      pkgDir: info.pkgDir,
      entryPoints,
      target: info.config.target === "node" ? "node" : "browser",
      compilerOptions,
    });

    const result = await esbuild.build(esbuildOptions);

    const errors = result.errors.map((e) => e.text);
    return {
      success: result.errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err) {
    return {
      success: false,
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }
}

//#endregion

//#region startWatch (watch 모드)

let isWatchStarted = false;

/**
 * Library esbuild watch 시작
 * @remarks 이 함수는 Worker당 한 번만 호출되어야 합니다.
 */
async function startWatch(info: LibraryWatchInfo): Promise<void> {
  if (isWatchStarted) {
    throw new Error("startWatch는 Worker당 한 번만 호출할 수 있습니다.");
  }
  isWatchStarted = true;

  try {
    const parsedConfig = parseRootTsconfig(info.cwd);
    const entryPoints = getPackageSourceFiles(info.pkgDir, parsedConfig);
    const env = getTypecheckEnvFromTarget(info.config.target);
    const compilerOptions = await getCompilerOptionsForPackage(parsedConfig.options, env, info.pkgDir);

    const esbuildOptions = createLibraryEsbuildOptions({
      pkgDir: info.pkgDir,
      entryPoints,
      target: info.config.target === "node" ? "node" : "browser",
      compilerOptions,
    });

    let resolveFirstBuild!: () => void;
    const firstBuildPromise = new Promise<void>((resolve) => {
      resolveFirstBuild = resolve;
    });

    let isFirstBuild = true;

    esbuildContext = await esbuild.context({
      ...esbuildOptions,
      plugins: [
        {
          name: "library-watch-notify",
          setup(build) {
            build.onStart(() => {
              sender.send("buildStart", {});
            });

            build.onEnd((result) => {
              const errors = result.errors.map((e) => e.text);
              const success = result.errors.length === 0;

              sender.send("build", { success, errors: errors.length > 0 ? errors : undefined });

              if (isFirstBuild) {
                isFirstBuild = false;
                resolveFirstBuild();
              }
            });
          },
        },
      ],
    });

    await esbuildContext.watch();
    await firstBuildPromise;
  } catch (err) {
    sender.send("error", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

//#endregion

//#region stopWatch

/**
 * watch 중지
 */
async function stopWatch(): Promise<void> {
  await cleanup();
}

//#endregion

const sender = createWorker<
  { build: typeof build; startWatch: typeof startWatch; stopWatch: typeof stopWatch },
  LibraryWorkerEvents
>({
  build,
  startWatch,
  stopWatch,
});

export default sender;
```

**Step 2: 린트 검증**

Run: `pnpm lint packages/cli/src/workers/library.worker.ts`
Expected: 에러 없음

**Step 3: 커밋**

```bash
git add packages/cli/src/workers/library.worker.ts
git commit -m "$(cat <<'EOF'
feat(cli): add library.worker.ts for unified library builds

Combines build and watch functionality for node/browser/neutral targets.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: server.worker.ts 생성

**Files:**

- Create: `packages/cli/src/workers/server.worker.ts`
- Reference: `packages/cli/src/workers/build.worker.ts`
- Reference: `packages/cli/src/workers/server-build.worker.ts`
- Reference: `packages/cli/src/utils/esbuild-config.ts`

**Step 1: server.worker.ts 파일 생성**

```typescript
// packages/cli/src/workers/server.worker.ts
import path from "path";
import esbuild from "esbuild";
import { createWorker } from "@simplysm/core-node";
import { consola } from "consola";
import { parseRootTsconfig, getPackageSourceFiles, getCompilerOptionsForPackage } from "../utils/tsconfig";
import { createServerEsbuildOptions } from "../utils/esbuild-config";

//#region Types

/**
 * Server 빌드 정보 (일회성 빌드)
 */
export interface ServerBuildInfo {
  name: string;
  cwd: string;
  pkgDir: string;
  env?: Record<string, string>;
}

/**
 * Server Watch 정보
 */
export interface ServerWatchInfo {
  name: string;
  cwd: string;
  pkgDir: string;
  env?: Record<string, string>;
}

/**
 * 빌드 결과
 */
export interface ServerBuildResult {
  success: boolean;
  mainJsPath: string;
  errors?: string[];
}

/**
 * 빌드 이벤트
 */
export interface ServerBuildEvent {
  success: boolean;
  mainJsPath: string;
  errors?: string[];
}

/**
 * 에러 이벤트
 */
export interface ServerErrorEvent {
  message: string;
}

/**
 * Worker 이벤트 타입
 */
export interface ServerWorkerEvents extends Record<string, unknown> {
  buildStart: Record<string, never>;
  build: ServerBuildEvent;
  error: ServerErrorEvent;
}

//#endregion

//#region 리소스 관리

const logger = consola.withTag("sd:cli:server:worker");

/** esbuild build context (정리 대상) */
let esbuildContext: esbuild.BuildContext | undefined;

/**
 * 리소스 정리
 */
async function cleanup(): Promise<void> {
  const contextToDispose = esbuildContext;
  if (contextToDispose != null) {
    await contextToDispose.dispose();
  }
  esbuildContext = undefined;
}

process.on("SIGTERM", () => {
  cleanup()
    .catch((err) => {
      logger.error("cleanup 실패", err);
    })
    .finally(() => {
      process.exit(0);
    });
});

process.on("SIGINT", () => {
  cleanup()
    .catch((err) => {
      logger.error("cleanup 실패", err);
    })
    .finally(() => {
      process.exit(0);
    });
});

//#endregion

//#region build (일회성 빌드)

/**
 * Server esbuild 일회성 빌드
 */
async function build(info: ServerBuildInfo): Promise<ServerBuildResult> {
  try {
    const parsedConfig = parseRootTsconfig(info.cwd);
    const entryPoints = getPackageSourceFiles(info.pkgDir, parsedConfig);
    const compilerOptions = await getCompilerOptionsForPackage(parsedConfig.options, "node", info.pkgDir);

    const mainJsPath = path.join(info.pkgDir, "dist", "main.js");

    const esbuildOptions = createServerEsbuildOptions({
      pkgDir: info.pkgDir,
      entryPoints,
      compilerOptions,
      env: info.env,
    });

    const result = await esbuild.build(esbuildOptions);

    const errors = result.errors.map((e) => e.text);
    return {
      success: result.errors.length === 0,
      mainJsPath,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err) {
    return {
      success: false,
      mainJsPath: path.join(info.pkgDir, "dist", "main.js"),
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }
}

//#endregion

//#region startWatch (watch 모드)

let isWatchStarted = false;

/**
 * Server esbuild watch 시작
 * @remarks 이 함수는 Worker당 한 번만 호출되어야 합니다.
 */
async function startWatch(info: ServerWatchInfo): Promise<void> {
  if (isWatchStarted) {
    throw new Error("startWatch는 Worker당 한 번만 호출할 수 있습니다.");
  }
  isWatchStarted = true;

  try {
    const parsedConfig = parseRootTsconfig(info.cwd);
    const entryPoints = getPackageSourceFiles(info.pkgDir, parsedConfig);
    const compilerOptions = await getCompilerOptionsForPackage(parsedConfig.options, "node", info.pkgDir);

    const mainJsPath = path.join(info.pkgDir, "dist", "main.js");

    const esbuildOptions = createServerEsbuildOptions({
      pkgDir: info.pkgDir,
      entryPoints,
      compilerOptions,
      env: info.env,
    });

    let resolveFirstBuild!: () => void;
    const firstBuildPromise = new Promise<void>((resolve) => {
      resolveFirstBuild = resolve;
    });

    let isFirstBuild = true;

    esbuildContext = await esbuild.context({
      ...esbuildOptions,
      plugins: [
        {
          name: "server-watch-notify",
          setup(build) {
            build.onStart(() => {
              sender.send("buildStart", {});
            });

            build.onEnd((result) => {
              const errors = result.errors.map((e) => e.text);
              const success = result.errors.length === 0;

              sender.send("build", {
                success,
                mainJsPath,
                errors: errors.length > 0 ? errors : undefined,
              });

              if (isFirstBuild) {
                isFirstBuild = false;
                resolveFirstBuild();
              }
            });
          },
        },
      ],
    });

    await esbuildContext.watch();
    await firstBuildPromise;
  } catch (err) {
    sender.send("error", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

//#endregion

//#region stopWatch

/**
 * watch 중지
 */
async function stopWatch(): Promise<void> {
  await cleanup();
}

//#endregion

const sender = createWorker<
  { build: typeof build; startWatch: typeof startWatch; stopWatch: typeof stopWatch },
  ServerWorkerEvents
>({
  build,
  startWatch,
  stopWatch,
});

export default sender;
```

**Step 2: 린트 검증**

Run: `pnpm lint packages/cli/src/workers/server.worker.ts`
Expected: 에러 없음

**Step 3: 커밋**

```bash
git add packages/cli/src/workers/server.worker.ts
git commit -m "$(cat <<'EOF'
feat(cli): add server.worker.ts for unified server builds

Combines build and watch functionality for server target with bundling.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: client.worker.ts 생성

**Files:**

- Create: `packages/cli/src/workers/client.worker.ts`
- Reference: `packages/cli/src/commands/build.ts:286-319`
- Reference: `packages/cli/src/workers/watch.worker.ts:190-239`
- Reference: `packages/cli/src/utils/vite-config.ts`

**Step 1: client.worker.ts 파일 생성**

```typescript
// packages/cli/src/workers/client.worker.ts
import path from "path";
import { build as viteBuild, createServer, type ViteDevServer } from "vite";
import { createWorker } from "@simplysm/core-node";
import { consola } from "consola";
import type { SdClientPackageConfig } from "../sd-config.types";
import { parseRootTsconfig, getCompilerOptionsForPackage } from "../utils/tsconfig";
import { createViteConfig } from "../utils/vite-config";

//#region Types

/**
 * Client 빌드 정보 (일회성 빌드)
 */
export interface ClientBuildInfo {
  name: string;
  config: SdClientPackageConfig;
  cwd: string;
  pkgDir: string;
}

/**
 * Client Watch 정보
 */
export interface ClientWatchInfo {
  name: string;
  config: SdClientPackageConfig;
  cwd: string;
  pkgDir: string;
}

/**
 * 빌드 결과
 */
export interface ClientBuildResult {
  success: boolean;
  errors?: string[];
}

/**
 * 빌드 이벤트
 */
export interface ClientBuildEvent {
  success: boolean;
  errors?: string[];
}

/**
 * 서버 준비 이벤트
 */
export interface ClientServerReadyEvent {
  port: number;
}

/**
 * 에러 이벤트
 */
export interface ClientErrorEvent {
  message: string;
}

/**
 * Worker 이벤트 타입
 */
export interface ClientWorkerEvents extends Record<string, unknown> {
  buildStart: Record<string, never>;
  build: ClientBuildEvent;
  serverReady: ClientServerReadyEvent;
  error: ClientErrorEvent;
}

//#endregion

//#region 리소스 관리

const logger = consola.withTag("sd:cli:client:worker");

/** Vite dev server (정리 대상) */
let viteServer: ViteDevServer | undefined;

/**
 * 리소스 정리
 */
async function cleanup(): Promise<void> {
  const serverToClose = viteServer;
  if (serverToClose != null) {
    await serverToClose.close();
  }
  viteServer = undefined;
}

process.on("SIGTERM", () => {
  cleanup()
    .catch((err) => {
      logger.error("cleanup 실패", err);
    })
    .finally(() => {
      process.exit(0);
    });
});

process.on("SIGINT", () => {
  cleanup()
    .catch((err) => {
      logger.error("cleanup 실패", err);
    })
    .finally(() => {
      process.exit(0);
    });
});

//#endregion

//#region build (일회성 빌드)

/**
 * Client Vite 일회성 빌드
 */
async function build(info: ClientBuildInfo): Promise<ClientBuildResult> {
  try {
    const parsedConfig = parseRootTsconfig(info.cwd);
    const tsconfigPath = path.join(info.cwd, "tsconfig.json");
    const compilerOptions = await getCompilerOptionsForPackage(parsedConfig.options, "browser", info.pkgDir);

    const viteConfig = createViteConfig({
      pkgDir: info.pkgDir,
      name: info.name,
      tsconfigPath,
      compilerOptions,
      env: info.config.env,
      mode: "build",
    });

    await viteBuild(viteConfig);

    return { success: true };
  } catch (err) {
    return {
      success: false,
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }
}

//#endregion

//#region startWatch (watch 모드 - dev server)

let isWatchStarted = false;

/**
 * Client Vite dev server 시작
 * @remarks 이 함수는 Worker당 한 번만 호출되어야 합니다.
 */
async function startWatch(info: ClientWatchInfo): Promise<void> {
  if (isWatchStarted) {
    throw new Error("startWatch는 Worker당 한 번만 호출할 수 있습니다.");
  }
  isWatchStarted = true;

  try {
    const parsedConfig = parseRootTsconfig(info.cwd);
    const tsconfigPath = path.join(info.cwd, "tsconfig.json");
    const compilerOptions = await getCompilerOptionsForPackage(parsedConfig.options, "browser", info.pkgDir);

    // server가 0이면 자동 포트 할당, 숫자면 해당 포트 사용
    const serverPort = typeof info.config.server === "number" ? info.config.server : 0;

    const viteConfig = createViteConfig({
      pkgDir: info.pkgDir,
      name: info.name,
      tsconfigPath,
      compilerOptions,
      env: info.config.env,
      mode: "dev",
      serverPort,
    });

    viteServer = await createServer(viteConfig);
    await viteServer.listen();

    // 실제 할당된 포트 반환
    sender.send("serverReady", { port: viteServer.config.server.port });
  } catch (err) {
    sender.send("error", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

//#endregion

//#region stopWatch

/**
 * watch 중지 (dev server 종료)
 */
async function stopWatch(): Promise<void> {
  await cleanup();
}

//#endregion

const sender = createWorker<
  { build: typeof build; startWatch: typeof startWatch; stopWatch: typeof stopWatch },
  ClientWorkerEvents
>({
  build,
  startWatch,
  stopWatch,
});

export default sender;
```

**Step 2: 린트 검증**

Run: `pnpm lint packages/cli/src/workers/client.worker.ts`
Expected: 에러 없음

**Step 3: 커밋**

```bash
git add packages/cli/src/workers/client.worker.ts
git commit -m "$(cat <<'EOF'
feat(cli): add client.worker.ts for unified Vite builds

Combines Vite production build and dev server functionality.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: dts.worker.ts에 emit 옵션 통합

**Files:**

- Modify: `packages/cli/src/workers/dts.worker.ts:28-35`
- Reference: `packages/cli/src/workers/typecheck.worker.ts`

**Step 1: DtsBuildInfo 인터페이스 확인**

기존 `dts.worker.ts`는 이미 `noEmit` 옵션을 지원함. `emit` 옵션으로 변경하여 의미를 명확히 함.

**Step 2: emit 옵션으로 리네임 (noEmit → emit)**

기존 `noEmit: boolean`을 `emit: boolean`으로 변경:

- `emit: true` → .d.ts 생성 + 타입체크
- `emit: false` → 타입체크만

```typescript
// packages/cli/src/workers/dts.worker.ts 수정

// 기존 코드 (lines 28-35):
export interface DtsBuildInfo {
  name: string;
  cwd: string;
  pkgDir: string;
  env: TypecheckEnv;
  /** true면 dts 생성 없이 typecheck만 (client 타겟용) */
  noEmit?: boolean;
}

// 변경 후:
export interface DtsBuildInfo {
  name: string;
  cwd: string;
  pkgDir: string;
  env: TypecheckEnv;
  /** true면 .d.ts 생성 + 타입체크, false면 타입체크만 (기본값: true) */
  emit?: boolean;
}
```

**Step 3: buildDts 함수 내부 로직 수정**

`noEmit` 참조를 `emit`으로 변경:

```typescript
// 기존 코드 (lines 128-148):
// noEmit 여부에 따라 emit 관련 옵션 설정
if (info.noEmit) {
  // typecheck만 수행 (dts 생성 안 함)
  options.noEmit = true;
  ...
} else {
  // dts 생성
  options.noEmit = false;
  ...
}

// 변경 후:
// emit 여부에 따라 옵션 설정 (기본값: true)
const shouldEmit = info.emit !== false;
if (shouldEmit) {
  // dts 생성 + 타입체크
  options.noEmit = false;
  options.emitDeclarationOnly = true;
  options.declaration = true;
  options.declarationMap = true;
  options.outDir = path.join(info.pkgDir, "dist");
  options.declarationDir = path.join(info.pkgDir, "dist");
} else {
  // typecheck만 수행 (dts 생성 안 함)
  options.noEmit = true;
  options.emitDeclarationOnly = false;
  options.declaration = false;
  options.declarationMap = false;
}
```

**Step 4: tsBuildInfoFile 경로 수정**

```typescript
// 기존 코드:
tsBuildInfoFile: path.join(info.pkgDir, ".cache", info.noEmit ? "typecheck.tsbuildinfo" : "dts.tsbuildinfo"),

// 변경 후:
tsBuildInfoFile: path.join(info.pkgDir, ".cache", shouldEmit ? "dts.tsbuildinfo" : "typecheck.tsbuildinfo"),
```

**Step 5: 린트 검증**

Run: `pnpm lint packages/cli/src/workers/dts.worker.ts`
Expected: 에러 없음

**Step 6: 커밋**

```bash
git add packages/cli/src/workers/dts.worker.ts
git commit -m "$(cat <<'EOF'
refactor(cli): rename noEmit to emit in dts.worker.ts

Clearer API: emit=true generates .d.ts, emit=false is typecheck-only.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3: Commands 수정

### Task 7: build.ts 수정 - 새 Worker 사용

**Files:**

- Modify: `packages/cli/src/commands/build.ts`
- Reference: `packages/cli/src/workers/library.worker.ts`
- Reference: `packages/cli/src/workers/server.worker.ts`
- Reference: `packages/cli/src/workers/client.worker.ts`

**Step 1: import 변경**

```typescript
// 기존 import 삭제:
import type * as BuildWorkerModule from "../workers/build.worker";

// 새 import 추가:
import type * as LibraryWorkerModule from "../workers/library.worker";
import type * as ServerWorkerModule from "../workers/server.worker";
import type * as ClientWorkerModule from "../workers/client.worker";
```

**Step 2: Worker 경로 변경**

```typescript
// 기존 코드 (lines 182-183):
const buildWorkerPath = path.resolve(import.meta.dirname, "../workers/build.worker.ts");

// 변경 후:
const libraryWorkerPath = path.resolve(import.meta.dirname, "../workers/library.worker.ts");
const serverWorkerPath = path.resolve(import.meta.dirname, "../workers/server.worker.ts");
const clientWorkerPath = path.resolve(import.meta.dirname, "../workers/client.worker.ts");
```

**Step 3: buildPackages 처리 변경**

```typescript
// 기존 코드 (lines 235-236):
const buildWorker: WorkerProxy<typeof BuildWorkerModule> = Worker.create<typeof BuildWorkerModule>(buildWorkerPath);

// 변경 후:
const libraryWorker: WorkerProxy<typeof LibraryWorkerModule> =
  Worker.create<typeof LibraryWorkerModule>(libraryWorkerPath);

// build 호출 변경:
// 기존: buildWorker.build({ name, config, cwd, pkgDir })
// 변경: libraryWorker.build({ name, config, cwd, pkgDir })
```

**Step 4: clientPackages에서 Vite 빌드를 client.worker 사용으로 변경**

기존에는 메인 스레드에서 직접 `viteBuild()` 호출. 이제 `client.worker`를 통해 처리:

```typescript
// 기존 코드 (lines 286-319): 메인 스레드에서 viteBuild 직접 호출

// 변경 후:
const clientWorker: WorkerProxy<typeof ClientWorkerModule> = Worker.create<typeof ClientWorkerModule>(clientWorkerPath);

try {
  const clientResult = await clientWorker.build({ name, config, cwd, pkgDir });
  results.push({
    name,
    target: "client",
    type: "vite",
    success: clientResult.success,
    errors: clientResult.errors,
  });
  if (!clientResult.success) state.hasError = true;
} finally {
  await clientWorker.terminate();
}
```

**Step 5: serverPackages 처리 변경**

```typescript
// 기존 코드 (lines 380-381):
const buildWorker: WorkerProxy<typeof BuildWorkerModule> = Worker.create<typeof BuildWorkerModule>(buildWorkerPath);

// 변경 후:
const serverWorker: WorkerProxy<typeof ServerWorkerModule> = Worker.create<typeof ServerWorkerModule>(serverWorkerPath);

// build 호출 변경:
// 기존: buildWorker.build({ name, config: { target: "node" }, cwd, pkgDir })
// 변경: serverWorker.build({ name, cwd, pkgDir })
```

**Step 6: dts.worker 호출 시 emit 옵션 변경**

```typescript
// 기존 코드:
dtsWorker.buildDts({ name, cwd, pkgDir, env, noEmit: false });
dtsWorker.buildDts({ name, cwd, pkgDir, env: "browser", noEmit: true });

// 변경 후:
dtsWorker.buildDts({ name, cwd, pkgDir, env, emit: true });
dtsWorker.buildDts({ name, cwd, pkgDir, env: "browser", emit: false });
```

**Step 7: 린트 검증**

Run: `pnpm lint packages/cli/src/commands/build.ts`
Expected: 에러 없음

**Step 8: 커밋**

```bash
git add packages/cli/src/commands/build.ts
git commit -m "$(cat <<'EOF'
refactor(cli): update build.ts to use new workers

Use library.worker, server.worker, client.worker instead of build.worker.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: dev.ts 수정 - 새 Worker 사용

**Files:**

- Modify: `packages/cli/src/commands/dev.ts`
- Reference: `packages/cli/src/workers/client.worker.ts`
- Reference: `packages/cli/src/workers/server.worker.ts`

**Step 1: import 변경**

```typescript
// 기존 import 삭제:
import type * as WatchWorkerModule from "../workers/watch.worker";
import type * as ServerBuildWorkerModule from "../workers/server-build.worker";

// 새 import 추가:
import type * as ClientWorkerModule from "../workers/client.worker";
import type * as ServerWorkerModule from "../workers/server.worker";
```

**Step 2: Worker 경로 변경**

```typescript
// 기존 코드 (lines 114-116):
const watchWorkerPath = path.resolve(import.meta.dirname, "../workers/watch.worker.ts");
const serverBuildWorkerPath = path.resolve(import.meta.dirname, "../workers/server-build.worker.ts");

// 변경 후:
const clientWorkerPath = path.resolve(import.meta.dirname, "../workers/client.worker.ts");
const serverWorkerPath = path.resolve(import.meta.dirname, "../workers/server.worker.ts");
```

**Step 3: ClientWorkerInfo 타입 변경**

```typescript
// 기존 코드 (lines 39-45):
interface ClientWorkerInfo {
  name: string;
  config: SdClientPackageConfig;
  worker: WorkerProxy<typeof WatchWorkerModule>;
  ...
}

// 변경 후:
interface ClientWorkerInfo {
  name: string;
  config: SdClientPackageConfig;
  worker: WorkerProxy<typeof ClientWorkerModule>;
  ...
}
```

**Step 4: Worker 생성 변경**

```typescript
// 기존 코드 (lines 130, 141):
worker: Worker.create<typeof WatchWorkerModule>(watchWorkerPath),

// 변경 후:
worker: Worker.create<typeof ClientWorkerModule>(clientWorkerPath),
```

**Step 5: serverBuildWorkers 변경**

```typescript
// 기존 코드 (lines 203-222):
const serverBuildWorkers = new Map<
  string,
  {
    worker: WorkerProxy<typeof ServerBuildWorkerModule>;
    ...
  }
>();

// 변경 후:
const serverWorkers = new Map<
  string,
  {
    worker: WorkerProxy<typeof ServerWorkerModule>;
    ...
  }
>();

// Worker 생성도 변경:
worker: Worker.create<typeof ServerWorkerModule>(serverWorkerPath),
```

**Step 6: 린트 검증**

Run: `pnpm lint packages/cli/src/commands/dev.ts`
Expected: 에러 없음

**Step 7: 커밋**

```bash
git add packages/cli/src/commands/dev.ts
git commit -m "$(cat <<'EOF'
refactor(cli): update dev.ts to use new workers

Use client.worker, server.worker instead of watch.worker, server-build.worker.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: watch.ts 수정 - 새 Worker 사용

**Files:**

- Modify: `packages/cli/src/commands/watch.ts`
- Reference: 기존 watch.ts 구조 확인 필요

**Step 1: watch.ts 구조 확인**

watch.ts가 `WatchOrchestrator`를 사용하고, 이 Orchestrator가 내부적으로 Worker를 관리하는 경우,
Orchestrator 클래스도 함께 수정이 필요할 수 있음.

watch.ts의 기존 구조를 읽어서 어떤 Worker를 사용하는지 확인 후 수정.

**Step 2: watch.ts 수정 (구조에 따라)**

`WatchOrchestrator`가 있다면 해당 클래스 파일도 수정 필요.
직접 Worker를 생성한다면 dev.ts와 유사하게 수정.

**Step 3: 린트 검증**

Run: `pnpm lint packages/cli/src/commands/watch.ts`
Expected: 에러 없음

**Step 4: 커밋**

```bash
git add packages/cli/src/commands/watch.ts
git commit -m "$(cat <<'EOF'
refactor(cli): update watch.ts to use new workers

Use library.worker, client.worker instead of watch.worker.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: typecheck.ts 수정 - dts.worker 사용

**Files:**

- Modify: `packages/cli/src/commands/typecheck.ts`
- Reference: `packages/cli/src/workers/dts.worker.ts`

**Step 1: typecheck.ts 수정**

기존에 `typecheck.worker.ts`를 사용했다면, `dts.worker.ts`의 `buildDts({ emit: false })`로 변경.

```typescript
// 기존 import 삭제:
import type * as TypecheckWorkerModule from "../workers/typecheck.worker";

// 새 import:
import type * as DtsWorkerModule from "../workers/dts.worker";

// Worker 경로 변경:
const workerPath = path.resolve(import.meta.dirname, "../workers/dts.worker.ts");

// 호출 변경:
// 기존: worker.typecheck(taskInfo, baseOptions)
// 변경: worker.buildDts({ name, cwd, pkgDir, env, emit: false })
```

**Step 2: 린트 검증**

Run: `pnpm lint packages/cli/src/commands/typecheck.ts`
Expected: 에러 없음

**Step 3: 커밋**

```bash
git add packages/cli/src/commands/typecheck.ts
git commit -m "$(cat <<'EOF'
refactor(cli): update typecheck.ts to use dts.worker

Use dts.worker with emit=false instead of dedicated typecheck.worker.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4: 기존 Worker 파일 삭제

### Task 11: 기존 Worker 파일 삭제

**Files:**

- Delete: `packages/cli/src/workers/build.worker.ts`
- Delete: `packages/cli/src/workers/watch.worker.ts`
- Delete: `packages/cli/src/workers/server-build.worker.ts`
- Delete: `packages/cli/src/workers/typecheck.worker.ts`

**Step 1: 파일 삭제 전 참조 확인**

```bash
grep -r "build\.worker" packages/cli/src/
grep -r "watch\.worker" packages/cli/src/
grep -r "server-build\.worker" packages/cli/src/
grep -r "typecheck\.worker" packages/cli/src/
```

Expected: 참조가 없어야 함 (이전 Task에서 모두 변경됨)

**Step 2: 파일 삭제**

```bash
rm packages/cli/src/workers/build.worker.ts
rm packages/cli/src/workers/watch.worker.ts
rm packages/cli/src/workers/server-build.worker.ts
rm packages/cli/src/workers/typecheck.worker.ts
```

**Step 3: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore(cli): remove deprecated worker files

Remove build.worker, watch.worker, server-build.worker, typecheck.worker.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 5: 검증

### Task 12: 타입체크 검증

**Step 1: 타입체크 실행**

Run: `pnpm typecheck packages/cli`
Expected: 에러 없음

**Step 2: 린트 검증**

Run: `pnpm lint packages/cli`
Expected: 에러 없음

---

### Task 13: 빌드 테스트

**Step 1: CLI 패키지 빌드**

Run: `pnpm build cli`
Expected: 빌드 성공

**Step 2: 다른 라이브러리 패키지 빌드 테스트**

Run: `pnpm build core-common`
Expected: 빌드 성공 (library.worker 사용)

**Step 3: 클라이언트 패키지 빌드 테스트 (solid-demo가 있는 경우)**

Run: `pnpm build solid-demo`
Expected: 빌드 성공 (client.worker 사용)

---

### Task 14: Watch 모드 테스트

**Step 1: watch 명령 테스트**

Run: `pnpm watch core-common`
Expected: watch 모드 시작, 파일 변경 시 재빌드

**Step 2: Ctrl+C로 종료**

Expected: 정상 종료

---

### Task 15: Dev 모드 테스트

**Step 1: dev 명령 테스트 (server + client 패키지가 있는 경우)**

Run: `pnpm dev <server-package> <client-package>`
Expected: Server 빌드 + Client dev server 시작

**Step 2: Ctrl+C로 종료**

Expected: 정상 종료

---

## Phase 6: 정리 및 문서화

### Task 16: 최종 검증 및 커밋

**Step 1: 전체 린트**

Run: `pnpm lint`
Expected: 에러 없음

**Step 2: 전체 타입체크**

Run: `pnpm typecheck`
Expected: 에러 없음

**Step 3: 최종 커밋 (필요시)**

변경사항이 있다면 커밋

---

## 요약

### 생성 파일

- `packages/cli/src/utils/esbuild-config.ts`
- `packages/cli/src/utils/vite-config.ts`
- `packages/cli/src/workers/library.worker.ts`
- `packages/cli/src/workers/server.worker.ts`
- `packages/cli/src/workers/client.worker.ts`

### 수정 파일

- `packages/cli/src/workers/dts.worker.ts` (emit 옵션)
- `packages/cli/src/commands/build.ts`
- `packages/cli/src/commands/dev.ts`
- `packages/cli/src/commands/watch.ts`
- `packages/cli/src/commands/typecheck.ts`

### 삭제 파일

- `packages/cli/src/workers/build.worker.ts`
- `packages/cli/src/workers/watch.worker.ts`
- `packages/cli/src/workers/server-build.worker.ts`
- `packages/cli/src/workers/typecheck.worker.ts`
