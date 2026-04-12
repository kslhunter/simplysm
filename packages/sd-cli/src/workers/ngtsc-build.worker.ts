import path from "path";
import { createWorker, FsWatcher, pathx } from "@simplysm/core-node";
import { err as errNs } from "@simplysm/core-common";
import { setupWorkerLifecycle } from "./shared-worker-lifecycle";
import { buildWatchPaths } from "./build-watch-paths";
import { hasFileAddOrRemove, shouldSkipRebuild } from "./build-change-filter";
import {
  buildCompilerOptions,
  buildScssLoadPaths,
  compileSideEffectScss,
  compileGlobalScss,
  type NgtscBuildInfo,
  type NgtscBuildResult,
  type NgtscCombinedBuildEvent,
  type SideEffectScssEntry,
} from "../angular/ngtsc-build-core";
import { serializeDiagnostic } from "../typecheck/typecheck-serialization";
import { LintWithProgramRunner, type LintWithProgramResult } from "../lint/lint-with-program";
import {
  parseTsconfig,
  getPackageSourceFiles,
  getPackageFiles,
  getCompilerOptionsForEnv,
} from "../utils/tsconfig";
import { AngularBuildPipeline } from "../angular/angular-build-pipeline";
import { AngularSourceFileCache } from "../angular/angular-compiler";

//#region 타입 (워커 인터페이스용 re-export)

export type { NgtscBuildInfo, NgtscBuildResult, NgtscCombinedBuildEvent };

export interface NgtscBuildWorkerEvents extends Record<string, unknown> {
  buildStart: Record<string, never>;
  build: NgtscCombinedBuildEvent;
  error: { message: string };
}

//#endregion

//#region Resource Management

let fsWatcher: FsWatcher | undefined;

async function cleanup(): Promise<void> {
  const watcherToClose = fsWatcher;
  fsWatcher = undefined;
  _watchPipeline = undefined;
  lastSourceFilePaths = undefined;

  if (watcherToClose != null) {
    await watcherToClose.close();
  }
}

const { logger, guardStartWatch } = setupWorkerLifecycle("ngtsc-build", cleanup);

//#endregion

//#region build (one-time build)

async function build(info: NgtscBuildInfo): Promise<NgtscBuildResult> {
  logger.debug(`[${info.name}] ngtsc worker build 시작 (pkgDir: ${info.pkgDir})`);

  try {
    const buildInfo = { ...info, env: info.output.env };
    const parsedConfig = parseTsconfig(buildInfo.pkgDir);
    const sourceFiles = buildInfo.output.includeTests === true
      ? getPackageFiles(buildInfo.pkgDir, parsedConfig)
      : getPackageSourceFiles(buildInfo.pkgDir, parsedConfig);
    const baseOptions =
      buildInfo.env != null
        ? getCompilerOptionsForEnv(parsedConfig.options, buildInfo.env, buildInfo.pkgDir)
        : parsedConfig.options;
    const compilerOptions = buildCompilerOptions(baseOptions, buildInfo.pkgDir, buildInfo.output);
    const angularOptions = (parsedConfig.raw?.angularCompilerOptions ?? {}) as Record<string, unknown>;

    const pipeline = new AngularBuildPipeline({
      mode: "library",
      pkgDir: buildInfo.pkgDir,
      cwd: buildInfo.cwd,
      rootNames: sourceFiles,
      compilerOptions,
      angularCompilerOptions: angularOptions,
    });

    const pipelineResult = await pipeline.initialize();

    // emit → 디스크 쓰기 (src/ 하위만)
    const normalizedSrcDir = pathx.posix(path.join(buildInfo.pkgDir, "src"));
    pipeline.writeEmitResults({
      pkgDir: buildInfo.pkgDir,
      sourceFilter: (fileName) => pathx.posix(fileName).startsWith(normalizedSrcDir + "/"),
    });

    // global SCSS
    const globalScssErrors = compileGlobalScss(buildInfo.pkgDir, buildScssLoadPaths(buildInfo));

    // diagnostics 직렬화
    const rawDiags = pipeline.collectRawDiagnostics();
    const serialized = rawDiags.map(serializeDiagnostic);
    const errors = pipelineResult.diagnostics.errors.map((e) => e.message);
    const allErrors = [...errors, ...pipelineResult.scssErrors, ...globalScssErrors];

    const result: NgtscBuildResult = {
      build: {
        success: pipelineResult.diagnostics.errors.length === 0
          && pipelineResult.scssErrors.length === 0
          && globalScssErrors.length === 0,
        errors: allErrors.length > 0 ? allErrors : undefined,
        diagnostics: serialized,
      },
    };

    // lint
    if (info.output.lint === true) {
      logger.debug(`[${info.name}] lint 시작`);
      const lintRunner = new LintWithProgramRunner({
        cwd: info.cwd,
        pkgName: info.name,
      });
      result.lint = await lintRunner.lint({ program: pipeline.getTsProgram() });
      logger.debug(`[${info.name}] lint 완료`);
    }

    logger.debug(`[${info.name}] ngtsc worker build 완료 (build.success: ${result.build.success})`);
    return result;
  } catch (err) {
    const message = errNs.message(err);
    logger.debug(`[${info.name}] ngtsc worker build 예외 발생: ${message}`);
    return {
      build: { success: false, errors: [message], diagnostics: [] },
    };
  }
}

