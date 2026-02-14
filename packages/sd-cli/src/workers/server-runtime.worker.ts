import proxy from "@fastify/http-proxy";
import { createWorker } from "@simplysm/core-node";
import { consola } from "consola";
import net from "net";

//#region Types

/**
 * Server Runtime 시작 정보
 */
export interface ServerRuntimeStartInfo {
  mainJsPath: string;
  clientPorts: Record<string, number>;
}

/**
 * 서버 준비 이벤트
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
 * Worker 이벤트 타입
 */
export interface ServerRuntimeWorkerEvents extends Record<string, unknown> {
  serverReady: ServerRuntimeReadyEvent;
  error: ServerRuntimeErrorEvent;
}

//#endregion

const logger = consola.withTag("sd:cli:server-runtime:worker");

/** 서버 인스턴스 (정리 대상) */
let serverInstance: { close: () => Promise<void> } | undefined;

/**
 * 리소스 정리
 */
async function cleanup(): Promise<void> {
  const server = serverInstance;
  if (server != null) {
    await server.close();
  }
  serverInstance = undefined;
}

// 서버 listen() 이후 발생하는 런타임 에러를 잡아서 custom "error" 이벤트로 전송
// (이 핸들러가 없으면 worker가 crash만 하고, dev.ts의 buildResolver가 호출되지 않아 listr가 멈춤)
process.on("uncaughtException", (err) => {
  logger.error("Server Runtime 미처리 오류", err);
  sender.send("error", {
    message: err instanceof Error ? err.message : String(err),
  });
});

process.on("unhandledRejection", (reason) => {
  logger.error("Server Runtime 미처리 Promise 거부", reason);
  sender.send("error", {
    message: reason instanceof Error ? reason.message : String(reason),
  });
});

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

/**
 * 포트가 사용 가능한지 확인
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
 * 시작 포트부터 사용 가능한 포트를 찾아 반환
 */
async function findAvailablePort(startPort: number, maxRetries = 20): Promise<number> {
  for (let i = 0; i < maxRetries; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  return startPort;
}

/**
 * Server Runtime 시작
 * main.js를 import하고, Vite proxy를 설정한 후 listen
 */
async function start(info: ServerRuntimeStartInfo): Promise<void> {
  try {
    // main.js import (server 인스턴스를 export해야 함)
    const module = await import(info.mainJsPath);
    const server = module.server;

    if (server == null) {
      throw new Error("main.js에서 server 인스턴스를 export해야 합니다.");
    }

    // 서버 인스턴스 저장 (cleanup용)
    serverInstance = server;

    // 사용 가능한 포트 탐색 (포트 충돌 시 자동 증가)
    const originalPort = server.options.port;
    const availablePort = await findAvailablePort(originalPort);
    if (availablePort !== originalPort) {
      logger.info(`포트 ${originalPort} 사용 중 → ${availablePort}로 변경`);
      server.options.port = availablePort;
    }

    // Vite proxy 설정 (clientPorts가 있는 경우만)
    for (const [name, port] of Object.entries(info.clientPorts)) {
      await server.fastify.register(proxy, {
        prefix: `/${name}`,
        upstream: `http://127.0.0.1:${port}`,
        rewritePrefix: `/${name}`,
        websocket: true,
      });
    }

    // 서버 시작
    await server.listen();

    sender.send("serverReady", { port: server.options.port });
  } catch (err) {
    logger.error("Server Runtime 시작 실패", err);
    sender.send("error", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

const sender = createWorker<{ start: typeof start }, ServerRuntimeWorkerEvents>({
  start,
});

export default sender;
