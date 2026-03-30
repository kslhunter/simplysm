import { createWorker } from "@simplysm/core-node";
import { err as errNs } from "@simplysm/core-common";
import { consola } from "consola";
import proxy from "@fastify/http-proxy";
import net from "net";
import { pathToFileURL } from "url";
import { registerCleanupHandlers, applyDebugLevel } from "../utils/worker-utils";

//#region Types

/**
 * Server runtime start info
 */
export interface ServerRuntimeStartInfo {
  mainJsPath: string;
  /** Client Vite dev server ports for @fastify/http-proxy registration */
  clientPorts?: Record<string, number>;
  env?: Record<string, string>;
}

/**
 * Server ready event
 */
export interface ServerRuntimeReadyEvent {
  port: number;
}

/**
 * Error event
 */
export interface ServerRuntimeErrorEvent {
  message: string;
}

/**
 * Worker event types
 */
export interface ServerRuntimeWorkerEvents extends Record<string, unknown> {
  serverReady: ServerRuntimeReadyEvent;
  error: ServerRuntimeErrorEvent;
}

//#endregion

applyDebugLevel();

const logger = consola.withTag("sd:cli:server-runtime:worker");

/** Server instance (to be cleaned up) */
let serverInstance: { close: () => Promise<void> } | undefined;

/**
 * Clean up resources
 */
async function cleanup(): Promise<void> {
  const server = serverInstance;
  serverInstance = undefined;
  if (server != null) {
    await server.close();
  }
}

// Catch runtime errors that occur after server listen() and send them as a custom "error" event
// (Without this handler, the worker will crash but dev.ts's buildResolver won't be called, causing listr to hang)
process.on("uncaughtException", (err) => {
  logger.error("서버 런타임 미처리 에러", err);
  sender.send("error", {
    message: errNs.message(err),
  });
  // Allow event to be sent before exit
  setTimeout(() => process.exit(1), 100);
});

process.on("unhandledRejection", (reason) => {
  logger.error("서버 런타임 미처리 Promise 거부", reason);
  sender.send("error", {
    message: errNs.message(reason),
  });
  // Allow event to be sent before exit
  setTimeout(() => process.exit(1), 100);
});

registerCleanupHandlers(cleanup, logger);

/**
 * Check if a port is available for use
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
 * Find and return an available port starting from the specified port
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
 * Start Server Runtime
 * Import main.js, then listen
 */
async function start(info: ServerRuntimeStartInfo): Promise<void> {
  try {
    const startTime = performance.now();

    // Inject environment variables into process.env before importing main.js
    if (info.env != null) {
      for (const [key, value] of Object.entries(info.env)) {
        process.env[key] = value;
      }
    }

    // Import main.js (must export a server instance)
    logger.debug("main.js 임포트 중...");
    let stepStart = performance.now();
    const module = await import(pathToFileURL(info.mainJsPath).href);
    logger.debug(`main.js 임포트 완료 (${Math.round(performance.now() - stepStart)}ms)`);
    const server = module.server;

    if (server == null) {
      throw new Error("main.js must export a server instance.");
    }

    // Save server instance (for cleanup)
    serverInstance = server;

    // Register client proxies (before listen)
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

    // Find available port (auto-increment on port conflict)
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
