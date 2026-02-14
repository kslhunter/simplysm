import path from "path";
import esbuild from "esbuild";
import { createWorker, FsWatcher } from "@simplysm/core-node";
import { consola } from "consola";
import type { SdBuildPackageConfig } from "../sd-config.types";
import { parseRootTsconfig, getPackageSourceFiles, getCompilerOptionsForPackage } from "../utils/tsconfig";
import { createLibraryEsbuildOptions, getTypecheckEnvFromTarget } from "../utils/esbuild-config";
import { registerCleanupHandlers } from "../utils/worker-utils";

//#region Types

/**
 * Library 빌드 정보 (일회성 빌드용)
 */
export interface LibraryBuildInfo {
  name: string;
  config: SdBuildPackageConfig;
  cwd: string;
  pkgDir: string;
}

/**
 * Library 빌드 결과
 */
export interface LibraryBuildResult {
  success: boolean;
  errors?: string[];
}

/**
 * Library Watch 정보
 */
export interface LibraryWatchInfo {
  name: string;
  config: SdBuildPackageConfig;
  cwd: string;
  pkgDir: string;
}

/**
 * 빌드 이벤트
 */
export interface LibraryBuildEvent {
  success: boolean;
  errors?: string[];
}

/**
 * 에러 이벤트
 */
export interface LibraryErrorEvent {
  message: string;
}

/**
 * Worker 이벤트 타입
 */
export interface LibraryWorkerEvents extends Record<string, unknown> {
  buildStart: Record<string, never>;
  build: LibraryBuildEvent;
  error: LibraryErrorEvent;
}

//#endregion

//#region 리소스 관리

const logger = consola.withTag("sd:cli:library:worker");

/** esbuild build context (정리 대상) */
let esbuildContext: esbuild.BuildContext | undefined;

/** FsWatcher (정리 대상) */
let fsWatcher: FsWatcher | undefined;

/**
 * 리소스 정리
 */
async function cleanup(): Promise<void> {
  // 전역 변수를 임시 변수로 캡처 후 초기화
  // (Promise.all 대기 중 다른 호출에서 전역 변수를 수정할 수 있으므로)
  const contextToDispose = esbuildContext;
  esbuildContext = undefined;

  const watcherToClose = fsWatcher;
  fsWatcher = undefined;

  await Promise.all([contextToDispose?.dispose(), watcherToClose?.close()]);
}

// 프로세스 종료 전 리소스 정리 (SIGTERM/SIGINT)
// 주의: worker.terminate()는 이 핸들러들을 호출하지 않고 즉시 종료됨.
// 그러나 watch 모드에서 정상 종료는 메인 프로세스의 SIGINT/SIGTERM을 통해 이루어지므로 문제없음.
registerCleanupHandlers(cleanup, logger);

//#endregion

//#region Worker

/**
 * 일회성 빌드
 */
