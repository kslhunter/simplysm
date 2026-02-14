# Server Build: Native Module Externals & Production Files - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Add native module auto-externalization (binding.gyp detection) and production deployment file generation (package.json, mise.toml, openssl.cnf, pm2.config.cjs) to the CLI server build pipeline.

**Architecture:** Extend the existing server build pipeline with two new capabilities: (1) a `collectNativeModuleExternals()` function that recursively scans dependencies for `binding.gyp` files, and (2) a `generateProductionFiles()` function in the server worker that creates deployment artifacts. Both production build (`build()`) and watch mode (`startWatch()`) use the combined external list, but only production build generates deployment files.

**Tech Stack:** TypeScript, esbuild, Node.js fs APIs, mise CLI

---

### Task 1: Extend SdServerPackageConfig type

**Files:**
- Modify: `packages/sd-cli/src/sd-config.types.ts:185-194`

**Step 1: Add `externals` and `pm2` fields to SdServerPackageConfig**

In `packages/sd-cli/src/sd-config.types.ts`, replace lines 185-194:

```typescript
/**
 * 서버 패키지 설정 (Fastify 서버)
 */
export interface SdServerPackageConfig {
  /** 빌드 타겟 */
  target: "server";
  /** 빌드 시 치환할 환경변수 (process.env.KEY를 상수로 치환) */
  env?: Record<string, string>;
  /** publish 설정 */
  publish?: SdPublishConfig;
  /** runtime config (written to dist/.config.json during build) */
  configs?: Record<string, unknown>;
  /** esbuild에서 번들에 포함하지 않을 외부 모듈 (binding.gyp 자동 감지에 더해 수동 지정) */
  externals?: string[];
  /** PM2 설정 (지정 시 dist/pm2.config.cjs 생성) */
  pm2?: {
    /** PM2 프로세스 이름 (미지정 시 package.json name에서 생성) */
    name?: string;
    /** PM2 watch에서 제외할 경로 */
    ignoreWatchPaths?: string[];
    /** true면 interpreter 경로 생략 (시스템 PATH의 node 사용) */
    noInterpreter?: boolean;
  };
}
```

**Step 2: Run typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS (no consumers of the new optional fields yet)

**Step 3: Commit**

```
feat(sd-cli): add externals and pm2 fields to SdServerPackageConfig
```

---

### Task 2: Add collectNativeModuleExternals function

**Files:**
- Modify: `packages/sd-cli/src/utils/esbuild-config.ts:196` (append after `//#endregion`)

**Step 1: Add the native module detection function**

Append to `packages/sd-cli/src/utils/esbuild-config.ts` before the final empty line, after the existing `//#endregion` on line 196. Also add `existsSync` to the `fs` import on line 2.

First, update the import on line 2 — change:
```typescript
import { readFileSync } from "fs";
```
to:
```typescript
import { readFileSync, existsSync } from "fs";
```

Then append after line 196:

```typescript

//#region Native Module Externals

/**
 * 의존성 중 binding.gyp가 있는 네이티브 모듈 수집
 *
 * node-gyp로 빌드되는 네이티브 모듈은 esbuild가 번들링할 수 없으므로
 * external로 지정해야 한다.
 */
export function collectNativeModuleExternals(pkgDir: string): string[] {
  const external = new Set<string>();
  const visited = new Set<string>();

  const pkgJson = JSON.parse(readFileSync(path.join(pkgDir, "package.json"), "utf-8")) as PkgJson;
  for (const dep of Object.keys(pkgJson.dependencies ?? {})) {
    scanNativeModules(dep, pkgDir, external, visited);
  }

  return [...external];
}

function scanNativeModules(
  pkgName: string,
  resolveDir: string,
  external: Set<string>,
  visited: Set<string>,
): void {
  if (visited.has(pkgName)) return;
  visited.add(pkgName);

  const req = createRequire(path.join(resolveDir, "noop.js"));

  let pkgJsonPath: string;
  try {
    pkgJsonPath = req.resolve(`${pkgName}/package.json`);
  } catch {
    return;
  }

  const depDir = path.dirname(pkgJsonPath);

  // binding.gyp 존재 여부로 네이티브 모듈 감지
  if (existsSync(path.join(depDir, "binding.gyp"))) {
    external.add(pkgName);
  }

  // 하위 dependencies도 재귀 탐색
  const depPkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8")) as PkgJson;
  for (const dep of Object.keys(depPkgJson.dependencies ?? {})) {
    scanNativeModules(dep, depDir, external, visited);
  }
}

//#endregion
```