//#endregion

//#region startWatch (watch mode)

let watchInfo: NgtscBuildInfo | undefined;
let _watchPipeline: AngularBuildPipeline | undefined;
let watchLintRunner: LintWithProgramRunner | undefined;
let lastSourceFilePaths: Set<string> | undefined;
const sideEffectScssRegistry = new Map<string, SideEffectScssEntry>();

function extractSourceFilePaths(program: { getSourceFiles(): readonly { fileName: string }[] }): Set<string> {
  const paths = new Set<string>();
  for (const sf of program.getSourceFiles()) {
    paths.add(pathx.posix(sf.fileName));
  }
  return paths;
}

/**
 * Pipeline 빌드 결과 + side-effect/global SCSS를 통합하여 NgtscCombinedBuildEvent를 생성한다.
 */
async function buildWatchEvent(
  info: NgtscBuildInfo,
  pipeline: AngularBuildPipeline,
  loadPaths: string[],
  hasScssChanges: boolean,
  affectedFileNames?: ReadonlySet<string>,
): Promise<NgtscCombinedBuildEvent> {
  logger.debug(`[${info.name}] buildWatchEvent 시작`);
  const normalizedSrcDir = pathx.posix(path.join(info.pkgDir, "src"));

  // Pipeline의 SCSS 의존성 맵을 공유하여 역방향 탐색 통합
  const scssDepsMap = pipeline.getScssDependencies();
  const sideEffectScssErrors: string[] = [];

  // emit → 디스크 쓰기 (src/ 하위만)
  pipeline.writeEmitResults({
    pkgDir: info.pkgDir,
    sourceFilter: (fileName) => pathx.posix(fileName).startsWith(normalizedSrcDir + "/"),
    scss: {
      loadPaths,
      scssErrors: sideEffectScssErrors,
      scssDependencies: scssDepsMap,
      registry: sideEffectScssRegistry,
    },
  });

  // side-effect SCSS 컴파일 (.scss/.css 변경 시에만)
  if (hasScssChanges) {
    compileSideEffectScss(sideEffectScssRegistry, loadPaths, sideEffectScssErrors, scssDepsMap);
  }

  // global SCSS 컴파일
  const globalScssErrors = compileGlobalScss(info.pkgDir, loadPaths);

  const diagnostics = pipeline.getDiagnostics();
  const pipelineScssErrors = pipeline.getScssErrors();
  const errors = diagnostics.errors.map((e) => e.message);
  const allErrors = [...errors, ...pipelineScssErrors, ...sideEffectScssErrors, ...globalScssErrors];

  // lint 실행 (활성화 시)
  let lint: LintWithProgramResult | undefined;
  if (info.output.lint === true) {
    logger.debug(`[${info.name}] lint 시작`);
    if (watchLintRunner == null) {
      watchLintRunner = new LintWithProgramRunner({
        cwd: info.cwd,
        pkgName: info.name,
      });
    }
    lint = await watchLintRunner.lint({
      program: pipeline.getTsProgram(),
      affectedFiles: affectedFileNames,
    });
    logger.debug(`[${info.name}] lint 완료`);
  }

  logger.debug(`[${info.name}] buildWatchEvent 완료`);
  return {
    build: {
      success: diagnostics.errors.length === 0
        && pipelineScssErrors.length === 0
        && sideEffectScssErrors.length === 0
        && globalScssErrors.length === 0,
      errors: allErrors.length > 0 ? allErrors : undefined,
    },
    lint,
  };
}

