import { createWorker } from "@simplysm/core-node";
import { env, err as errNs } from "@simplysm/core-common";
import { consola } from "consola";
import proxy from "@fastify/http-proxy";
import net from "net";
import { pathToFileURL } from "url";
import { registerCleanupHandlers, setupWorkerConsola } from "../utils/worker-utils";

//#region Types

/**
 * 서버 런타임 시작 정보
 */
export interface ServerRuntimeStartInfo {
  mainJsPath: string;
  /** @fastify/http-proxy 등록을 위한 Client Vite dev server 포트 */
  clientPorts?: Record<string, number>;
  env?: Record<string, string>;
}

/**
 * 서버 준비 완료 이벤트
 */
export interface ServerRuntimeReadyEvent {
  port: number;
}

/**
 * 에러 이벤트
 */
export interface ServerRuntimeErrorEvent {
  message: string;
}

/**
 * 워커 이벤트 타입
 */
export interface ServerRuntimeWorkerEvents extends Record<string, unknown> {
  serverReady: ServerRuntimeReadyEvent;
  error: ServerRuntimeErrorEvent;
}

//#endregion

setupWorkerConsola();

const logger = consola.withTag("sd:cli:server-runtime:worker");

/** 서버 인스턴스 (정리 대상) */
let serverInstance: { close: () => Promise<void> } | undefined;

/**
 * 리소스 정리
 */
async function cleanup(): Promise<void> {
  const server = serverInstance;
  serverInstance = undefined;
  if (server != null) {
    await server.close();
  }
}

// 서버 listen() 이후 발생하는 런타임 에러를 잡아 커스텀 "error" 이벤트로 전송
// (이 핸들러 없이는 워커가 크래시해도 빌드 Promise가 resolve되지 않아 프로세스가 중단될 수 있다)
process.on("uncaughtException", (err) => {
  logger.error("서버 런타임 미처리 에러", err);
  sender.send("error", {
    message: errNs.message(err),
  });
  // 이벤트 전송 후 종료할 수 있도록 대기
  setTimeout(() => process.exit(1), 500);
});

process.on("unhandledRejection", (reason) => {
  logger.error("서버 런타임 미처리 Promise 거부", reason);
  sender.send("error", {
    message: errNs.message(reason),
  });
  // 이벤트 전송 후 종료할 수 있도록 대기
  setTimeout(() => process.exit(1), 500);
});

registerCleanupHandlers(cleanup, logger);

/**
 * 포트가 사용 가능한지 확인한다
 */
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "0.0.0.0");
  });
}

/**
 * 지정된 포트부터 사용 가능한 포트를 찾아 반환한다
 */
async function findAvailablePort(startPort: number, maxRetries = 20): Promise<number> {
  for (let i = 0; i < maxRetries; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(
    `No available port found between ${startPort} and ${startPort + maxRetries - 1}.`,
  );
}

/**
 * 서버 런타임 시작
 * main.js를 import한 후 listen 수행
 */
async function start(info: ServerRuntimeStartInfo): Promise<void> {
  try {
    const startTime = performance.now();

    // main.js import 전에 환경변수를 process.env에 주입
    if (info.env != null) {
      for (const [key, value] of Object.entries(info.env)) {
        env(key, value);
      }
    }

    // main.js import (서버 인스턴스를 export해야 함)
    logger.debug("main.js 임포트 중...");
    let stepStart = performance.now();
    const module = await import(pathToFileURL(info.mainJsPath).href);
    logger.debug(`main.js 임포트 완료 (${Math.round(performance.now() - stepStart)}ms)`);
    const server = module.server;

    if (server == null) {
      throw new Error("main.js must export a server instance.");
    }

    // 서버 인스턴스 저장 (정리용)
    serverInstance = server;

    // 클라이언트 프록시 등록 (listen 전)
    if (info.clientPorts != null && Object.keys(info.clientPorts).length > 0) {
      for (const [name, port] of Object.entries(info.clientPorts)) {
        logger.debug(`프록시 등록: /${name} → http://127.0.0.1:${String(port)}`);
        await server.fastify.register(proxy, {
          prefix: `/${name}`,
          upstream: `http://127.0.0.1:${port}`,
          rewritePrefix: `/${name}`,
          websocket: true,
        });
      }
    }

    // 사용 가능한 포트 탐색 (포트 충돌 시 자동 증가)
    logger.debug("사용 가능한 포트 탐색 중...");
    stepStart = performance.now();
    const originalPort = server.options.port;
    const availablePort = await findAvailablePort(originalPort);
    if (availablePort !== originalPort) {
      logger.info(`포트 ${originalPort} 사용 중, ${availablePort}로 변경`);
      server.options.port = availablePort;
    }
    logger.debug(
      `포트 ${String(availablePort)} 사용 가능 (${Math.round(performance.now() - stepStart)}ms)`,
    );

    // 서버 시작
    logger.debug("서버 리슨 시작...");
    stepStart = performance.now();
    await server.listen();
    logger.debug(`서버 리슨 완료 (${Math.round(performance.now() - stepStart)}ms)`);

    logger.debug(
      `런타임 총 시작 시간: ${Math.round(performance.now() - startTime)}ms`,
    );

    sender.send("serverReady", { port: server.options.port });
  } catch (err) {
    logger.error("서버 런타임 시작 실패", err);
    sender.send("error", {
      message: errNs.message(err),
    });
  }
}

const sender = createWorker<{ start: typeof start }, ServerRuntimeWorkerEvents>({
  start,
});

export default sender;