**Step 2: Run typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 3: Commit**

```
feat(sd-cli): add collectNativeModuleExternals for binding.gyp detection
```

---

### Task 3: Extend server worker with combined externals and production file generation

**Files:**
- Modify: `packages/sd-cli/src/workers/server.worker.ts`

**Step 1: Update imports**

In `packages/sd-cli/src/workers/server.worker.ts`, change line 7:

```typescript
import { createServerEsbuildOptions, collectUninstalledOptionalPeerDeps } from "../utils/esbuild-config";
```
to:
```typescript
import { createServerEsbuildOptions, collectUninstalledOptionalPeerDeps, collectNativeModuleExternals } from "../utils/esbuild-config";
```

Also add `cp` import after the existing `fs` import (line 2):

```typescript
import cp from "child_process";
```

**Step 2: Extend ServerBuildInfo and ServerWatchInfo types**

Replace lines 14-22 (`ServerBuildInfo`):

```typescript
/**
 * Server 빌드 정보 (일회성 빌드용)
 */
export interface ServerBuildInfo {
  name: string;
  cwd: string;
  pkgDir: string;
  /** 빌드 시 치환할 환경변수 */
  env?: Record<string, string>;
  /** 런타임 설정 (dist/.config.json에 기록) */
  configs?: Record<string, unknown>;
  /** sd.config.ts에서 수동 지정한 external 모듈 */
  externals?: string[];
  /** PM2 설정 (지정 시 dist/pm2.config.cjs 생성) */
  pm2?: {
    name?: string;
    ignoreWatchPaths?: string[];
    noInterpreter?: boolean;
  };
}
```

Replace lines 36-44 (`ServerWatchInfo`):

```typescript
/**
 * Server Watch 정보
 */
export interface ServerWatchInfo {
  name: string;
  cwd: string;
  pkgDir: string;
  /** 빌드 시 치환할 환경변수 */
  env?: Record<string, string>;
  /** 런타임 설정 (dist/.config.json에 기록) */
  configs?: Record<string, unknown>;
  /** sd.config.ts에서 수동 지정한 external 모듈 */
  externals?: string[];
}
```

**Step 3: Add helper function to collect all externals**

Add after the `cleanup` function (after line 92, before the `//#endregion` on line 117), e.g. at line 93:

```typescript

/**
 * 세 가지 소스에서 external 모듈을 수집하여 합친다.
 * 1. 미설치 optional peer deps
 * 2. binding.gyp 네이티브 모듈
 * 3. sd.config.ts 수동 지정
 */
function collectAllExternals(pkgDir: string, manualExternals?: string[]): string[] {
  const optionalPeerDeps = collectUninstalledOptionalPeerDeps(pkgDir);
  const nativeModules = collectNativeModuleExternals(pkgDir);
  const manual = manualExternals ?? [];

  const merged = [...new Set([...optionalPeerDeps, ...nativeModules, ...manual])];

  if (optionalPeerDeps.length > 0) {
    logger.debug("미설치 optional peer deps (external):", optionalPeerDeps);
  }
  if (nativeModules.length > 0) {
    logger.debug("네이티브 모듈 (external):", nativeModules);
  }
  if (manual.length > 0) {
    logger.debug("수동 지정 (external):", manual);
  }

  return merged;
}
```

**Step 4: Add production file generation function**

Add after the `collectAllExternals` function:

