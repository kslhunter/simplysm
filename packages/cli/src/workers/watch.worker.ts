import path from "path";
import ts from "typescript";
import esbuild from "esbuild";
import { createServer, type ViteDevServer } from "vite";
import solidPlugin from "vite-plugin-solid";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import tsconfigPaths from "vite-tsconfig-paths";
import { createWorker } from "@simplysm/core-node";
import { consola } from "consola";
import type { SdPackageConfig, SdClientPackageConfig, SdBuildPackageConfig } from "../sd-config.types";
import { parseRootTsconfig, getPackageSourceFiles, getCompilerOptionsForPackage, type TypecheckEnv } from "../utils/tsconfig";

//#region Types

/**
 * Watch 시작 정보
 */
export interface WatchInfo {
  name: string;
  config: SdPackageConfig;
  cwd: string;
  pkgDir: string;
}

/**
 * 빌드 이벤트
 */
export interface WatchBuildEvent {
  success: boolean;
  errors?: string[];
}

/**
 * 서버 준비 이벤트
 */
export interface WatchServerReadyEvent {
  port: number;
}

/**
 * 에러 이벤트
 */
export interface WatchErrorEvent {
  message: string;
}

/**
 * Worker 이벤트 타입
 */
export interface WatchWorkerEvents extends Record<string, unknown> {
  buildStart: Record<string, never>;
  build: WatchBuildEvent;
  serverReady: WatchServerReadyEvent;
  error: WatchErrorEvent;
}

//#endregion

//#region 리소스 관리

const logger = consola.withTag("sd:cli:watch:worker");

/** esbuild build context (정리 대상) */
let esbuildContext: esbuild.BuildContext | undefined;

/** Vite dev server (정리 대상) */
let viteServer: ViteDevServer | undefined;

/**
 * 리소스 정리
 */
async function cleanup(): Promise<void> {
  const cleanupPromises: Promise<void>[] = [];

  // 전역 변수를 임시 변수로 캡처 후 초기화
  // (Promise.all 대기 중 다른 호출에서 전역 변수를 수정할 수 있으므로)
  const contextToDispose = esbuildContext;
  const serverToClose = viteServer;

  if (contextToDispose != null) {
    cleanupPromises.push(contextToDispose.dispose());
  }

  if (serverToClose != null) {
    cleanupPromises.push(serverToClose.close());
  }

  await Promise.all(cleanupPromises);

  // 정리 완료 후 변수 초기화
  esbuildContext = undefined;
  viteServer = undefined;
}

// 프로세스 종료 전 리소스 정리 (SIGTERM/SIGINT)
// 주의: worker.terminate()는 이 핸들러들을 호출하지 않고 즉시 종료됨.
// 그러나 watch 모드에서 정상 종료는 메인 프로세스의 SIGINT/SIGTERM을 통해 이루어지므로 문제없음.
process.on("SIGTERM", () => {
  cleanup()
    .catch((err) => {
      logger.error("cleanup 실패", err);
    })
    .finally(() => {
      process.exit(0);
    });
});

process.on("SIGINT", () => {
  cleanup()
    .catch((err) => {
      logger.error("cleanup 실패", err);
    })
    .finally(() => {
      process.exit(0);
    });
});

//#endregion

//#region esbuild Watch

/**
 * esbuild watch 시작 (node/browser/neutral)
 */
async function startEsbuildWatch(
  pkgDir: string,
  config: SdBuildPackageConfig,
  parsedConfig: ts.ParsedCommandLine,
): Promise<void> {
  const entryPoints = getPackageSourceFiles(pkgDir, parsedConfig);

  // 타겟별 compilerOptions 생성 (빌드용이므로 neutral은 browser로 처리)
  const env: TypecheckEnv = config.target === "node" ? "node" : "browser";
  const compilerOptions = await getCompilerOptionsForPackage(parsedConfig.options, env, pkgDir);

  // 첫 번째 빌드 완료 대기를 위한 Promise
  let resolveFirstBuild!: () => void;
  const firstBuildPromise = new Promise<void>((resolve) => {
    resolveFirstBuild = resolve;
  });

  let isFirstBuild = true;

  esbuildContext = await esbuild.context({
    entryPoints,
    outdir: path.join(pkgDir, "dist"),
    format: "esm",
    sourcemap: true,
    platform: config.target === "node" ? "node" : "browser",
    target: config.target === "node" ? "node20" : "chrome84",
    bundle: false,
    tsconfigRaw: { compilerOptions: compilerOptions as esbuild.TsconfigRaw["compilerOptions"] },
    plugins: [
      {
        name: "watch-notify",
        setup(build) {
          build.onStart(() => {
            sender.send("buildStart", {});
          });

          build.onEnd((result) => {
            const errors = result.errors.map((e) => e.text);
            const success = result.errors.length === 0;

            sender.send("build", { success, errors: errors.length > 0 ? errors : undefined });

            if (isFirstBuild) {
              isFirstBuild = false;
              resolveFirstBuild();
            }
          });
        },
      },
    ],
  });

  await esbuildContext.watch();

  // 첫 번째 빌드 완료 대기
  await firstBuildPromise;
}

//#endregion

//#region Vite Watch

/**
 * Vite dev server 시작 (client)
 */
async function startViteWatch(
  pkgDir: string,
  config: SdClientPackageConfig,
  cwd: string,
  name: string,
  parsedConfig: ts.ParsedCommandLine,
): Promise<void> {
  const tsconfigPath = path.join(cwd, "tsconfig.json");

  // browser 타겟용 compilerOptions 생성
  const compilerOptions = await getCompilerOptionsForPackage(parsedConfig.options, "browser", pkgDir);

  viteServer = await createServer({
    root: pkgDir,
    base: `/${name}/`,
    plugins: [
      tsconfigPaths({ projects: [tsconfigPath] }),
      solidPlugin(),
      vanillaExtractPlugin(),
    ],
    esbuild: {
      tsconfigRaw: { compilerOptions: compilerOptions as esbuild.TsconfigRaw["compilerOptions"] },
    },
    server: {
      port: config.server,
      strictPort: true,
    },
  });

  await viteServer.listen();

  sender.send("serverReady", { port: config.server });
}

//#endregion

//#region Worker

/** startWatch 호출 여부 플래그 */
let isWatchStarted = false;

/**
 * watch 시작
 * @remarks 이 함수는 Worker당 한 번만 호출되어야 합니다.
 * @throws 이미 watch가 시작된 경우
 */
async function startWatch(info: WatchInfo): Promise<void> {
  if (isWatchStarted) {
    throw new Error("startWatch는 Worker당 한 번만 호출할 수 있습니다.");
  }
  isWatchStarted = true;

  try {
    // tsconfig 파싱 (한 번만 수행하여 하위 함수에 전달)
    const parsedConfig = parseRootTsconfig(info.cwd);

    if (info.config.target === "client") {
      await startViteWatch(info.pkgDir, info.config, info.cwd, info.name, parsedConfig);
    } else if (info.config.target !== "scripts") {
      await startEsbuildWatch(info.pkgDir, info.config, parsedConfig);
    }
  } catch (err) {
    sender.send("error", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

const sender = createWorker<{ startWatch: typeof startWatch }, WatchWorkerEvents>({
  startWatch,
});

export default sender;

//#endregion