async function build(info: LibraryBuildInfo): Promise<LibraryBuildResult> {
  try {
    // tsconfig 파싱
    const parsedConfig = parseRootTsconfig(info.cwd);
    const entryPoints = getPackageSourceFiles(info.pkgDir, parsedConfig);

    // 타겟별 compilerOptions 생성
    const env = getTypecheckEnvFromTarget(info.config.target);
    const compilerOptions = await getCompilerOptionsForPackage(parsedConfig.options, env, info.pkgDir);

    // esbuild 일회성 빌드
    const esbuildOptions = createLibraryEsbuildOptions({
      pkgDir: info.pkgDir,
      entryPoints,
      target: info.config.target,
      compilerOptions,
    });

    const result = await esbuild.build(esbuildOptions);

    const errors = result.errors.map((e) => e.text);
    return {
      success: result.errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err) {
    return {
      success: false,
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }
}

/** startWatch 호출 여부 플래그 */
let isWatchStarted = false;

/**
 * esbuild context 생성 및 초기 빌드 수행
 */
async function createAndBuildContext(
  pkgDir: string,
  cwd: string,
  config: SdBuildPackageConfig,
  isFirstBuild: boolean,
  resolveFirstBuild?: () => void,
): Promise<esbuild.BuildContext> {
  // tsconfig 파싱
  const parsedConfig = parseRootTsconfig(cwd);
  const entryPoints = getPackageSourceFiles(pkgDir, parsedConfig);

  // 타겟별 compilerOptions 생성
  const env = getTypecheckEnvFromTarget(config.target);
  const compilerOptions = await getCompilerOptionsForPackage(parsedConfig.options, env, pkgDir);

  // esbuild 옵션 생성
  const baseOptions = createLibraryEsbuildOptions({
    pkgDir,
    entryPoints,
    target: config.target,
    compilerOptions,
  });

  let isBuildFirstTime = isFirstBuild;

  // context 생성 + watch-notify 플러그인 추가
  const context = await esbuild.context({
    ...baseOptions,
    plugins: [
      ...(baseOptions.plugins ?? []),
      {
        name: "watch-notify",
        setup(pluginBuild) {
          pluginBuild.onStart(() => {
            sender.send("buildStart", {});
          });

          pluginBuild.onEnd((result) => {
            const errors = result.errors.map((e) => e.text);
            const success = result.errors.length === 0;

            sender.send("build", { success, errors: errors.length > 0 ? errors : undefined });

            if (isBuildFirstTime) {
              isBuildFirstTime = false;
              resolveFirstBuild?.();
            }
          });
        },
      },
    ],
  });

  // 초기 빌드
  await context.rebuild();

  return context;
}

/**
 * watch 시작
 * @remarks 이 함수는 Worker당 한 번만 호출되어야 합니다.
 * @throws 이미 watch가 시작된 경우
 */
async function startWatch(info: LibraryWatchInfo): Promise<void> {
  if (isWatchStarted) {
    throw new Error("startWatch는 Worker당 한 번만 호출할 수 있습니다.");
  }
  isWatchStarted = true;

  try {
    // 첫 번째 빌드 완료 대기를 위한 Promise
    let resolveFirstBuild!: () => void;
    const firstBuildPromise = new Promise<void>((resolve) => {
      resolveFirstBuild = resolve;
    });

    // 초기 esbuild context 생성 및 빌드
    esbuildContext = await createAndBuildContext(info.pkgDir, info.cwd, info.config, true, resolveFirstBuild);

    // 첫 번째 빌드 완료 대기
    await firstBuildPromise;

    // FsWatcher 시작 (src/**/*.{ts,tsx} 감시)
    const srcPattern = path.join(info.pkgDir, "src", "**", "*.{ts,tsx}");
    fsWatcher = await FsWatcher.watch([srcPattern]);

    // 파일 변경 감지 시 처리
    fsWatcher.onChange({ delay: 300 }, async (changes) => {
      try {
        // add 또는 unlink 이벤트가 있는지 확인
        const hasAddOrUnlink = changes.some((c) => c.event === "add" || c.event === "unlink");

        if (hasAddOrUnlink) {
          // entry points 변경이 있으므로 context 재생성
          logger.debug("파일 추가/삭제 감지, context 재생성");

          const oldContext = esbuildContext;
          esbuildContext = await createAndBuildContext(info.pkgDir, info.cwd, info.config, false);

          if (oldContext != null) {
            await oldContext.dispose();
          }
        } else {
          // 파일 내용만 변경 (change 이벤트)
          if (esbuildContext != null) {
            await esbuildContext.rebuild();
          }
        }
      } catch (err) {
        sender.send("error", {
          message: err instanceof Error ? err.message : String(err),
        });
      }
    });
  } catch (err) {
    sender.send("error", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * watch 중지
 * @remarks esbuild context를 정리합니다.
 */
async function stopWatch(): Promise<void> {
  await cleanup();
}

const sender = createWorker<
  { build: typeof build; startWatch: typeof startWatch; stopWatch: typeof stopWatch },
  LibraryWorkerEvents
>({
  build,
  startWatch,
  stopWatch,
});

export default sender;

//#endregion