```typescript

/**
 * 프로덕션 배포용 파일 생성 (일회성 빌드에서만 호출)
 *
 * - dist/package.json: external 모듈을 dependencies로 포함
 * - dist/mise.toml: Node 버전 지정
 * - dist/openssl.cnf: 레거시 OpenSSL 프로바이더 활성화
 * - dist/pm2.config.cjs: PM2 프로세스 설정 (pm2 옵션이 있을 때만)
 */
function generateProductionFiles(info: ServerBuildInfo, externals: string[]): void {
  const distDir = path.join(info.pkgDir, "dist");
  const pkgJson = JSON.parse(fs.readFileSync(path.join(info.pkgDir, "package.json"), "utf-8"));

  // dist/package.json
  logger.debug("GEN package.json...");
  const distPkgJson: Record<string, unknown> = {
    name: pkgJson.name,
    version: pkgJson.version,
    type: pkgJson.type,
  };
  if (externals.length > 0) {
    const deps: Record<string, string> = {};
    for (const ext of externals) {
      deps[ext] = "*";
    }
    distPkgJson.dependencies = deps;
  }
  fs.writeFileSync(path.join(distDir, "package.json"), JSON.stringify(distPkgJson, undefined, 2));

  // dist/mise.toml
  logger.debug("GEN mise.toml...");
  const rootMiseTomlPath = path.join(info.cwd, "mise.toml");
  let nodeVersion = "20";
  if (fs.existsSync(rootMiseTomlPath)) {
    const miseContent = fs.readFileSync(rootMiseTomlPath, "utf-8");
    const match = /node\s*=\s*"([^"]+)"/.exec(miseContent);
    if (match != null) {
      nodeVersion = match[1];
    }
  }
  fs.writeFileSync(path.join(distDir, "mise.toml"), `[tools]\nnode = "${nodeVersion}"\n`);

  // dist/openssl.cnf
  logger.debug("GEN openssl.cnf...");
  fs.writeFileSync(
    path.join(distDir, "openssl.cnf"),
    [
      "nodejs_conf = openssl_init",
      "",
      "[openssl_init]",
      "providers = provider_sect",
      "ssl_conf = ssl_sect",
      "",
      "[provider_sect]",
      "default = default_sect",
      "legacy = legacy_sect",
      "",
      "[default_sect]",
      "activate = 1",
      "",
      "[legacy_sect]",
      "activate = 1",
      "",
      "[ssl_sect]",
      "system_default = system_default_sect",
      "",
      "[system_default_sect]",
      "Options = UnsafeLegacyRenegotiation",
    ].join("\n"),
  );

  // dist/pm2.config.cjs (pm2 설정이 있을 때만)
  if (info.pm2 != null) {
    logger.debug("GEN pm2.config.cjs...");

    const pm2Name = info.pm2.name ?? pkgJson.name.replace(/@/g, "").replace(/[/\\]/g, "-");
    const ignoreWatch = JSON.stringify(["node_modules", "www", ...(info.pm2.ignoreWatchPaths ?? [])]);
    const envObj: Record<string, string> = {
      NODE_ENV: "production",
      TZ: "Asia/Seoul",
      SD_VERSION: pkgJson.version,
      ...(info.env ?? {}),
    };
    const envStr = JSON.stringify(envObj, undefined, 4);

    const interpreterLine = info.pm2.noInterpreter
      ? ""
      : `  interpreter: cp.execSync("mise which node").toString().trim(),\n`;

    const pm2Config = [
      `const cp = require("child_process");`,
      ``,
      `module.exports = {`,
      `  name: ${JSON.stringify(pm2Name)},`,
      `  script: "main.js",`,
      `  watch: true,`,
      `  watch_delay: 2000,`,
      `  ignore_watch: ${ignoreWatch},`,
      interpreterLine.trimEnd(),
      `  interpreter_args: "--openssl-config=openssl.cnf",`,
      `  env: ${envStr.replace(/\n/g, "\n  ")},`,
      `  arrayProcess: "concat",`,
      `  useDelTargetNull: true,`,
      `};`,
    ]
      .filter((line) => line !== "")
      .join("\n");

    fs.writeFileSync(path.join(distDir, "pm2.config.cjs"), pm2Config);
  }
}
```

