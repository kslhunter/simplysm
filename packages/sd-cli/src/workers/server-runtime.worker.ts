import proxy from "@fastify/http-proxy";
import { createWorker } from "@simplysm/core-node";
import { err as errNs } from "@simplysm/core-common";
import { consola } from "consola";
import net from "net";
import { pathToFileURL } from "url";
import { registerCleanupHandlers, applyDebugLevel } from "../utils/worker-utils";

//#region Types

/**
 * Server runtime start info
 */
export interface ServerRuntimeStartInfo {
  mainJsPath: string;
  clientPorts: Record<string, number>;
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
  if (server != null) {
    await server.close();
  }
  serverInstance = undefined;
}

// Catch runtime errors that occur after server listen() and send them as a custom "error" event
// (Without this handler, the worker will crash but dev.ts's buildResolver won't be called, causing listr to hang)
process.on("uncaughtException", (err) => {
  logger.error("Unhandled server runtime error", err);
  sender.send("error", {
    message: errNs.message(err),
  });
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled server runtime promise rejection", reason);
  sender.send("error", {
    message: errNs.message(reason),
  });
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
 * Import main.js, configure Vite proxy, then listen
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
    logger.debug("[start] Importing main.js...");
    let stepStart = performance.now();
    const module = await import(pathToFileURL(info.mainJsPath).href);
    logger.debug(`[start] main.js imported (${Math.round(performance.now() - stepStart)}ms)`);
    const server = module.server;

    if (server == null) {
      throw new Error("main.js must export a server instance.");
    }

    // Save server instance (for cleanup)
    serverInstance = server;

    // Find available port (auto-increment on port conflict)
    logger.debug("[start] Finding available port...");
    stepStart = performance.now();
    const originalPort = server.options.port;
    const availablePort = await findAvailablePort(originalPort);
    if (availablePort !== originalPort) {
      logger.info(`Port ${originalPort} in use, changing to ${availablePort}`);
      server.options.port = availablePort;
    }
    logger.debug(
      `[start] Port ${String(availablePort)} available (${Math.round(performance.now() - stepStart)}ms)`,
    );

    // Configure Vite proxy (only if clientPorts exists)
    const clientEntries = Object.entries(info.clientPorts);
    if (clientEntries.length > 0) {
      logger.debug(
        `[start] Configuring ${String(clientEntries.length)} Vite proxy(s)...`,
      );
      stepStart = performance.now();
    }
    for (const [name, port] of clientEntries) {
      logger.debug(`[start] Registering proxy: /${name} -> http://127.0.0.1:${String(port)}`);
      await server.fastify.register(proxy, {
        prefix: `/${name}`,
        upstream: `http://127.0.0.1:${port}`,
        rewritePrefix: `/${name}`,
        websocket: true,
      });
    }
    if (clientEntries.length > 0) {
      logger.debug(
        `[start] Proxies configured (${Math.round(performance.now() - stepStart)}ms)`,
      );
    }

    // Start server
    logger.debug("[start] Starting server listen...");
    stepStart = performance.now();
    await server.listen();
    logger.debug(`[start] Server listening (${Math.round(performance.now() - stepStart)}ms)`);

    logger.debug(
      `[start] Total runtime startup: ${Math.round(performance.now() - startTime)}ms`,
    );

    sender.send("serverReady", { port: server.options.port });
  } catch (err) {
    logger.error("Server Runtime startup failed", err);
    sender.send("error", {
      message: errNs.message(err),
    });
  }
}

const sender = createWorker<{ start: typeof start }, ServerRuntimeWorkerEvents>({
  start,
});

export default sender;
