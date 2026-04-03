import path from "path";
import ts from "typescript";
import { createWorker, FsWatcher, pathx } from "@simplysm/core-node";
import { err as errNs } from "@simplysm/core-common";
import { consola } from "consola";
import { registerCleanupHandlers, createOnceGuard, setupWorkerConsola } from "../utils/worker-utils";
import {
  runNgtscBuild,
  buildCompilerOptions,
  buildScssLoadPaths,
  createLibraryTransformStylesheet,
  writeEmitResults,
  compileSideEffectScss,
  compileGlobalScss,
  type NgtscBuildInfo,
  type NgtscBuildResult,
  type NgtscCombinedBuildEvent,
  type SideEffectScssEntry,
} from "../utils/ngtsc-build-core";
import { isWorkspaceDiagnostic, formatDiagnosticError } from "../utils/diagnostic-utils";
import { LintWithProgramRunner, type LintWithProgramResult } from "../utils/lint-with-program";
import {
  parseTsconfig,
  getPackageSourceFiles,
  getPackageFiles,
  getCompilerOptionsForEnv,
} from "../utils/tsconfig";
import { AngularCompiler, AngularSourceFileCache } from "../utils/angular-compiler";
import { collectDeps } from "../utils/package-utils";

setupWorkerConsola();

//#region 타입 (워커 인터페이스용 re-export)

export type { NgtscBuildInfo, NgtscBuildResult, NgtscCombinedBuildEvent };

export interface NgtscBuildWorkerEvents extends Record<string, unknown> {
  buildStart: Record<string, never>;
  build: NgtscCombinedBuildEvent;
  error: { message: string };
}

//#endregion

//#region Resource Management

const logger = consola.withTag("sd:cli:ngtsc-build:worker");

let fsWatcher: FsWatcher | undefined;

async function cleanup(): Promise<void> {
  const watcherToClose = fsWatcher;
  fsWatcher = undefined;
  lastSourceFilePaths = undefined;

  if (watcherToClose != null) {
    await watcherToClose.close();
  }
}

registerCleanupHandlers(cleanup, logger);

//#endregion

//#region build (one-time build)

async function build(info: NgtscBuildInfo): Promise<NgtscBuildResult> {
  logger.debug(`[${info.name}] ngtsc worker build 시작 (pkgDir: ${info.pkgDir})`);
  const { program, ...result } = await runNgtscBuild({ ...info, env: info.output.env });
  logger.debug(`[${info.name}] ngtsc worker build 완료 (build.success: ${result.build.success})`);

  // lint 실행 (활성화 + program 사용 가능 시)
  if (info.output.lint === true && program != null) {
    logger.debug(`[${info.name}] lint 시작`);
    const lintRunner = new LintWithProgramRunner({
      cwd: info.cwd,
      pkgName: info.name,
    });
    result.lint = await lintRunner.lint({ program });
    logger.debug(`[${info.name}] lint 완료`);
  }

  return result;
}

//#endregion

//#region startWatch (watch mode)

const guardStartWatch = createOnceGuard("startWatch");

let watchInfo: NgtscBuildInfo | undefined;
let currentScssDependencies: Map<string, Set<string>> | undefined;
let watchLintRunner: LintWithProgramRunner | undefined;
let lastSourceFilePaths: Set<string> | undefined;
const sideEffectScssRegistry = new Map<string, SideEffectScssEntry>();

function extractSourceFilePaths(program: ReturnType<AngularCompiler["getTsProgram"]>): Set<string> {
  const paths = new Set<string>();
  for (const sf of program.getSourceFiles()) {
    paths.add(pathx.posix(sf.fileName));
  }
  return paths;
}

/**
 * AngularCompiler를 사용하여 watch 빌드(초기 또는 증분)를 수행한다.
 * 엔진에 전송할 NgtscCombinedBuildEvent를 반환한다.
 *
 * @param affectedFileNames - 제공 시(watch 재빌드) 해당 파일만 lint 수행.
 *   미제공 시(초기 빌드) workspace 전체 파일을 lint 수행.
 */
