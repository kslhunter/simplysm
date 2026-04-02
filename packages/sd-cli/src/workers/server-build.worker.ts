import path from "path";
import fs from "fs";
import esbuild from "esbuild";
import { cpx, createWorker, FsWatcher, pathx } from "@simplysm/core-node";
import { err as errNs } from "@simplysm/core-common";
import { consola } from "consola";
import type { BuildOutput } from "../engines/types";
import type { SerializedDiagnostic } from "../utils/typecheck-serialization";
import type { LintWithProgramResult } from "../utils/lint-with-program";
import {
  parseTsconfig,
  getPackageSourceFiles,
} from "../utils/tsconfig";
import {
  createServerEsbuildOptions,
  collectAllDependencyExternals,
  writeChangedOutputFiles,
} from "../utils/esbuild-config";
import { runTscPackageBuild } from "../utils/tsc-build";
import { LintWithProgramRunner } from "../utils/lint-with-program";
import { registerCleanupHandlers, createOnceGuard, applyDebugLevel } from "../utils/worker-utils";
import { collectDeps } from "../utils/package-utils";
import { copyPublicFiles, watchPublicFiles } from "../utils/copy-public";

//#region Types

/**
 * 서버 빌드 정보 (일회성 빌드)
 */
export interface ServerBuildInfo {
  name: string;
  cwd: string;
  pkgDir: string;
  output: BuildOutput;
  /** 빌드 시 치환할 환경변수 */
  env?: Record<string, string>;
  /** 런타임 설정 (dist/.config.json에 기록) */
  configs?: Record<string, unknown>;
  /** sd.config.ts에서 수동 지정한 외부 모듈 */
  externals?: string[];
  /** PM2 설정 (지정 시 dist/pm2.config.cjs 생성) */
  pm2?: {
    name?: string;
    ignoreWatchPaths?: string[];
  };
  /** 사용할 패키지 매니저 (mise.toml 또는 volta 설정 생성에 영향) */
  packageManager?: "volta" | "mise";
}

/**
 * 서버 watch 정보
 */
export interface ServerWatchInfo {
  name: string;
  cwd: string;
  pkgDir: string;
  output: BuildOutput;
  /** 빌드 시 치환할 환경변수 */
  env?: Record<string, string>;
  /** 런타임 설정 (dist/.config.json에 기록) */
  configs?: Record<string, unknown>;
  /** sd.config.ts에서 수동 지정한 외부 모듈 */
  externals?: string[];
  /** sd.config.ts의 replaceDeps 설정 */
  replaceDeps?: Record<string, string>;
}

/**
 * 서버 빌드 결과 (LibraryBuildResult + mainJsPath 형태)
 */
export interface ServerBuildResult {
  build: { success: boolean; errors?: string[]; warnings?: string[]; diagnostics: SerializedDiagnostic[] };
  lint?: LintWithProgramResult;
  mainJsPath: string;
}

/**
 * watch 모드용 통합 빌드 이벤트
 */
export interface ServerCombinedBuildEvent {
  build: { success: boolean; errors?: string[]; warnings?: string[] };
  lint?: LintWithProgramResult;
  mainJsPath: string;
}

/**
 * 워커 이벤트 타입
 */
export interface ServerBuildWorkerEvents extends Record<string, unknown> {
  buildStart: Record<string, never>;
  build: ServerCombinedBuildEvent;
  error: { message: string };
}

//#endregion

//#region Resource Management

applyDebugLevel();

const logger = consola.withTag("sd:cli:server-build:worker");

/** esbuild 빌드 컨텍스트 (정리 대상) */
let esbuildContext: esbuild.BuildContext | undefined;

/** 마지막 빌드 metafile (리빌드 시 변경 파일 필터링용) */
let lastMetafile: esbuild.Metafile | undefined;

/** public 파일 감시자 (정리 대상) */
let publicWatcher: FsWatcher | undefined;

/** 소스 + 스코프 패키지 감시자 (정리 대상) */
let srcWatcher: FsWatcher | undefined;

async function cleanup(): Promise<void> {
  const contextToDispose = esbuildContext;
  esbuildContext = undefined;
  lastMetafile = undefined;

  const watcherToClose = publicWatcher;
  publicWatcher = undefined;

  const srcWatcherToClose = srcWatcher;
  srcWatcher = undefined;

  if (contextToDispose != null) {
    await contextToDispose.dispose();
  }
  if (watcherToClose != null) {
    await watcherToClose.close();
  }
  if (srcWatcherToClose != null) {
    await srcWatcherToClose.close();
  }
}

