import path from "path";
import fs from "fs";
import { build as viteBuild, createServer, type ViteDevServer } from "vite";
import { createWorker } from "@simplysm/core-node";
import { errorMessage } from "@simplysm/core-common";
import { consola } from "consola";
import type { SdClientPackageConfig } from "../sd-config.types";
import { parseRootTsconfig, getCompilerOptionsForPackage } from "../utils/tsconfig";
import { createViteConfig } from "../utils/vite-config";
import { collectDeps } from "../utils/package-utils";
import { registerCleanupHandlers, createOnceGuard } from "../utils/worker-utils";

//#region Types

/**
 * Client build information (for one-time build)
 */
export interface ClientBuildInfo {
  name: string;
  config: SdClientPackageConfig;
  cwd: string;
  pkgDir: string;
}

/**
 * Client build result
 */
export interface ClientBuildResult {
  success: boolean;
  errors?: string[];
}

/**
 * Client watch information
 */
export interface ClientWatchInfo {
  name: string;
  config: SdClientPackageConfig;
  cwd: string;
  pkgDir: string;
  /** replaceDeps configuration from sd.config.ts */
  replaceDeps?: Record<string, string>;
}

/**
 * Build event
 */
export interface ClientBuildEvent {
  success: boolean;
  errors?: string[];
}

/**
 * Server ready event
 */
export interface ClientServerReadyEvent {
  port: number;
}

/**
 * Error event
 */
export interface ClientErrorEvent {
  message: string;
}

/**
 * Worker event types
 */
export interface ClientWorkerEvents extends Record<string, unknown> {
  buildStart: Record<string, never>;
  build: ClientBuildEvent;
  serverReady: ClientServerReadyEvent;
  error: ClientErrorEvent;
  scopeRebuild: Record<string, never>;
}

//#endregion

//#region Resource Management

const logger = consola.withTag("sd:cli:client:worker");

/** Vite dev server (to be cleaned up) */
let viteServer: ViteDevServer | undefined;

/**
 * Clean up resources
 */
async function cleanup(): Promise<void> {
  // Capture global variable to temporary variable and initialize
  // (other calls can modify global variable while Promise.all is waiting)
  const serverToClose = viteServer;
  viteServer = undefined;

  if (serverToClose != null) {
    await serverToClose.close();
  }
}

// Clean up resources before process termination (SIGTERM/SIGINT)
// Note: worker.terminate() terminates immediately without calling these handlers.
// However, normal shutdown in watch mode is done through SIGINT/SIGTERM of main process, so no issues.
registerCleanupHandlers(cleanup, logger);

//#endregion

//#region Worker

/**
 * One-time build
 */
async function build(info: ClientBuildInfo): Promise<ClientBuildResult> {
  try {
    // Parse tsconfig
    const parsedConfig = parseRootTsconfig(info.cwd);
    const tsconfigPath = path.join(info.cwd, "tsconfig.json");

    // Create compilerOptions for browser target
    const compilerOptions = await getCompilerOptionsForPackage(
      parsedConfig.options,
      "browser",
      info.pkgDir,
    );

    // Create Vite configuration and build
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
      errors: [errorMessage(err)],
    };
  }
}

const guardStartWatch = createOnceGuard("startWatch");

/**
 * Start watch (Vite dev server)
 * @remarks This function should be called only once per worker.
 * @throws If watch is already started
 */
async function startWatch(info: ClientWatchInfo): Promise<void> {
  guardStartWatch();

  try {
    // Parse tsconfig
    const parsedConfig = parseRootTsconfig(info.cwd);
    const tsconfigPath = path.join(info.cwd, "tsconfig.json");

    // Create compilerOptions for browser target
    const compilerOptions = await getCompilerOptionsForPackage(
      parsedConfig.options,
      "browser",
      info.pkgDir,
    );

    // If server is 0, auto-assign port (server-connected client)
    // If server is a number, use that port (standalone client)
    const serverPort = typeof info.config.server === "number" ? info.config.server : 0;

    // Collect replaceDeps based on dependencies
    const { replaceDeps } = collectDeps(info.pkgDir, info.cwd, info.replaceDeps);

    // Create Vite configuration
    const viteConfig = createViteConfig({
      pkgDir: info.pkgDir,
      name: info.name,
      tsconfigPath,
      compilerOptions,
      env: info.config.env,
      mode: "dev",
      serverPort,
      replaceDeps,
      onScopeRebuild: () => sender.send("scopeRebuild", {}),
    });

    // Start Vite dev server
    viteServer = await createServer(viteConfig);
    await viteServer.listen();

    // Generate .config.json
    const confDistPath = path.join(info.pkgDir, "dist", ".config.json");
    fs.mkdirSync(path.dirname(confDistPath), { recursive: true });
    fs.writeFileSync(confDistPath, JSON.stringify(info.config.configs ?? {}, undefined, 2));

    // Get actual assigned port (config.server.port is the configured value, so get actual port from httpServer)
    const address = viteServer.httpServer?.address();
    const actualPort = typeof address === "object" && address != null ? address.port : undefined;

    if (actualPort == null) {
      sender.send("error", { message: "Unable to determine Vite dev server port." });
      return;
    }

    sender.send("serverReady", { port: actualPort });
  } catch (err) {
    sender.send("error", {
      message: errorMessage(err),
    });
  }
}

/**
 * Stop watch
 * @remarks Clean up Vite dev server.
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