async function startWatch(info: NgtscBuildInfo): Promise<void> {
  guardStartWatch();
  watchInfo = { ...info, env: info.output.env };

  try {
    // tsconfig 파싱 및 컴파일러 옵션 준비
    const parsedConfig = parseTsconfig(watchInfo.pkgDir);
    const sourceFiles = watchInfo.output.includeTests === true
      ? getPackageFiles(watchInfo.pkgDir, parsedConfig)
      : getPackageSourceFiles(watchInfo.pkgDir, parsedConfig);
    const baseOptions =
      watchInfo.env != null
        ? getCompilerOptionsForEnv(parsedConfig.options, watchInfo.env, watchInfo.pkgDir)
        : parsedConfig.options;
    const compilerOptions = buildCompilerOptions(baseOptions, watchInfo.pkgDir, watchInfo.output);
    const angularOptions = (parsedConfig.raw?.angularCompilerOptions ?? {}) as Record<string, unknown>;
    const loadPaths = buildScssLoadPaths(watchInfo);

    // Pipeline 생성 + 초기 빌드
    const sourceFileCache = new AngularSourceFileCache();
    const pipeline = new AngularBuildPipeline({
      mode: "library",
      pkgDir: watchInfo.pkgDir,
      cwd: watchInfo.cwd,
      rootNames: sourceFiles,
      compilerOptions,
      angularCompilerOptions: angularOptions,
      sourceFileCache,
    });
    _watchPipeline = pipeline;

    await pipeline.initialize();
    lastSourceFilePaths = extractSourceFilePaths(pipeline.getTsProgram());
    const initialResult = await buildWatchEvent(watchInfo, pipeline, loadPaths, true);
    sender.send("build", initialResult);

    // workspace 의존성 경로 + replaceDeps 수집
    const { watchPaths } = buildWatchPaths({
      pkgDir: watchInfo.pkgDir,
      cwd: watchInfo.cwd,
      srcGlobs: ["*.{ts,scss,css}"],
      extraDirs: [{ dir: "scss", globs: ["*.{scss,css}"] }],
      replaceDeps: watchInfo.replaceDeps,
    });

    // FsWatcher 시작
    logger.debug(`[${watchInfo.name}] FsWatcher 시작`);
    fsWatcher = await FsWatcher.watch(watchPaths);

    fsWatcher.onChange({ delay: 300 }, async (changedFiles) => {
      try {
        const addOrRemove = hasFileAddOrRemove(changedFiles);

        // 변경된 파일 수집 (전체 변경 + SCSS 의존성 역방향 탐색)
        const modifiedFiles = new Set<string>();
        for (const f of changedFiles) {
          modifiedFiles.add(f.path);

          // Pipeline의 SCSS 역방향 탐색
          if (f.path.endsWith(".scss") || f.path.endsWith(".css")) {
            for (const affected of pipeline.findAffectedByScss(f.path)) {
              modifiedFiles.add(affected);
            }
          }
        }

        // 의존성 필터: 관련 변경이 없으면 리빌드 건너뜀
        if (shouldSkipRebuild(modifiedFiles, addOrRemove, lastSourceFilePaths, logger)) {
          return;
        }

        sender.send("buildStart", {});

        // Pipeline 증분 업데이트 (SCSS 의존성 초기화 포함)
        pipeline.clearScssDependencies();
        const updateResult = await pipeline.update(modifiedFiles);

        // 리빌드 후 소스 파일 경로 업데이트
        lastSourceFilePaths = extractSourceFilePaths(pipeline.getTsProgram());

        // 증분 lint를 위해 영향받은 ts.SourceFile 집합을 파일명 문자열로 변환
        const affectedFileNames = new Set<string>();
        for (const sf of updateResult.affectedFiles) {
          affectedFileNames.add(pathx.posix(sf.fileName));
        }

        const hasScssChanges = changedFiles.some(
          (f) => f.path.endsWith(".scss") || f.path.endsWith(".css"),
        );

        const result = await buildWatchEvent(watchInfo!, pipeline, loadPaths, hasScssChanges, affectedFileNames);
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
  NgtscBuildWorkerEvents
>({
  build,
  startWatch,
  stopWatch,
});

export default sender;
