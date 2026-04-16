import path from "path";
import type ts from "typescript";
import { createWorker, FsWatcher, pathx } from "@simplysm/core-node";
import { err as errNs } from "@simplysm/core-common";
import type { BuildOutput } from "../engines/types";
import type { SerializedDiagnostic } from "../typecheck/typecheck-serialization";
import type { LintWithProgramResult } from "../lint/lint-with-program";
import { SdTsCompiler } from "../ts-compiler/SdTsCompiler";
import type { ISdTsCompilerResult } from "../ts-compiler/sd-ts-compiler-result";
import { writeEmitResults, compileSideEffectScss } from "../angular/ngtsc-build-core";
import { setupWorkerLifecycle } from "./shared-worker-lifecycle";
import { buildWatchPaths } from "./build-watch-paths";
import { hasFileAddOrRemove, shouldSkipRebuild } from "./build-change-filter";

//#region Types

export interface LibraryBuildInfo {
  name: string;
  cwd: string;
  pkgDir: string;
  output: BuildOutput;
  /** sd.config.ts의 replaceDeps 설정 */
  replaceDeps?: Record<string, string>;
}

export interface LibraryBuildResult {
  build: { success: boolean; errors?: string[]; warnings?: string[]; diagnostics: SerializedDiagnostic[] };
  lint?: LintWithProgramResult;
}

export interface CombinedBuildEvent {
  build: { success: boolean; errors?: string[]; warnings?: string[] };
  lint?: LintWithProgramResult;
}

export interface LibraryBuildWorkerEvents extends Record<string, unknown> {
  buildStart: Record<string, never>;
  build: CombinedBuildEvent;
  error: { message: string };
}

//#endregion

//#region Resource Management

let fsWatcher: FsWatcher | undefined;
let compiler: SdTsCompiler | undefined;
let combinedScssDeps = new Map<string, Set<string>>();

async function cleanup(): Promise<void> {
  const watcherToClose = fsWatcher;
  fsWatcher = undefined;
  compiler = undefined;
  lastSourceFilePaths = undefined;
  combinedScssDeps = new Map();
  await watcherToClose?.close();
}

const { logger, guardStartWatch } = setupWorkerLifecycle("library-build", cleanup);

//#endregion

//#region build (one-time build)

async function build(info: LibraryBuildInfo): Promise<LibraryBuildResult> {
  logger.debug(`[${info.name}] library worker build 시작 (pkgDir: ${info.pkgDir})`);

  try {
    compiler = new SdTsCompiler({
      pkgDir: info.pkgDir,
      cwd: info.cwd,
      output: { js: info.output.js, dts: info.output.dts },
      includeTests: info.output.includeTests,
      env: info.output.env,
      lint: info.output.lint,
      globalScss: info.output.globalScss,
    });
    const result = await compiler.compileAsync();
    const isAngular = info.output.globalScss === true;

    // Angular: emit 결과 디스크 쓰기 + side-effect SCSS 처리
    const sideEffectScssErrors: string[] = [];
    if (result.emitResults != null) {
      const normalizedSrcDir = pathx.posix(path.join(info.pkgDir, "src"));
      const filteredEmitResults = result.emitResults.filter((r) =>
        pathx.posix(r.sourceFileName).startsWith(normalizedSrcDir + "/"),
      );

      if (isAngular) {
        const loadPaths = [path.join(info.pkgDir, "scss"), path.join(info.cwd, "node_modules")];
        writeEmitResults(filteredEmitResults, info.pkgDir, {
          loadPaths,
          scssErrors: sideEffectScssErrors,
          scssDependencies: combinedScssDeps,
          registry: compiler.sideEffectScssRegistry,
        });
        // 초기 빌드: 등록된 side-effect SCSS 전체 컴파일
        compileSideEffectScss(
          compiler.sideEffectScssRegistry,
          loadPaths,
          sideEffectScssErrors,
          combinedScssDeps,
        );
      } else {
        writeEmitResults(filteredEmitResults, info.pkgDir);
      }
    }

    // 에러 통합 (ts errors + scss errors + side-effect scss errors)
    const allErrors = [...(result.errors ?? []), ...result.scssErrors, ...sideEffectScssErrors];

    logger.debug(`[${info.name}] library worker build 완료 (success: ${result.errorCount === 0})`);
    return {
      build: {
        success:
          result.errorCount === 0 &&
          result.scssErrors.length === 0 &&
          sideEffectScssErrors.length === 0,
        errors: allErrors.length > 0 ? allErrors : undefined,
        warnings: undefined,
        diagnostics: result.diagnostics,
      },
      lint: result.lint,
    };
  } catch (err) {
    const message = errNs.message(err);
    logger.debug(`[${info.name}] library worker build 예외 발생: ${message}`);
    return {
      build: { success: false, errors: [message], diagnostics: [] },
    };
  }
}

//#endregion

//#region startWatch (watch mode)

// watch 모드용 가변 상태
let lastSourceFilePaths: Set<string> | undefined;

function extractSourceFilePaths(program: ts.Program | undefined): Set<string> | undefined {
  if (program == null) return undefined;
  const paths = new Set<string>();
  for (const sf of program.getSourceFiles()) {
    paths.add(pathx.posix(sf.fileName));
  }
  return paths;
}

/** compile-time SCSS 의존성으로 combinedScssDeps를 갱신한다 */
function updateCombinedScssDeps(result: ISdTsCompilerResult): void {
  combinedScssDeps = new Map();
  for (const [file, deps] of result.scssDependencies) {
    combinedScssDeps.set(file, new Set(deps));
  }
}