async function performWatchBuild(
  info: NgtscBuildInfo,
  compiler: AngularCompiler,
  scssDependencies: Map<string, Set<string>>,
  scssErrors: string[],
  affectedFileNames?: ReadonlySet<string>,
  hasScssChanges = true,
): Promise<NgtscCombinedBuildEvent> {
  logger.debug(`[${info.name}] performWatchBuild 시작`);
  const pkgSrcDir = path.join(info.pkgDir, "src");
  const normalizedSrcDir = pathx.posix(pkgSrcDir);

  // 진단 수집 — workspace 스코프 (패키지 단위 필터링 없음)
  const allDiagnostics = [...compiler.collectDiagnostics()].filter(
    (d) => isWorkspaceDiagnostic(d, info.cwd),
  );

  const errorCount = allDiagnostics.filter(
    (d) => d.category === ts.DiagnosticCategory.Error,
  ).length;
  const errors = allDiagnostics
    .filter((d) => d.category === ts.DiagnosticCategory.Error)
    .map(formatDiagnosticError);

  // AngularCompiler로 emit + output-path-rewriting 적용
  const loadPaths = buildScssLoadPaths(info);
  const emitResults = compiler.emitAffectedFiles({
    sourceFilter: (fileName: string) =>
      pathx.posix(fileName).startsWith(normalizedSrcDir + "/"),
  });
  writeEmitResults(emitResults, info.pkgDir, {
    loadPaths,
    scssErrors,
    scssDependencies,
    registry: sideEffectScssRegistry,
  });

  // 사이드 이펙트 SCSS 컴파일 (.scss/.css 파일 변경 없으면 건너뜀)
  if (hasScssChanges) {
    compileSideEffectScss(sideEffectScssRegistry, loadPaths, scssErrors, scssDependencies);
  }

  // 전역 SCSS 컴파일
  const globalScssErrors = compileGlobalScss(info.pkgDir, loadPaths);

  const allErrors = [...errors, ...scssErrors, ...globalScssErrors];

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
      program: compiler.getTsProgram(),
      affectedFiles: affectedFileNames,
    });
    logger.debug(`[${info.name}] lint 완료`);
  }

  logger.debug(`[${info.name}] performWatchBuild 완료`);
  return {
    build: {
      success: errorCount === 0 && scssErrors.length === 0 && globalScssErrors.length === 0,
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

    // SCSS 클로저 변수
    const scssErrors: string[] = [];
    const scssDependencies = new Map<string, Set<string>>();
    const loadPaths = buildScssLoadPaths(watchInfo);
    currentScssDependencies = scssDependencies;

    // AngularSourceFileCache + AngularCompiler 생성
    const sourceFileCache = new AngularSourceFileCache();
    const compiler = new AngularCompiler({
      rootNames: sourceFiles,
      compilerOptions,
      angularCompilerOptions: angularOptions,
      sourceFileCache,
      transformStylesheet: createLibraryTransformStylesheet(loadPaths, scssErrors, scssDependencies),
    });
    // 초기 빌드
    await compiler.initialize();
    lastSourceFilePaths = extractSourceFilePaths(compiler.getTsProgram());
    const initialResult = await performWatchBuild(watchInfo, compiler, scssDependencies, scssErrors);
    sender.send("build", initialResult);

    // workspace 의존성 경로 + replaceDeps 수집
    const { workspaceDeps, replaceDeps } = collectDeps(
      watchInfo.pkgDir,
      watchInfo.cwd,
      watchInfo.replaceDeps,
    );

    // FsWatcher 시작
    logger.debug(`[${watchInfo.name}] FsWatcher 시작`);
    const watchPaths = [
      pathx.posixResolve(watchInfo.pkgDir, "src", "**", "*.{ts,scss,css}"),
      pathx.posixResolve(watchInfo.pkgDir, "scss", "**", "*.{scss,css}"),
      ...workspaceDeps.flatMap((d) => {
        const depDir = pathx.posixResolve(watchInfo!.cwd, "packages", d);
        return [
          pathx.posixResolve(depDir, "src", "**", "*.{ts,scss,css}"),
          pathx.posixResolve(depDir, "scss", "**", "*.{scss,css}"),
        ];
      }),
      ...replaceDeps.flatMap((pkg) => [
        pathx.posixResolve(watchInfo!.cwd, "node_modules", ...pkg.split("/"), "dist", "**", "*.{js,mjs,cjs}"),
        pathx.posixResolve(watchInfo!.pkgDir, "node_modules", ...pkg.split("/"), "dist", "**", "*.{js,mjs,cjs}"),
      ]),
    ];
    fsWatcher = await FsWatcher.watch(watchPaths);

    fsWatcher.onChange({ delay: 300 }, async (changedFiles) => {
      try {
        const hasFileAddOrRemove = changedFiles.some(
          (c) => c.event === "add" || c.event === "unlink",
        );

        // 변경된 파일 수집 (전체 변경 + SCSS 의존성 역방향 탐색)
        const modifiedFiles = new Set<string>();
        for (const f of changedFiles) {
          modifiedFiles.add(f.path);

          // SCSS 의존성 역방향 탐색
          if (
            (f.path.endsWith(".scss") || f.path.endsWith(".css")) &&
            currentScssDependencies != null
          ) {
            for (const [containingFile, deps] of currentScssDependencies) {
              if (deps.has(f.path)) {
                modifiedFiles.add(containingFile);
              }
            }
          }
        }

        // 의존성 필터: 관련 변경이 없으면 리빌드 건너뜀
        if (!hasFileAddOrRemove && lastSourceFilePaths != null) {
          const hasRelevantChange = [...modifiedFiles].some((p) =>
            lastSourceFilePaths!.has(p),
          );
          if (!hasRelevantChange) {
            logger.debug("변경된 파일이 빌드에 포함되지 않아 리빌드 건너뜀");
            return;
          }
        }

        sender.send("buildStart", {});

        // 새 리빌드를 위해 SCSS 에러 초기화
        scssErrors.length = 0;
        scssDependencies.clear();

        // AngularCompiler.update()를 통한 증분 리빌드
        const updateResult = await compiler.update(modifiedFiles);

        // 리빌드 후 소스 파일 경로 업데이트
        lastSourceFilePaths = extractSourceFilePaths(compiler.getTsProgram());

        // 증분 lint를 위해 영향받은 ts.SourceFile 집합을 파일명 문자열로 변환
        const affectedFileNames = new Set<string>();
        for (const sf of updateResult.affectedFiles) {
          affectedFileNames.add(pathx.posix(sf.fileName));
        }

        const hasScssChanges = changedFiles.some(
          (f) => f.path.endsWith(".scss") || f.path.endsWith(".css"),
        );

        const result = await performWatchBuild(watchInfo!, compiler, scssDependencies, scssErrors, affectedFileNames, hasScssChanges);
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