**Step 5: Update build() function to use combined externals and generate production files**

Replace the build function body (lines 124-169) entirely:

```typescript
async function build(info: ServerBuildInfo): Promise<ServerBuildResult> {
  const mainJsPath = path.join(info.pkgDir, "dist", "main.js");

  try {
    // tsconfig 파싱
    const parsedConfig = parseRootTsconfig(info.cwd);
    const entryPoints = getPackageSourceFiles(info.pkgDir, parsedConfig);

    // 서버는 node 환경
    const compilerOptions = await getCompilerOptionsForPackage(parsedConfig.options, "node", info.pkgDir);

    // external 수집 (optional peer deps + 네이티브 모듈 + 수동 지정)
    const external = collectAllExternals(info.pkgDir, info.externals);

    // esbuild 일회성 빌드
    const esbuildOptions = createServerEsbuildOptions({
      pkgDir: info.pkgDir,
      entryPoints,
      compilerOptions,
      env: info.env,
      external,
    });

    const result = await esbuild.build(esbuildOptions);

    // Generate .config.json
    const confDistPath = path.join(info.pkgDir, "dist", ".config.json");
    fs.writeFileSync(confDistPath, JSON.stringify(info.configs ?? {}, undefined, 2));

    // 프로덕션 배포 파일 생성
    generateProductionFiles(info, external);

    const errors = result.errors.map((e) => e.text);
    return {
      success: result.errors.length === 0,
      mainJsPath,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err) {
    return {
      success: false,
      mainJsPath,
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }
}
```

**Step 6: Update startWatch() function to use combined externals**

In the `startWatch` function, replace lines 203-207 (the external collection block):

```typescript
    // 미설치 optional peer dep을 external 처리
    const external = collectUninstalledOptionalPeerDeps(info.pkgDir);
    if (external.length > 0) {
      logger.debug("미설치 optional peer deps (external):", external);
    }
```

with:

```typescript
    // external 수집 (optional peer deps + 네이티브 모듈 + 수동 지정)
    const external = collectAllExternals(info.pkgDir, info.externals);
```

**Step 7: Run typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 8: Commit**

```
feat(sd-cli): add combined externals and production file generation to server worker
```

---

### Task 4: Wire build.ts and dev.ts to pass new config fields

**Files:**
- Modify: `packages/sd-cli/src/commands/build.ts:390-396`
- Modify: `packages/sd-cli/src/commands/dev.ts:516-522`

**Step 1: Update build.ts server worker call**

In `packages/sd-cli/src/commands/build.ts`, replace lines 390-396:

```typescript
                  const buildResult = await serverWorker.build({
                    name,
                    cwd,
                    pkgDir,
                    env: { ...baseEnv, ...config.env },
                    configs: config.configs,
                  });
```

with:

```typescript
                  const buildResult = await serverWorker.build({
                    name,
                    cwd,
                    pkgDir,
                    env: { ...baseEnv, ...config.env },
                    configs: config.configs,
                    externals: config.externals,
                    pm2: config.pm2,
                  });
```

**Step 2: Update dev.ts server watch call**

In `packages/sd-cli/src/commands/dev.ts`, replace lines 516-522:

```typescript
      .startWatch({
        name,
        cwd,
        pkgDir,
        env: { ...baseEnv, ...config.env },
        configs: config.configs,
      })
```

with:

```typescript
      .startWatch({
        name,
        cwd,
        pkgDir,
        env: { ...baseEnv, ...config.env },
        configs: config.configs,
        externals: config.externals,
      })
```

**Step 3: Run typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 4: Run lint**

Run: `pnpm lint packages/sd-cli`
Expected: PASS

**Step 5: Commit**

```
feat(sd-cli): pass externals and pm2 config through build pipeline
```

---

### Task 5: Final verification

**Step 1: Full typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 2: Full lint**

Run: `pnpm lint packages/sd-cli`
Expected: PASS
