import path from "path";
import fs from "fs";
import { build as viteBuild, createServer, type ViteDevServer } from "vite";
import { createWorker } from "@simplysm/core-node";
import { consola } from "consola";
import type { SdClientPackageConfig } from "../sd-config.types";
import { parseRootTsconfig, getCompilerOptionsForPackage } from "../utils/tsconfig";
import { createViteConfig } from "../utils/vite-config";

//#region Types

/**
 * Client 빌드 정보 (일회성 빌드용)
 */
export interface ClientBuildInfo {
  name: string;
  config: SdClientPackageConfig;
  cwd: string;
  pkgDir: string;
}

/**
 * Client 빌드 결과
 */
export interface ClientBuildResult {
  success: boolean;
  errors?: string[];
}

/**
 * Client Watch 정보
 */
export interface ClientWatchInfo {
  name: string;
  config: SdClientPackageConfig;
  cwd: string;
  pkgDir: string;
  /** watch 대상 scope 목록 */
  watchScopes?: string[];
}

/**
 * 빌드 이벤트
 */
export interface ClientBuildEvent {
  success: boolean;
  errors?: string[];
}

/**
 * 서버 준비 이벤트
 */
export interface ClientServerReadyEvent {
  port: number;
}

/**
 * 에러 이벤트
 */
export interface ClientErrorEvent {
  message: string;
}

/**
 * Worker 이벤트 타입
 */
export interface ClientWorkerEvents extends Record<string, unknown> {
  buildStart: Record<string, never>;
  build: ClientBuildEvent;
  serverReady: ClientServerReadyEvent;
  error: ClientErrorEvent;
}

//#endregion

//#region 리소스 관리

const logger = consola.withTag("sd:cli:client:worker");

/** Vite dev server (정리 대상) */
let viteServer: ViteDevServer | undefined;

/**
 * 리소스 정리
 */
async function cleanup(): Promise<void> {
  // 전역 변수를 임시 변수로 캡처 후 초기화
  // (Promise.all 대기 중 다른 호출에서 전역 변수를 수정할 수 있으므로)
  const serverToClose = viteServer;
  viteServer = undefined;

  if (serverToClose != null) {
    await serverToClose.close();
  }
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

//#region Worker

/**
 * 일회성 빌드
 */
async function build(info: ClientBuildInfo): Promise<ClientBuildResult> {
  try {
    // tsconfig 파싱
    const parsedConfig = parseRootTsconfig(info.cwd);
    const tsconfigPath = path.join(info.cwd, "tsconfig.json");

    // browser 타겟용 compilerOptions 생성
    const compilerOptions = await getCompilerOptionsForPackage(parsedConfig.options, "browser", info.pkgDir);

    // Vite 설정 생성 및 빌드
    const viteConfig = createViteConfig({
      pkgDir: info.pkgDir,
      name: info.name,
      tsconfigPath,
      compilerOptions,
      env: info.config.env,
      mode: "build",
    });

    await viteBuild(viteConfig);

    // Generate .config.json
    const confDistPath = path.join(info.pkgDir, "dist", ".config.json");
    fs.writeFileSync(confDistPath, JSON.stringify(info.config.configs ?? {}, undefined, 2));

    return { success: true };
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
 * watch 시작 (Vite dev server)
 * @remarks 이 함수는 Worker당 한 번만 호출되어야 합니다.
 * @throws 이미 watch가 시작된 경우
 */
async function startWatch(info: ClientWatchInfo): Promise<void> {
  if (isWatchStarted) {
    throw new Error("startWatch는 Worker당 한 번만 호출할 수 있습니다.");
  }
  isWatchStarted = true;

  try {
    // tsconfig 파싱
    const parsedConfig = parseRootTsconfig(info.cwd);
    const tsconfigPath = path.join(info.cwd, "tsconfig.json");

    // browser 타겟용 compilerOptions 생성
    const compilerOptions = await getCompilerOptionsForPackage(parsedConfig.options, "browser", info.pkgDir);

    // server가 0이면 자동 포트 할당 (서버 연결 클라이언트)
    // server가 숫자면 해당 포트로 고정 (standalone 클라이언트)
    const serverPort = typeof info.config.server === "number" ? info.config.server : 0;

    // Vite 설정 생성
    const viteConfig = createViteConfig({
      pkgDir: info.pkgDir,
      name: info.name,
      tsconfigPath,
      compilerOptions,
      env: info.config.env,
      mode: "dev",
      serverPort,
      watchScopes: info.watchScopes,
    });

    // Vite dev server 시작
    viteServer = await createServer(viteConfig);
    await viteServer.listen();

    // Generate .config.json
    const confDistPath = path.join(info.pkgDir, "dist", ".config.json");
    fs.mkdirSync(path.dirname(confDistPath), { recursive: true });
    fs.writeFileSync(confDistPath, JSON.stringify(info.config.configs ?? {}, undefined, 2));

    // 실제 할당된 포트 반환
    sender.send("serverReady", { port: viteServer.config.server.port });
  } catch (err) {
    sender.send("error", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * watch 중지
 * @remarks Vite dev server를 정리합니다.
 */
async function stopWatch(): Promise<void> {
  await cleanup();
}

const sender = createWorker<
  { build: typeof build; startWatch: typeof startWatch; stopWatch: typeof stopWatch },
  ClientWorkerEvents
>({
  build,
  startWatch,
  stopWatch,
});

export default sender;

//#endregion
