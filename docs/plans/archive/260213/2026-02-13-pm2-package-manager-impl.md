# PM2 packageManager Option Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Add a `packageManager` option (`"volta"` | `"mise"`) to server package config, controlling Node.js version manager integration in production builds.

**Architecture:** The `packageManager` field is added to `SdServerPackageConfig` (top-level, not inside `pm2`). It flows from `sd.config.ts` → `build.ts` → `ServerBuildInfo` → `generateProductionFiles()`. The `noInterpreter` option in `pm2` is removed and replaced by this new field.

**Tech Stack:** TypeScript, esbuild, child_process (for `node -v`)

---

### Task 1: Update type definitions

**Files:**
- Modify: `packages/sd-cli/src/sd-config.types.ts:187-207`
- Modify: `packages/sd-cli/src/workers/server.worker.ts:18-34`

**Step 1: Add `packageManager` to `SdServerPackageConfig` and remove `noInterpreter` from `pm2`**

In `packages/sd-cli/src/sd-config.types.ts`, replace lines 187-207:

```typescript
/**
 * 서버 패키지 설정 (Fastify 서버)
 */
export interface SdServerPackageConfig {
  /** 빌드 타겟 */
  target: "server";
  /** Node.js 버전 매니저. 미지정 시 시스템 PATH의 node 사용 */
  packageManager?: "volta" | "mise";
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
  };
}
```

**Step 2: Update `ServerBuildInfo` interface in worker**

In `packages/sd-cli/src/workers/server.worker.ts`, replace lines 18-34:

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
  /** Node.js 버전 매니저 ("volta" | "mise"). 미지정 시 시스템 PATH의 node 사용 */
  packageManager?: "volta" | "mise";
  /** PM2 설정 (지정 시 dist/pm2.config.cjs 생성) */
  pm2?: {
    name?: string;
    ignoreWatchPaths?: string[];
  };
}
```

**Step 3: Run typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS (no type errors)

**Step 4: Commit**

```
feat(sd-cli): add packageManager type to SdServerPackageConfig

Replace pm2.noInterpreter with top-level packageManager option
supporting "volta" | "mise" for Node.js version manager selection.
```

---

### Task 2: Update `generateProductionFiles()` logic

**Files:**
- Modify: `packages/sd-cli/src/workers/server.worker.ts:134-243`

**Step 1: Add `cp` import and update function signature and body**

In `packages/sd-cli/src/workers/server.worker.ts`, add `import cp from "child_process";` after the existing imports (after line 11), then replace the `generateProductionFiles` function (lines 134-243) with the new implementation.

The function changes:
1. **Function comment**: Update description — `mise.toml` is now conditional on `packageManager`
2. **package.json**: Add volta field when `packageManager === "volta"` (use `cp.execSync("node -v")` to get exact version)
3. **mise.toml**: Only generate when `packageManager === "mise"` (move from unconditional)
4. **pm2.config.cjs interpreter**: Choose based on `info.packageManager` instead of `info.pm2.noInterpreter`

New function body:

```typescript
/**
 * 프로덕션 배포용 파일 생성 (일회성 빌드에서만 호출)
 *
 * - dist/package.json: external 모듈을 dependencies로 포함 (volta 시 volta 설정 추가)
 * - dist/mise.toml: Node 버전 지정 (packageManager가 "mise"일 때만)
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
    distPkgJson["dependencies"] = deps;
  }
  if (info.packageManager === "volta") {
    const nodeVersion = cp.execSync("node -v").toString().trim().slice(1);
    distPkgJson["volta"] = { node: nodeVersion };
  }
  fs.writeFileSync(path.join(distDir, "package.json"), JSON.stringify(distPkgJson, undefined, 2));

  // dist/mise.toml (packageManager가 "mise"일 때만)
  if (info.packageManager === "mise") {
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
  }

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

    let interpreterLine = "";
    if (info.packageManager === "mise") {
      interpreterLine = `  interpreter: cp.execSync("mise which node").toString().trim(),\n`;
    } else if (info.packageManager === "volta") {
      interpreterLine = `  interpreter: cp.execSync("volta which node").toString().trim(),\n`;
    }

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

**Step 2: Run typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 3: Commit**

```
feat(sd-cli): update generateProductionFiles for packageManager

- mise.toml generation is now conditional on packageManager === "mise"
- volta: adds volta.node field to dist/package.json with exact version
- PM2 interpreter selection based on packageManager value
```

---

### Task 3: Update build command to pass `packageManager`

**Files:**
- Modify: `packages/sd-cli/src/commands/build.ts:396-404`

**Step 1: Add `packageManager` to the `serverWorker.build()` call**

In `packages/sd-cli/src/commands/build.ts`, find the `serverWorker.build()` call (around line 396) and add `packageManager`:

Replace:
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

With:
```typescript
                  const buildResult = await serverWorker.build({
                    name,
                    cwd,
                    pkgDir,
                    env: { ...baseEnv, ...config.env },
                    configs: config.configs,
                    externals: config.externals,
                    packageManager: config.packageManager,
                    pm2: config.pm2,
                  });
```

**Step 2: Run typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 3: Commit**

```
feat(sd-cli): pass packageManager from config to server worker
```

---

### Task 4: Update sd.config.ts and lint/typecheck

**Files:**
- Modify: `sd.config.ts:32-43`

**Step 1: Add `packageManager: "mise"` to solid-demo-server config**

In `sd.config.ts`, update the solid-demo-server entry to explicitly set `packageManager: "mise"` (preserving the previous behavior where mise was the default):

Replace:
```typescript
    "solid-demo-server": {
      target: "server",
      pm2: {
        ignoreWatchPaths: [],
      },
      publish: {
        type: "sftp",
        host: "simplysm.co.kr",
        path: "/srv/pm2/simplysm-demo",
        user: "simplysm",
      },
    },
```

With:
```typescript
    "solid-demo-server": {
      target: "server",
      packageManager: "mise",
      pm2: {
        ignoreWatchPaths: [],
      },
      publish: {
        type: "sftp",
        host: "simplysm.co.kr",
        path: "/srv/pm2/simplysm-demo",
        user: "simplysm",
      },
    },
```

**Step 2: Run full typecheck and lint**

Run: `pnpm typecheck packages/sd-cli`
Run: `pnpm lint packages/sd-cli`
Expected: Both PASS

**Step 3: Commit**

```
chore: set packageManager to "mise" for solid-demo-server
```

---

### Task 5: Update README documentation

**Files:**
- Modify: `packages/sd-cli/README.md`

**Step 1: Update Server Package section**

In `packages/sd-cli/README.md`, update the `SdServerPackageConfig` type documentation (around line 472-487) to reflect:
- Add `packageManager?: "volta" | "mise"` field
- Remove `noInterpreter` from `pm2` block

Update the "Server Externals & PM2 Configuration" section (around line 716-769) to document:
- New `packageManager` option with examples for volta, mise, and unset
- Updated PM2 interpreter behavior
- Updated "Generated files" table (mise.toml is now conditional)

**Step 2: Commit**

```
docs(sd-cli): update README for packageManager option
```

---

### Task 6: Final verification

**Step 1: Run full typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 2: Run lint**

Run: `pnpm lint packages/sd-cli`
Expected: PASS

**Step 3: Verify build works (optional manual test)**

Run: `pnpm build solid-demo-server`
Then check:
- `packages/solid-demo-server/dist/mise.toml` exists (since packageManager is "mise")
- `packages/solid-demo-server/dist/pm2.config.cjs` has `mise which node` interpreter
- `packages/solid-demo-server/dist/package.json` does NOT have volta field
