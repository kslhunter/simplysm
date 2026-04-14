import type ts from "typescript";
import path from "path";
import fs from "fs";
import esbuild from "esbuild";
import { createWorker, FsWatcher, pathx } from "@simplysm/core-node";
import { err as errNs } from "@simplysm/core-common";
import { formatEsbuildMessage } from "../utils/output-utils.js";
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
import { createTscPlugin } from "../esbuild/esbuild-tsc-plugin";
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

    let jsResult: { success: boolean; errors?: string[]; warnings?: string[] };
    let tscErrors: string[];
    let tscDiagnostics: SerializedDiagnostic[];
    let tscProgram: ts.Program | undefined;

    if (info.output.js) {
      // js=true: tsc 플러그인 통합 — 단일 esbuild.build() 호출
      const tscPlugin = createTscPlugin({
        pkgDir: info.pkgDir,
        cwd: info.cwd,
        output: { dts: info.output.dts },
        env: info.output.env,
        includeTests: info.output.includeTests,
      });

      const esbuildOptions = createServerEsbuildOptions({
        pkgDir: info.pkgDir,
        entryPoints,
        env: info.env,
        external,
      });

      jsResult = await esbuild.build({ ...esbuildOptions, plugins: [tscPlugin.plugin] })
        .then(async (result) => {
          if (result.outputFiles) {
            await writeChangedOutputFiles(result.outputFiles);
          }
          const errors = result.errors.map(formatEsbuildMessage);
          const warnings = result.warnings.map(formatEsbuildMessage);
          return {
            success: result.errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
            warnings: warnings.length > 0 ? warnings : undefined,
          };
        })
        .catch((err) => ({
          success: false,
          errors: [errNs.message(err)],
          warnings: undefined,
        }));

      tscErrors = tscPlugin.getErrors() ?? [];
      tscDiagnostics = tscPlugin.getDiagnostics();
      tscProgram = tscPlugin.getProgram();
    } else {
      // js=false: runTscPackageBuild 직접 호출 (플러그인 경유 불가)
      const tscResult = runTscPackageBuild({
        pkgDir: info.pkgDir,
        cwd: info.cwd,
        output: { js: false, dts: info.output.dts },
        parsedConfig,
        env: info.output.env,
        includeTests: info.output.includeTests,
      });

      jsResult = { success: true, errors: undefined, warnings: undefined };
      tscErrors = tscResult.errors ?? [];
      tscDiagnostics = tscResult.diagnostics;
      tscProgram = tscResult.program;
    }

    // lint 실행 (활성화 + program 사용 가능 시)
    let lint: LintWithProgramResult | undefined;
    if (info.output.lint === true && tscProgram != null) {
      logger.debug(`[${info.name}] lint 시작`);
      const lintRunner = new LintWithProgramRunner({
        cwd: info.cwd,
        pkgName: info.name,
      });
      lint = await lintRunner.lint({ program: tscProgram });
      logger.debug(`[${info.name}] lint 완료`);
    }

    // JS 출력이 요청된 경우에만 프로덕션 아티팩트 생성
    if (info.output.js) {
      const confDistPath = path.join(info.pkgDir, "dist", ".config.json");
      fs.writeFileSync(confDistPath, JSON.stringify(info.configs ?? {}, undefined, 2));

      await copyPublicFiles(info.pkgDir, false);

      generateProductionFiles(info, external);
    }

    const allErrors = [...(jsResult.errors ?? []), ...tscErrors];
    const tscSuccess = tscErrors.length === 0;
    logger.debug(`[${info.name}] server worker build 완료 (js: ${jsResult.success}, tsc: ${tscSuccess})`);
    return {
      build: {
        success: jsResult.success && tscSuccess,
        errors: allErrors.length > 0 ? allErrors : undefined,
        warnings: jsResult.warnings,
        diagnostics: tscDiagnostics,
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

/**
 * watch 모드 시작
 */
async function startWatch(info: ServerWatchInfo): Promise<void> {
  guardStartWatch();
  logger.debug(`[${info.name}] server worker startWatch 시작`);

  // watch 모드 로컬 상태 (클로저로 관리)
  let lastBuilderProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram | undefined;
  let watchLintRunner: LintWithProgramRunner | undefined;

  /**
   * esbuild + tsc 리빌드 (watch 모드)
   * js=true: esbuildCtx.rebuild() 단일 호출 (tsc 플러그인 자동 트리거)
   * js=false: runTscPackageBuild 직접 호출
   */
  async function rebuildAll(): Promise<ServerCombinedBuildEvent> {
    logger.debug(`[${info.name}] rebuildAll 시작`);
    const mainJsPath = pathx.posixResolve(info.pkgDir, "dist", "main.js");

    let jsResult: { success: boolean; errors?: string[]; warnings?: string[] };
    let tscProgram: ts.Program | undefined;
    let tscAffectedFiles: ReadonlySet<string> | undefined;
    let tscErrors: string[];

    if (info.output.js) {
      // js=true: esbuildCtx.rebuild() 단일 호출 (tsc 에러 자동 병합)
      const rebuildResult = await esbuildCtx.rebuild();
      jsResult = rebuildResult ?? { success: true, errors: undefined, warnings: undefined };
      tscProgram = esbuildCtx.getTscProgram();
      tscAffectedFiles = esbuildCtx.getTscAffectedFiles();
      tscErrors = [];
    } else {
      // js=false: runTscPackageBuild 직접 호출
      const parsedConfig = parseTsconfig(info.pkgDir);
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

      jsResult = { success: true, errors: undefined, warnings: undefined };
      tscProgram = tscResult.program;
      tscAffectedFiles = tscResult.affectedFiles;
      tscErrors = tscResult.errors ?? [];
    }

    // lint 실행 (활성화 + program 사용 가능 시)
    let lint: LintWithProgramResult | undefined;
    if (info.output.lint === true && tscProgram != null) {
      logger.debug(`[${info.name}] lint 시작`);
      if (watchLintRunner == null) {
        watchLintRunner = new LintWithProgramRunner({
          cwd: info.cwd,
          pkgName: info.name,
        });
      }
      lint = await watchLintRunner.lint({
        program: tscProgram,
        affectedFiles: tscAffectedFiles,
      });
      logger.debug(`[${info.name}] lint 완료`);
    }

    const allErrors = [...(jsResult.errors ?? []), ...tscErrors];
    const allSuccess = jsResult.success && tscErrors.length === 0;
    logger.debug(`[${info.name}] rebuildAll 완료`);
    return {
      build: {
        success: allSuccess,
        errors: allErrors.length > 0 ? allErrors : undefined,
        warnings: jsResult.warnings,
      },
      lint,
      mainJsPath,
    };
  }

  try {
    const parsedConfig = parseTsconfig(info.pkgDir);
    const entryPoints = getPackageSourceFiles(info.pkgDir, parsedConfig);

    // 외부 모듈 수집 (watch 모드용 — watch manager가 자체 캐시를 유지)
    const cachedExternal = collectAllExternals(info.pkgDir, info.externals);

    // esbuild 컨텍스트 생성 (JS 출력 필요 시, tsc 플러그인 포함)
    if (info.output.js) {
      await esbuildCtx.createContext({
        pkgDir: info.pkgDir,
        entryPoints,
        env: info.env,
        external: cachedExternal,
        tsc: {
          cwd: info.cwd,
          output: { dts: info.output.dts },
          env: info.output.env,
          includeTests: info.output.includeTests,
        },
      });
    }

    // 초기 빌드
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
