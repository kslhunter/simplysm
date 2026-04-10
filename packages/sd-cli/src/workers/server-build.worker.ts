import type ts from "typescript";
import path from "path";
import fs from "fs";
import esbuild from "esbuild";
import { createWorker, FsWatcher, pathx } from "@simplysm/core-node";
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
  writeChangedOutputFiles,
} from "../utils/esbuild-config";
import { collectAllExternals, generateProductionFiles } from "../utils/server-production-files";
import { runTscPackageBuild } from "../utils/tsc-build";
import { LintWithProgramRunner } from "../utils/lint-with-program";
import { registerCleanupHandlers, createOnceGuard, setupWorkerConsola } from "../utils/worker-utils";
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

setupWorkerConsola();

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
  lastBuilderProgram = undefined;

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
          esbuildContext = undefined; // 선제 초기화 — 생성 실패 시 disposed 참조 방지 (LOGIC-001)
          try {
            if (info.output.js) {
              esbuildContext = await createEsbuildWatchContext(info, newEntryPoints, newExternal);
            }
          } finally {
            if (oldContext != null) {
              await oldContext.dispose();
            }
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

        const hasRelevantChange = changes.some((c) => {
          if (metafileAbsPaths.has(c.path)) return true;
          // pnpm symlink 경로와 esbuild resolved 경로 불일치 대응
          try {
            const realPath = pathx.posix(fs.realpathSync(c.path));
            return metafileAbsPaths.has(realPath);
          } catch {
            return false;
          }
        });

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