/**
 * SdTsCompiler 결과를 CombinedBuildEvent로 변환한다.
 * Angular일 경우 emit 디스크 쓰기 + side-effect SCSS 처리를 포함한다.
 */
function buildWatchEvent(
  info: LibraryBuildInfo,
  result: ISdTsCompilerResult,
  hasScssChanges: boolean,
): CombinedBuildEvent {
  const isAngular = info.output.globalScss === true;

  if (isAngular && result.emitResults != null) {
    const normalizedSrcDir = pathx.posix(path.join(info.pkgDir, "src"));
    const loadPaths = [path.join(info.pkgDir, "scss"), path.join(info.cwd, "node_modules")];
    const sideEffectScssErrors: string[] = [];

    // emit 결과 디스크 쓰기 (side-effect SCSS 등록 포함)
    writeEmitResults(
      result.emitResults.filter((r) =>
        pathx.posix(r.sourceFileName).startsWith(normalizedSrcDir + "/"),
      ),
      info.pkgDir,
      {
        loadPaths,
        scssErrors: sideEffectScssErrors,
        scssDependencies: combinedScssDeps,
        registry: compiler!.sideEffectScssRegistry,
      },
    );

    // SCSS 변경 시 side-effect SCSS 재컴파일
    if (hasScssChanges) {
      compileSideEffectScss(
        compiler!.sideEffectScssRegistry,
        loadPaths,
        sideEffectScssErrors,
        combinedScssDeps,
      );
    }

    // 모든 에러 통합
    const allErrors = [...(result.errors ?? []), ...result.scssErrors, ...sideEffectScssErrors];
    return {
      build: {
        success:
          result.errorCount === 0 &&
          result.scssErrors.length === 0 &&
          sideEffectScssErrors.length === 0,
        errors: allErrors.length > 0 ? allErrors : undefined,
      },
      lint: result.lint,
    };
  }

  // Non-Angular 경로
  return {
    build: {
      success: result.errorCount === 0,
      errors: result.errors,
    },
    lint: result.lint,
  };
}

async function startWatch(info: LibraryBuildInfo): Promise<void> {
  guardStartWatch();
  const isAngular = info.output.globalScss === true;

  compiler = new SdTsCompiler({
    pkgDir: info.pkgDir,
    cwd: info.cwd,
    output: { js: info.output.js, dts: info.output.dts },
    includeTests: info.output.includeTests,
    env: info.output.env,
    lint: info.output.lint,
    globalScss: info.output.globalScss,
  });

  try {
    // 초기 빌드
    const initialResult = await compiler.compileAsync();
    lastSourceFilePaths = extractSourceFilePaths(initialResult.program) ?? lastSourceFilePaths;
    if (isAngular) {
      updateCombinedScssDeps(initialResult);
    }
    const initialEvent = buildWatchEvent(info, initialResult, isAngular);
    sender.send("build", initialEvent);

    // workspace 의존성 경로 + replaceDeps 수집
    const { watchPaths } = buildWatchPaths({
      pkgDir: info.pkgDir,
      cwd: info.cwd,
      srcGlobs: isAngular ? ["*.{ts,scss,css}"] : ["*.ts"],
      extraDirs: isAngular ? [{ dir: "scss", globs: ["*.{scss,css}"] }] : undefined,
      replaceDeps: info.replaceDeps,
    });

    // FsWatcher 시작 — 자체 src/ + workspace 의존성 src/ + replaceDeps dist/
    logger.debug(`[${info.name}] FsWatcher 시작`);
    fsWatcher = await FsWatcher.watch(watchPaths);

    fsWatcher.onChange({ delay: 300 }, async (changedFiles) => {
      try {
        const addOrRemove = hasFileAddOrRemove(changedFiles);

        // 변경된 파일 수집
        const modifiedFiles = new Set<string>();
        for (const f of changedFiles) {
          modifiedFiles.add(f.path);

          // Angular: SCSS 역방향 의존성 탐색
          if (isAngular && (f.path.endsWith(".scss") || f.path.endsWith(".css"))) {
            const normalizedPath = pathx.posix(f.path);
            for (const [ownerFile, deps] of combinedScssDeps) {
              if (deps.has(normalizedPath)) {
                modifiedFiles.add(ownerFile);
              }
            }
          }
        }

        // 의존성 필터: 관련 변경이 없으면 리빌드 건너뜀
        if (shouldSkipRebuild(modifiedFiles, addOrRemove, lastSourceFilePaths, logger)) {
          return;
        }

        sender.send("buildStart", {});

        const result = await compiler!.compileAsync(modifiedFiles);
        lastSourceFilePaths = extractSourceFilePaths(result.program) ?? lastSourceFilePaths;
        if (isAngular) {
          updateCombinedScssDeps(result);
        }

        const hasScssChanges = changedFiles.some(
          (f) => f.path.endsWith(".scss") || f.path.endsWith(".css"),
        );

        const event = buildWatchEvent(info, result, hasScssChanges);
        sender.send("build", event);
      } catch (err) {
        sender.send("error", { message: errNs.message(err) });
      }
    });
  } catch (err) {
    sender.send("error", { message: errNs.message(err) });
  }
}

async function stopWatch(): Promise<void> {
  await cleanup();
}

//#endregion

const sender = createWorker<
  { build: typeof build; startWatch: typeof startWatch; stopWatch: typeof stopWatch },
  LibraryBuildWorkerEvents
>({
  build,
  startWatch,
  stopWatch,
});

export default sender;