/**
 * 세 가지 소스에서 외부 모듈을 수집하고 병합한다.
 * collectAllDependencyExternals를 통한 단일 패스 의존성 트리 순회를 사용한다.
 */
function collectAllExternals(pkgDir: string, manualExternals?: string[]): string[] {
  logger.debug("의존성 트리 스캔 중...");
  const { optionalPeerDeps, nativeModules } = collectAllDependencyExternals(pkgDir);

  const manual = manualExternals ?? [];
  return [...new Set([...optionalPeerDeps, ...nativeModules, ...manual])];
}

/**
 * pnpm-lock.yaml의 packages 섹션을 파싱하여 name→version 맵을 생성한다.
 * Lockfile v9 형식: `packages:` 섹션의 `'name@version':` 키를 파싱한다.
 * YAML 파서 의존성을 피하기 위해 단순 라인 기반 파싱을 사용한다.
 */
function parseLockfileVersions(cwd: string): Map<string, string> {
  const lockfilePath = path.join(cwd, "pnpm-lock.yaml");
  if (!fs.existsSync(lockfilePath)) {
    throw new Error(`pnpm-lock.yaml not found in ${cwd}. Run "pnpm install" first.`);
  }

  const content = fs.readFileSync(lockfilePath, "utf-8");
  const map = new Map<string, string>();

  // "packages:" 섹션을 찾고 "'@scope/name@1.2.3':" 또는 "'name@1.2.3':" 형태의 항목을 파싱
  const lines = content.split("\n");
  let inPackages = false;
  for (const line of lines) {
    if (line === "packages:") {
      inPackages = true;
      continue;
    }
    if (inPackages && line.length > 0 && !line.startsWith(" ") && !line.startsWith("'")) {
      break; // 다음 최상위 섹션
    }
    if (!inPackages) continue;

    // "'@scope/name@version':" 또는 "'name@version':" 매칭
    const match = /^\s{2}'(.+)@(\d[^']*)':\s*$/.exec(line);
    if (match != null) {
      const name = match[1];
      const version = match[2];
      // 첫 번째 항목 유지 (lockfile은 각 버전을 한 번만 기록)
      if (!map.has(name)) {
        map.set(name, version);
      }
    }
  }

  return map;
}

/**
 * pnpm-lock.yaml에서 주어진 모든 패키지의 잠긴 버전을 확인한다.
 * lockfile에서 패키지를 찾을 수 없으면 에러를 던진다.
 */
function resolveLockedVersions(cwd: string, pkgNames: string[]): Record<string, string> {
  const versionMap = parseLockfileVersions(cwd);
  const result: Record<string, string> = {};
  for (const name of pkgNames) {
    const version = versionMap.get(name);
    if (version == null) {
      throw new Error(
        `External dependency "${name}" not found in pnpm-lock.yaml. ` +
          `Run "pnpm install" and try again.`,
      );
    }
    result[name] = version;
  }
  return result;
}

/**
 * 프로덕션 배포용 파일을 생성한다
 */
