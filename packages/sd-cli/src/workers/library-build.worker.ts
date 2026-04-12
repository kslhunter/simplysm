import type ts from "typescript";
import { createWorker, FsWatcher, pathx } from "@simplysm/core-node";
import { err as errNs } from "@simplysm/core-common";
import type { SdBuildPackageConfig } from "../sd-config.types";
import type { BuildOutput } from "../engines/types";
import type { SerializedDiagnostic } from "../typecheck/typecheck-serialization";
import type { LintWithProgramResult } from "../lint/lint-with-program";
import { runTscPackageBuild } from "../utils/tsc-build";
import { LintWithProgramRunner } from "../lint/lint-with-program";
import { setupWorkerLifecycle } from "./shared-worker-lifecycle";
import { buildWatchPaths } from "./build-watch-paths";
import { hasFileAddOrRemove, shouldSkipRebuild } from "./build-change-filter";

//#region Types

export interface LibraryBuildInfo {
  name: string;
  config: SdBuildPackageConfig;
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

async function cleanup(): Promise<void> {
  const watcherToClose = fsWatcher;
  fsWatcher = undefined;
  lastSourceFilePaths = undefined;
  lastBuilderProgram = undefined;
  await watcherToClose?.close();
}

const { logger, guardStartWatch } = setupWorkerLifecycle("library-build", cleanup);

//#endregion

//#region build (one-time build)

async function build(info: LibraryBuildInfo): Promise<LibraryBuildResult> {
  logger.debug(`[${info.name}] library worker build 시작 (pkgDir: ${info.pkgDir})`);
  const tscResult = runTscPackageBuild({
    pkgDir: info.pkgDir,
    cwd: info.cwd,
    output: info.output,
    env: info.output.env,
    includeTests: info.output.includeTests,
  });
  logger.debug(`[${info.name}] library worker build 완료 (success: ${tscResult.success})`);

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

  return {
    build: {
      success: tscResult.success,
      errors: tscResult.errors,
      warnings: undefined,
      diagnostics: tscResult.diagnostics,
    },
    lint,
  };
}

//#endregion

//#region startWatch (watch mode)

// watch 모드용 가변 상태
let watchInfo: LibraryBuildInfo | undefined;
let watchLintRunner: LintWithProgramRunner | undefined;
let lastSourceFilePaths: Set<string> | undefined;
let lastBuilderProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram | undefined;

function extractSourceFilePaths(program: ts.Program | undefined): Set<string> | undefined {
  if (program == null) return undefined;
  const paths = new Set<string>();
  for (const sf of program.getSourceFiles()) {
    paths.add(pathx.posix(sf.fileName));
  }
  return paths;
}

async function rebuildAll(): Promise<CombinedBuildEvent> {
  const info = watchInfo!;
  logger.debug(`[${info.name}] rebuildAll 시작`);

  const tscResult = runTscPackageBuild({
    pkgDir: info.pkgDir,
    cwd: info.cwd,
    output: info.output,
    env: info.output.env,
    includeTests: info.output.includeTests,
    oldBuilderProgram: lastBuilderProgram,
  });
  lastBuilderProgram = tscResult.builderProgram ?? lastBuilderProgram;

  // 의존성 필터링을 위한 소스 파일 경로 업데이트
  lastSourceFilePaths = extractSourceFilePaths(tscResult.program) ?? lastSourceFilePaths;

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

  logger.debug(`[${info.name}] rebuildAll 완료`);
  return {
    build: { success: tscResult.success, errors: tscResult.errors },
    lint,
  };
}

async function startWatch(info: LibraryBuildInfo): Promise<void> {
  guardStartWatch();
  watchInfo = info;

  try {
    // 초기 빌드
    const initialResult = await rebuildAll();
    sender.send("build", initialResult);

    // workspace 의존성 경로 + replaceDeps 수집
    const { watchPaths } = buildWatchPaths({
      pkgDir: info.pkgDir,
      cwd: info.cwd,
      srcGlobs: ["*.ts"],
      replaceDeps: info.replaceDeps,
    });

    // FsWatcher 시작 — 자체 src/ + workspace 의존성 src/ + replaceDeps dist/
    logger.debug(`[${info.name}] FsWatcher 시작`);
    fsWatcher = await FsWatcher.watch(watchPaths);

    fsWatcher.onChange({ delay: 300 }, async (changes) => {
      try {
        if (shouldSkipRebuild(changes.map((c) => c.path), hasFileAddOrRemove(changes), lastSourceFilePaths, logger)) {
          return;
        }

        sender.send("buildStart", {});
        const result = await rebuildAll();
        sender.send("build", result);
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
