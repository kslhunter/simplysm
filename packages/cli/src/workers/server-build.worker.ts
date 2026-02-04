import path from "path";
import esbuild from "esbuild";
import { createWorker } from "@simplysm/core-node";
import { consola } from "consola";
import { parseRootTsconfig, getPackageSourceFiles, getCompilerOptionsForPackage } from "../utils/tsconfig";

//#region Types

/**
 * Server Build Watch 시작 정보
 */
export interface ServerBuildWatchInfo {
  name: string;
  cwd: string;
  pkgDir: string;
  /** 빌드 시 치환할 환경변수 */
  env?: Record<string, string>;
}

/**
 * 빌드 완료 이벤트
 */
export interface ServerBuildEvent {
  success: boolean;
  mainJsPath: string;
  errors?: string[];
}

/**
 * 에러 이벤트
 */
export interface ServerBuildErrorEvent {
  message: string;
}

/**
 * Worker 이벤트 타입
 */
export interface ServerBuildWorkerEvents extends Record<string, unknown> {
  buildStart: Record<string, never>;
  build: ServerBuildEvent;
  error: ServerBuildErrorEvent;
}

//#endregion

//#region 리소스 관리

const logger = consola.withTag("sd:cli:server-build:worker");

/** esbuild build context (정리 대상) */
let esbuildContext: esbuild.BuildContext | undefined;

/**
 * 리소스 정리
 */
async function cleanup(): Promise<void> {
  const contextToDispose = esbuildContext;
  if (contextToDispose != null) {
    await contextToDispose.dispose();
  }
  esbuildContext = undefined;
}

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

//#region Worker

let isWatchStarted = false;

/**
 * Server esbuild watch 시작
 */
async function startWatch(info: ServerBuildWatchInfo): Promise<void> {
  if (isWatchStarted) {
    throw new Error("startWatch는 Worker당 한 번만 호출할 수 있습니다.");
  }
  isWatchStarted = true;

  try {
    const parsedConfig = parseRootTsconfig(info.cwd);
    const entryPoints = getPackageSourceFiles(info.pkgDir, parsedConfig);
    const compilerOptions = await getCompilerOptionsForPackage(parsedConfig.options, "node", info.pkgDir);

    const mainJsPath = path.join(info.pkgDir, "dist", "main.js");

    // define 옵션 생성: process.env.KEY를 상수로 치환
    const define: Record<string, string> = {};
    if (info.env != null) {
      for (const [key, value] of Object.entries(info.env)) {
        define[`process.env["${key}"]`] = JSON.stringify(value);
      }
    }

    let resolveFirstBuild!: () => void;
    const firstBuildPromise = new Promise<void>((resolve) => {
      resolveFirstBuild = resolve;
    });

    let isFirstBuild = true;

    esbuildContext = await esbuild.context({
      entryPoints,
      outdir: path.join(info.pkgDir, "dist"),
      format: "esm",
      sourcemap: true,
      platform: "node",
      target: "node20",
      bundle: true,
      packages: "external",
      define,
      tsconfigRaw: { compilerOptions: compilerOptions as esbuild.TsconfigRaw["compilerOptions"] },
      plugins: [
        {
          name: "server-build-notify",
          setup(build) {
            build.onStart(() => {
              sender.send("buildStart", {});
            });

            build.onEnd((result) => {
              const errors = result.errors.map((e) => e.text);
              const success = result.errors.length === 0;

              sender.send("build", {
                success,
                mainJsPath,
                errors: errors.length > 0 ? errors : undefined,
              });

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
    await firstBuildPromise;
  } catch (err) {
    sender.send("error", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

const sender = createWorker<{ startWatch: typeof startWatch }, ServerBuildWorkerEvents>({
  startWatch,
});

export default sender;

//#endregion