function generateProductionFiles(
  info: ServerBuildInfo,
  externals: string[],
): void {
  const distDir = path.join(info.pkgDir, "dist");
  const pkgJson = JSON.parse(fs.readFileSync(path.join(info.pkgDir, "package.json"), "utf-8"));

  // dist/package.json
  const distPkgJson: Record<string, unknown> = {
    name: pkgJson.name,
    version: pkgJson.version,
    type: pkgJson.type,
  };
  if (externals.length > 0) {
    distPkgJson["dependencies"] = resolveLockedVersions(info.cwd, externals);
  }
  if (info.packageManager === "volta") {
    const nodeVersion = cpx.spawnSync("node", ["-v"]).stdout.trim();
    distPkgJson["volta"] = { node: nodeVersion };
  }
  fs.writeFileSync(path.join(distDir, "package.json"), JSON.stringify(distPkgJson, undefined, 2));

  // dist/mise.toml
  if (info.packageManager === "mise") {
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

  // dist/pm2.config.cjs
  if (info.pm2 != null) {
    const pm2Name = info.pm2.name ?? pkgJson.name.replace(/@/g, "").replace(/[/\\]/g, "-");
    const ignoreWatch = JSON.stringify([
      "node_modules",
      "www",
      ...(info.pm2.ignoreWatchPaths ?? []),
    ]);
    const envObj: Record<string, string> = {
      NODE_ENV: "production",
      TZ: "Asia/Seoul",
      ...(info.env ?? {}),
    };
    const envStr = JSON.stringify(envObj, undefined, 4);

    const useInterpreter = info.packageManager !== "volta";

    const pm2Config = [
      ...(useInterpreter ? [`const cp = require("child_process");`, ``] : []),
      `module.exports = {`,
      `  name: ${JSON.stringify(pm2Name)},`,
      `  script: "main.js",`,
      `  watch: true,`,
      `  watch_delay: 2000,`,
      `  ignore_watch: ${ignoreWatch},`,
      ...(useInterpreter ? [`  interpreter: cp.execSync("mise which node").toString().trim(),`] : []),
      `  interpreter_args: "--openssl-config=openssl.cnf",`,
      `  env: ${envStr.replace(/\n/g, "\n  ")},`,
      `  arrayProcess: "concat",`,
      `  useDelTargetNull: true,`,
      `};`,
    ].join("\n");

    fs.writeFileSync(path.join(distDir, "pm2.config.cjs"), pm2Config);
  }
}

registerCleanupHandlers(cleanup, logger);

//#endregion

//#region Worker

/**
 * 일회성 빌드 (프로덕션)
 */
async function build(info: ServerBuildInfo): Promise<ServerBuildResult> {
  const mainJsPath = pathx.posixResolve(info.pkgDir, "dist", "main.js");
  logger.debug(`[${info.name}] server worker build 시작 (js: ${info.output.js}, dts: ${info.output.dts})`);

  try {
    // tsconfig 파싱
    const parsedConfig = parseTsconfig(info.pkgDir);
    const entryPoints = getPackageSourceFiles(info.pkgDir, parsedConfig);

    // 외부 모듈 수집
    const external = collectAllExternals(info.pkgDir, info.externals);

    // esbuild (비동기) ‖ tsc (동기) 병렬 실행
    const esbuildOptions = createServerEsbuildOptions({
      pkgDir: info.pkgDir,
      entryPoints,
      env: info.env,
      external,
    });

    const esbuildPromise = info.output.js
      ? esbuild.build(esbuildOptions).then(async (result) => {
          if (result.outputFiles) {
            await writeChangedOutputFiles(result.outputFiles);
          }
          const errors = result.errors.map((e) => e.text);
          const warnings = result.warnings.map((w) => w.text);
          return {
            success: result.errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
            warnings: warnings.length > 0 ? warnings : undefined,
          };
        }).catch((err) => ({
          success: false,
          errors: [errNs.message(err)],
          warnings: undefined,
        }))
      : null;

    // tsc 타입체크 (항상 실행, emit은 output.dts로 제어)
    const tscResult = runTscPackageBuild({
      pkgDir: info.pkgDir,
      cwd: info.cwd,
      output: { js: false, dts: info.output.dts },
      parsedConfig,
      env: info.output.env,
      includeTests: info.output.includeTests,
    });

    const jsResult = esbuildPromise
      ? await esbuildPromise
      : { success: true, errors: undefined, warnings: undefined };

    // lint 실행 (활성화 + program 사용 가능 시)
    let lint: LintWithProgramResult | undefined;
    if (info.output.lint === true && tscResult.program != null) {
      logger.debug(`[${info.name}] lint 시작`);
      const lintRunner = new LintWithProgramRunner({
        cwd: info.cwd,
        pkgName: info.name,
      });
      lint = await lintRunner.lint({ program: tscResult.program });
      logger.debug(`[${info.name}] lint 완료`);
    }

    // JS 출력이 요청된 경우에만 프로덕션 아티팩트 생성
    if (info.output.js) {
      const confDistPath = path.join(info.pkgDir, "dist", ".config.json");
      fs.writeFileSync(confDistPath, JSON.stringify(info.configs ?? {}, undefined, 2));

      await copyPublicFiles(info.pkgDir, false);

      generateProductionFiles(info, external);
    }

    const allErrors = [...(jsResult.errors ?? []), ...(tscResult.errors ?? [])];
    logger.debug(`[${info.name}] server worker build 완료 (js: ${jsResult.success}, tsc: ${tscResult.success})`);
    return {
      build: {
        success: jsResult.success && tscResult.success,
        errors: allErrors.length > 0 ? allErrors : undefined,
        warnings: jsResult.warnings,
        diagnostics: tscResult.diagnostics,
      },
      lint,
      mainJsPath,
    };
  } catch (err) {
    const message = errNs.message(err);
    const stack = err instanceof Error ? err.stack : undefined;
    logger.debug(`[${info.name}] server worker build 예외: ${message}`);
    if (stack != null) {
      logger.debug(`[${info.name}] 스택 트레이스:\n${stack}`);
    }
    return {
      build: { success: false, errors: [message], diagnostics: [] },
      mainJsPath,
    };
  }
}

const guardStartWatch = createOnceGuard("startWatch");

// watch 모드용 가변 상태
let watchInfo: ServerWatchInfo | undefined;
let watchLintRunner: LintWithProgramRunner | undefined;

/**
 * esbuild + tsc 병렬 리빌드 (watch 모드)
 */
async function rebuildAll(): Promise<ServerCombinedBuildEvent> {
  const info = watchInfo!;
  logger.debug(`[${info.name}] rebuildAll 시작`);
  const mainJsPath = pathx.posixResolve(info.pkgDir, "dist", "main.js");
  const parsedConfig = parseTsconfig(info.pkgDir);

  // esbuild 리빌드 (비동기)
  let esbuildPromise: Promise<{ success: boolean; errors?: string[]; warnings?: string[] }> | null = null;
  if (info.output.js && esbuildContext != null) {
    esbuildPromise = esbuildContext.rebuild().then(async (result) => {
      // metafile 저장
      if (result.metafile != null) {
        lastMetafile = result.metafile;
      }

      if (result.outputFiles) {
        await writeChangedOutputFiles(result.outputFiles);
      }
      const errors = result.errors.map((e) => e.text);
      const warnings = result.warnings.map((w) => w.text);
      return {
        success: result.errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    });
  }

  // tsc 리빌드 (동기, 증분)
  const tscResult = runTscPackageBuild({
    pkgDir: info.pkgDir,
    cwd: info.cwd,
    output: { js: false, dts: info.output.dts },
    parsedConfig,
    env: info.output.env,
    includeTests: info.output.includeTests,
  });

  // lint 실행 (활성화 + program 사용 가능 시)
  let lint: LintWithProgramResult | undefined;
  if (info.output.lint === true && tscResult.program != null) {
    logger.debug(`[${info.name}] lint 시작`);
    if (watchLintRunner == null) {
      watchLintRunner = new LintWithProgramRunner({
        cwd: info.cwd,
        pkgName: info.name,
      });
    }
    lint = await watchLintRunner.lint({
      program: tscResult.program,
      affectedFiles: tscResult.affectedFiles,
    });
    logger.debug(`[${info.name}] lint 완료`);
  }

  const jsResult = esbuildPromise
    ? await esbuildPromise
    : { success: true, errors: undefined, warnings: undefined };

  const allErrors = [...(jsResult.errors ?? []), ...(tscResult.errors ?? [])];
  logger.debug(`[${info.name}] rebuildAll 완료`);
  return {
    build: {
      success: jsResult.success && tscResult.success,
      errors: allErrors.length > 0 ? allErrors : undefined,
      warnings: jsResult.warnings,
    },
    lint,
    mainJsPath,
  };
}

/**
 * watch 모드용 esbuild 컨텍스트를 생성한다
 */
async function createEsbuildWatchContext(
  info: ServerWatchInfo,
  entryPoints: string[],
  external: string[],
): Promise<esbuild.BuildContext> {
  const baseOptions = createServerEsbuildOptions({
    pkgDir: info.pkgDir,
    entryPoints,
    env: info.env,
    external,
    dev: true,
  });

  return esbuild.context({
    ...baseOptions,
    metafile: true,
    write: false,
  });
}

/**
 * watch 모드 시작
 */
async function startWatch(info: ServerWatchInfo): Promise<void> {
  guardStartWatch();
  watchInfo = info;
  logger.debug(`[${info.name}] server worker startWatch 시작`);

  try {
    const parsedConfig = parseTsconfig(info.pkgDir);
    const entryPoints = getPackageSourceFiles(info.pkgDir, parsedConfig);

    // 외부 모듈 수집 (watch 모드용 캐시)
    let cachedExternal = collectAllExternals(info.pkgDir, info.externals);

    // esbuild 컨텍스트 생성 (JS 출력 필요 시)
    if (info.output.js) {
      esbuildContext = await createEsbuildWatchContext(info, entryPoints, cachedExternal);
    }

    // 초기 빌드: esbuild + tsc 병렬
    sender.send("buildStart", {});
    const initialResult = await rebuildAll();

    // 첫 빌드 시 .config.json 작성
    const confDistPath = path.join(info.pkgDir, "dist", ".config.json");
    fs.writeFileSync(confDistPath, JSON.stringify(info.configs ?? {}, undefined, 2));

    sender.send("build", initialResult);

    // public/ + public-dev/ 감시
    publicWatcher = await watchPublicFiles(info.pkgDir, true);

    // 의존성 기반 감시 경로 수집
    const { workspaceDeps, replaceDeps } = collectDeps(info.pkgDir, info.cwd, info.replaceDeps);

    const watchPaths: string[] = [];

    // 서버 패키지 자체 + workspace 의존성 패키지 소스
    const watchDirs = [
      info.pkgDir,
      ...workspaceDeps.map((d) => pathx.posixResolve(info.cwd, "packages", d)),
    ];
    for (const dir of watchDirs) {
      watchPaths.push(pathx.posixResolve(dir, "src", "**", "*"));
    }

    // replaceDeps 의존성 패키지 dist
    for (const pkg of replaceDeps) {
      watchPaths.push(pathx.posixResolve(info.cwd, "node_modules", ...pkg.split("/"), "dist", "**", "*.{js,mjs,cjs}"));
      watchPaths.push(
        pathx.posixResolve(info.pkgDir, "node_modules", ...pkg.split("/"), "dist", "**", "*.{js,mjs,cjs}"),
      );
    }

    // FsWatcher 시작
    srcWatcher = await FsWatcher.watch(watchPaths);

    srcWatcher.onChange({ delay: 300 }, async (changes) => {
      try {
        const hasFileAddOrRemove = changes.some((c) => c.event === "add" || c.event === "unlink");

        if (hasFileAddOrRemove) {
          sender.send("buildStart", {});

          // 파일 추가/삭제 시 컨텍스트 재생성
          const newParsedConfig = parseTsconfig(info.pkgDir);
          const newEntryPoints = getPackageSourceFiles(info.pkgDir, newParsedConfig);

          // package.json이 변경된 경우에만 외부 모듈 재수집
          const hasPackageJsonChange = changes.some((c) =>
            c.path.endsWith("package.json"),
          );
          if (hasPackageJsonChange) {
            cachedExternal = collectAllExternals(info.pkgDir, info.externals);
          }
          const newExternal = cachedExternal;

          const oldContext = esbuildContext;
          if (info.output.js) {
            esbuildContext = await createEsbuildWatchContext(info, newEntryPoints, newExternal);
          }
          if (oldContext != null) {
            await oldContext.dispose();
          }

          const result = await rebuildAll();
          sender.send("build", result);
          return;
        }

        // 파일 변경만 있는 경우: metafile로 필터링
        if (esbuildContext == null) {
          sender.send("buildStart", {});
          const result = await rebuildAll();
          sender.send("build", result);
          return;
        }

        if (lastMetafile == null) {
          sender.send("buildStart", {});
          const result = await rebuildAll();
          sender.send("build", result);
          return;
        }

        // metafile 입력 기반 필터링
        const metafileAbsPaths = new Set(
          Object.keys(lastMetafile.inputs).map((key) => pathx.posixResolve(info.cwd, key)),
        );

        const hasRelevantChange = changes.some((c) => metafileAbsPaths.has(c.path));

        if (hasRelevantChange) {
          sender.send("buildStart", {});
          const result = await rebuildAll();
          sender.send("build", result);
        } else {
          logger.debug("변경된 파일이 빌드에 포함되지 않아 리빌드 건너뜀");
        }
      } catch (err) {
        sender.send("error", { message: errNs.message(err) });
      }
    });
  } catch (err) {
    sender.send("error", { message: errNs.message(err) });
  }
}

/**
 * watch 중지
 */
async function stopWatch(): Promise<void> {
  await cleanup();
}

const sender = createWorker<
  { build: typeof build; startWatch: typeof startWatch; stopWatch: typeof stopWatch },
  ServerBuildWorkerEvents
>({
  build,
  startWatch,
  stopWatch,
});

export default sender;

//#endregion
