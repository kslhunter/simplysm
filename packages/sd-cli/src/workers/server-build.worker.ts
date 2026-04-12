import type ts from "typescript";
import path from "path";
import fs from "fs";
import esbuild from "esbuild";
import { createWorker, FsWatcher, pathx } from "@simplysm/core-node";
import { err as errNs } from "@simplysm/core-common";
import type { BuildOutput } from "../engines/types";
import type { SerializedDiagnostic } from "../typecheck/typecheck-serialization";
import type { LintWithProgramResult } from "../lint/lint-with-program";
import {
  parseTsconfig,
  getPackageSourceFiles,
} from "../utils/tsconfig";
import {
  createServerEsbuildOptions,
  writeChangedOutputFiles,
} from "../esbuild/esbuild-config";
import { collectAllExternals, generateProductionFiles } from "../deps/server-externals/server-production-files";
import { runTscPackageBuild } from "../utils/tsc-build";
import { LintWithProgramRunner } from "../lint/lint-with-program";
import { setupWorkerLifecycle } from "./shared-worker-lifecycle";
import { buildWatchPaths } from "./build-watch-paths";
import { copyPublicFiles, watchPublicFiles } from "../utils/copy-public";
import * as esbuildCtx from "./server-esbuild-context";
import { startServerWatchLoop } from "./server-watch-manager";

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

/** public 파일 감시자 (정리 대상) */
let publicWatcher: FsWatcher | undefined;

/** 소스 + 스코프 패키지 감시자 (정리 대상) */
let srcWatcher: FsWatcher | undefined;

async function cleanup(): Promise<void> {
  await esbuildCtx.dispose();
  lastBuilderProgram = undefined;

  const watcherToClose = publicWatcher;
  publicWatcher = undefined;

  const srcWatcherToClose = srcWatcher;
  srcWatcher = undefined;

  if (watcherToClose != null) {
    await watcherToClose.close();
  }
  if (srcWatcherToClose != null) {
    await srcWatcherToClose.close();
  }
}

const { logger, guardStartWatch } = setupWorkerLifecycle("server-build", cleanup);

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

// watch 모드용 가변 상태
let watchInfo: ServerWatchInfo | undefined;
let watchLintRunner: LintWithProgramRunner | undefined;
let lastBuilderProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram | undefined;

/**
 * esbuild + tsc 병렬 리빌드 (watch 모드)
 */
async function rebuildAll(): Promise<ServerCombinedBuildEvent> {
  const info = watchInfo!;
  logger.debug(`[${info.name}] rebuildAll 시작`);
  const mainJsPath = pathx.posixResolve(info.pkgDir, "dist", "main.js");
  const parsedConfig = parseTsconfig(info.pkgDir);

  // esbuild 리빌드 (비동기)
  const esbuildPromise = info.output.js ? esbuildCtx.rebuild() : null;

  // tsc 리빌드 (동기, 증분)
  const tscResult = runTscPackageBuild({
    pkgDir: info.pkgDir,
    cwd: info.cwd,
    output: { js: false, dts: info.output.dts },
    parsedConfig,
    env: info.output.env,
    includeTests: info.output.includeTests,
    oldBuilderProgram: lastBuilderProgram,
  });
  lastBuilderProgram = tscResult.builderProgram ?? lastBuilderProgram;

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

  const jsResult = esbuildPromise != null
    ? (await esbuildPromise) ?? { success: true, errors: undefined, warnings: undefined }
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
 * watch 모드 시작
 */
async function startWatch(info: ServerWatchInfo): Promise<void> {
  guardStartWatch();
  watchInfo = info;
  logger.debug(`[${info.name}] server worker startWatch 시작`);

  try {
    const parsedConfig = parseTsconfig(info.pkgDir);
    const entryPoints = getPackageSourceFiles(info.pkgDir, parsedConfig);

    // 외부 모듈 수집 (watch 모드용 — watch manager가 자체 캐시를 유지)
    const cachedExternal = collectAllExternals(info.pkgDir, info.externals);

    // esbuild 컨텍스트 생성 (JS 출력 필요 시)
    if (info.output.js) {
      await esbuildCtx.createContext({
        pkgDir: info.pkgDir,
        entryPoints,
        env: info.env,
        external: cachedExternal,
      });
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

    // 의존성 기반 감시 경로 수집 + FsWatcher 감시 루프 시작
    const { watchPaths } = buildWatchPaths({
      pkgDir: info.pkgDir,
      cwd: info.cwd,
      srcGlobs: ["*"],
      replaceDeps: info.replaceDeps,
    });

    srcWatcher = await startServerWatchLoop({
      info,
      watchPaths,
      logger,
      initialExternals: cachedExternal,
      onBuildStart: () => sender.send("buildStart", {}),
      onBuild: (result) => sender.send("build", result),
      onError: (message) => sender.send("error", { message }),
      rebuild: () => rebuildAll(),
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
