import path from "path";
import { Worker, type WorkerProxy } from "@simplysm/core-node";
import { errorMessage } from "@simplysm/core-common";
import type { SdConfig, SdClientPackageConfig, SdServerPackageConfig } from "../sd-config.types";
import { consola } from "consola";
import { loadSdConfig } from "../utils/sd-config";
import { getVersion } from "../utils/build-env";
import { watchReplaceDeps, type WatchReplaceDepResult } from "../utils/replace-deps";
import type * as ClientWorkerModule from "../workers/client.worker";
import type * as ServerWorkerModule from "../workers/server.worker";
import type * as ServerRuntimeWorkerModule from "../workers/server-runtime.worker";
import { Capacitor } from "../capacitor/capacitor";
import { filterPackagesByTargets } from "../utils/package-utils";
import type { BuildResult } from "../infra/ResultCollector";
import { formatBuildMessages, printErrors, printServers } from "../utils/output-utils";
import { RebuildManager } from "../utils/rebuild-manager";
import {
  registerWorkerEventHandlers,
  type BaseWorkerInfo,
  type ServerReadyEventData,
  type ServerBuildEventData,
  type ErrorEventData,
} from "../utils/worker-events";
import { SignalHandler } from "../infra/SignalHandler";

//#region Types

/**
 * Dev Orchestrator options
 */
export interface DevOrchestratorOptions {
  /** Filter for packages to develop (empty array means all packages) */
  targets: string[];
  options: string[];
}

/**
 * Client Worker info (for Vite dev server)
 */
interface ClientWorkerInfo {
  name: string;
  config: SdClientPackageConfig;
  worker: WorkerProxy<typeof ClientWorkerModule>;
  isInitialBuild: boolean;
  buildResolver: (() => void) | undefined;
}

//#endregion

//#region DevOrchestrator

/**
 * Orchestrator that coordinates dev mode execution
 *
 * Manages development mode execution for Client and Server packages.
 * - `client` target: Start Vite dev server
 * - `server` target: Server Build Worker + Server Runtime Worker
 * - Support for Server-Client proxy connections
 * - Support for Capacitor initialization
 * - Shutdown via SIGINT/SIGTERM signals
 */
export class DevOrchestrator {
  private readonly _options: DevOrchestratorOptions;
  private readonly _logger = consola.withTag("sd:cli:dev");
  private readonly _cwd: string;

  // Config
  private _sdConfig: SdConfig | undefined;
  private _baseEnv: { VER: string; DEV: string } | undefined;
  // Package classification
  private readonly _serverPackages: Array<{ name: string; config: SdServerPackageConfig }> = [];
  private readonly _clientPackages: Array<{ name: string; config: SdClientPackageConfig }> = [];
  private readonly _serverClientsMap = new Map<string, string[]>();
  private _hasPackages = false;

  // Workers
  private _standaloneClientWorkers: ClientWorkerInfo[] = [];
  private _viteClientWorkers: ClientWorkerInfo[] = [];
  private readonly _serverBuildWorkers = new Map<
    string,
    {
      worker: WorkerProxy<typeof ServerWorkerModule>;
      buildPromise: Promise<void>;
      buildResolver: () => void;
      mainJsPath?: string;
    }
  >();
  private readonly _serverRuntimeWorkers = new Map<
    string,
    WorkerProxy<typeof ServerRuntimeWorkerModule>
  >();

  // State
  private readonly _results = new Map<string, BuildResult>();
  private _clientPorts: Record<string, number> = {};
  private _rebuildManager!: RebuildManager;
  private _signalHandler!: SignalHandler;
  private _replaceDepWatcher: WatchReplaceDepResult | undefined;
  private _printServersTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(options: DevOrchestratorOptions) {
    this._cwd = process.cwd();
    this._options = options;
  }

  /**
   * Print server URL (debounce 300ms)
   *
   * Prevents duplicate output when server rebuild and scope rebuild occur simultaneously.
   */
  private _schedulePrintServers(): void {
    if (this._printServersTimer != null) clearTimeout(this._printServersTimer);
    this._printServersTimer = setTimeout(() => {
      printServers(this._results, this._serverClientsMap);
    }, 300);
  }

  /**
   * Initialize Orchestrator
   * - Load sd.config.ts
   * - Classify packages
   * - Prepare environment variables
   */
  async initialize(): Promise<void> {
    const { targets } = this._options;
    this._logger.debug("Starting dev mode", { targets });

    // Load sd.config.ts (required for dev mode to access package build information)
    try {
      this._sdConfig = await loadSdConfig({
        cwd: this._cwd,
        dev: true,
        opt: this._options.options,
      });
      this._logger.debug("sd.config.ts loaded successfully");
    } catch (err) {
      this._logger.error(`Failed to load sd.config.ts: ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
      throw err;
    }

    // Start watch for replaceDeps if configured (initial replacement is handled in sd-cli.ts)
    if (this._sdConfig.replaceDeps != null) {
      this._replaceDepWatcher = await watchReplaceDeps(this._cwd, this._sdConfig.replaceDeps);
    }

    // Prepare VER, DEV environment variables
    const version = await getVersion(this._cwd);
    this._baseEnv = { VER: version, DEV: "true" };

    // Filter targets
    const allPackages = filterPackagesByTargets(this._sdConfig.packages, targets);

    // Filter only client/server packages
    for (const [name, config] of Object.entries(allPackages)) {
      if (config.target === "server") {
        this._serverPackages.push({ name, config });
      } else if (config.target === "client") {
        this._clientPackages.push({ name, config });
      }
    }

    if (this._serverPackages.length === 0 && this._clientPackages.length === 0) {
      process.stdout.write("⚠ No client/server packages to develop.\n");
      return;
    }

    this._hasPackages = true;

    // Find clients connected to servers (only if server is a dev target)
    const serverNames = new Set(this._serverPackages.map(({ name }) => name));
    for (const { name, config } of this._clientPackages) {
      if (typeof config.server === "string" && serverNames.has(config.server)) {
        const clients = this._serverClientsMap.get(config.server) ?? [];
        clients.push(name);
        this._serverClientsMap.set(config.server, clients);
      }
    }

    // Initialize infrastructure
    this._rebuildManager = new RebuildManager(this._logger);
    this._signalHandler = new SignalHandler();

    // Print errors and server URL when batch is complete
    this._rebuildManager.on("batchComplete", () => {
      printErrors(this._results);
      this._schedulePrintServers();
    });
  }

  /**
   * Start dev mode
   * - Create workers
   * - Register event handlers
   * - Initial build and server startup
   * - Initialize Capacitor
   */
  async start(): Promise<void> {
    if (!this._hasPackages) {
      return;
    }

    const serverNames = new Set(this._serverPackages.map(({ name }) => name));

    // Worker paths
    const clientWorkerPath = import.meta.resolve("../workers/client.worker");
    const serverWorkerPath = import.meta.resolve("../workers/server.worker");
    const serverRuntimeWorkerPath = import.meta.resolve("../workers/server-runtime.worker");

    // Standalone client cases:
    // - server is a number
    // - server is a string but the server is not a dev target
    this._standaloneClientWorkers = this._clientPackages
      .filter(
        ({ config }) =>
          typeof config.server === "number" ||
          (typeof config.server === "string" && !serverNames.has(config.server)),
      )
      .map(({ name, config }) => ({
        name,
        config,
        worker: Worker.create<typeof ClientWorkerModule>(clientWorkerPath),
        isInitialBuild: true,
        buildResolver: undefined,
      }));

    // Vite workers for clients connected to servers (only if server is a dev target)
    this._viteClientWorkers = this._clientPackages
      .filter(({ config }) => typeof config.server === "string" && serverNames.has(config.server))
      .map(({ name, config }) => ({
        name,
        config,
        worker: Worker.create<typeof ClientWorkerModule>(clientWorkerPath),
        isInitialBuild: true,
        buildResolver: undefined,
      }));

    // Setup and start workers for each section
    const standaloneClientPromises = this._setupStandaloneClients();
    const { buildPromises: viteClientPromises, readyPromises: viteClientReadyPromises } =
      this._setupViteClients();
    const serverPromises = this._setupServers(
      serverWorkerPath,
      serverRuntimeWorkerPath,
      viteClientReadyPromises,
    );

    // Wait for initial build to complete (parallel execution)
    this._logger.debug("Starting initial build (Promise.allSettled)");
    const initialBuildPromises: Array<{ name: string; promise: Promise<void> }> = [
      ...standaloneClientPromises,
      ...viteClientPromises,
      ...serverPromises,
    ];

    const initialResults = await Promise.allSettled(
      initialBuildPromises.map((item) => item.promise),
    );

    initialResults.forEach((result, index) => {
      const taskName = initialBuildPromises[index].name;
      if (result.status === "rejected") {
        this._logger.debug(`[${taskName}] Initial build failed:`, result.reason);
      } else {
        this._logger.debug(`[${taskName}] Initial build completed`);
      }
    });

    // Initialize Capacitor (for packages in client target with capacitor configuration)
    const capacitorPackages: Array<[string, SdClientPackageConfig]> = [];
    for (const { name, config } of this._clientPackages) {
      if (config.capacitor != null) {
        capacitorPackages.push([name, config]);
      }
    }

    if (capacitorPackages.length > 0) {
      for (const [name, config] of capacitorPackages) {
        const taskName = `${name} (capacitor)`;
        this._logger.start(taskName);
        const pkgDir = path.join(this._cwd, "packages", name);
        try {
          const cap = await Capacitor.create(pkgDir, config.capacitor!);
          await cap.initialize();
          this._results.set(`${name}:capacitor`, {
            name,
            target: "client",
            type: "capacitor",
            status: "success",
          });
          this._logger.success(taskName);
        } catch (err) {
          this._results.set(`${name}:capacitor`, {
            name,
            target: "client",
            type: "capacitor",
            status: "error",
            message: errorMessage(err),
          });
          this._logger.fail(taskName);
        }
      }
    }

    // Print initial build results
    printErrors(this._results);
    printServers(this._results, this._serverClientsMap);
  }

  /**
   * Setup and start standalone client workers
   */
  private _setupStandaloneClients(): Array<{ name: string; promise: Promise<void> }> {
    const buildPromises = new Map<string, Promise<void>>();
    for (const workerInfo of this._standaloneClientWorkers) {
      buildPromises.set(
        workerInfo.name,
        new Promise<void>((resolve) => {
          workerInfo.buildResolver = resolve;
        }),
      );
    }

    // 이벤트 핸들러 등록
    for (const workerInfo of this._standaloneClientWorkers) {
      const completeTask = registerWorkerEventHandlers(
        workerInfo as unknown as BaseWorkerInfo,
        {
          resultKey: `${workerInfo.name}:build`,
          listrTitle: `${workerInfo.name} (client)`,
          resultType: "build",
        },
        this._results,
        this._rebuildManager,
      );

      // serverReady (Vite dev server)
      workerInfo.worker.on("serverReady", (data) => {
        const event = data as ServerReadyEventData;
        completeTask({
          name: workerInfo.name,
          target: workerInfo.config.target,
          type: "server",
          status: "running",
          port: event.port,
        });
      });

      // Print server URL when scope package rebuild is detected
      workerInfo.worker.on("scopeRebuild", () => {
        this._schedulePrintServers();
      });

      // Start worker
      const pkgDir = path.join(this._cwd, "packages", workerInfo.name);
      const clientConfig: SdClientPackageConfig = {
        ...workerInfo.config,
        env: { ...this._baseEnv, ...workerInfo.config.env },
      };
      workerInfo.worker
        .startWatch({
          name: workerInfo.name,
          config: clientConfig,
          cwd: this._cwd,
          pkgDir,
          replaceDeps: this._sdConfig!.replaceDeps,
        })
        .catch((err: unknown) => {
          completeTask({
            name: workerInfo.name,
            target: workerInfo.config.target,
            type: "build",
            status: "error",
            message: errorMessage(err),
          });
        });
    }

    return this._standaloneClientWorkers.map((workerInfo) => ({
      name: `${workerInfo.name} (client)`,
      promise: buildPromises.get(workerInfo.name) ?? Promise.resolve(),
    }));
  }

  /**
   * Setup and start Vite client (server-connected) workers
   */
  private _setupViteClients(): {
    buildPromises: Array<{ name: string; promise: Promise<void> }>;
    readyPromises: Map<string, { promise: Promise<void>; resolver: () => void }>;
  } {
    const buildPromiseMap = new Map<string, Promise<void>>();
    const readyPromises = new Map<string, { promise: Promise<void>; resolver: () => void }>();
    for (const workerInfo of this._viteClientWorkers) {
      buildPromiseMap.set(
        workerInfo.name,
        new Promise<void>((resolve) => {
          workerInfo.buildResolver = resolve;
        }),
      );
      // Vite server ready promise (wait until server knows client port)
      let readyResolver!: () => void;
      const readyPromise = new Promise<void>((resolve) => {
        readyResolver = resolve;
      });
      readyPromises.set(workerInfo.name, {
        promise: readyPromise,
        resolver: readyResolver,
      });
    }

    // Register event handlers
    for (const workerInfo of this._viteClientWorkers) {
      const completeTask = registerWorkerEventHandlers(
        workerInfo as unknown as BaseWorkerInfo,
        {
          resultKey: `${workerInfo.name}:build`,
          listrTitle: `${workerInfo.name} (client)`,
          resultType: "build",
        },
        this._results,
        this._rebuildManager,
      );

      // serverReady - Store Vite port in clientPorts (URL is printed via server)
      workerInfo.worker.on("serverReady", (data) => {
        const event = data as ServerReadyEventData;
        this._logger.debug(`[${workerInfo.name}] Vite serverReady (port: ${String(event.port)})`);
        this._clientPorts[workerInfo.name] = event.port;
        // Notify Vite server ready (server is waiting for proxy setup)
        readyPromises.get(workerInfo.name)?.resolver();
        // Call completeTask for build completion (Vite doesn't emit build event)
        completeTask({
          name: workerInfo.name,
          target: workerInfo.config.target,
          type: "build",
          status: "success",
        });
      });

      // Also resolve readyPromises on Vite client error
      // (prevent server from hanging indefinitely in await Promise.all(clientReadyPromises))
      workerInfo.worker.on("error", () => {
        readyPromises.get(workerInfo.name)?.resolver();
      });

      // Print server URL when scope package rebuild is detected
      workerInfo.worker.on("scopeRebuild", () => {
        this._schedulePrintServers();
      });

      // Start worker
      const pkgDir = path.join(this._cwd, "packages", workerInfo.name);
      // Allow Vite to automatically assign port
      const viteConfig: SdClientPackageConfig = {
        ...workerInfo.config,
        server: 0, // Vite will automatically assign port
        env: { ...this._baseEnv, ...workerInfo.config.env },
      };
      workerInfo.worker
        .startWatch({
          name: workerInfo.name,
          config: viteConfig,
          cwd: this._cwd,
          pkgDir,
          replaceDeps: this._sdConfig!.replaceDeps,
        })
        .catch((err: unknown) => {
          completeTask({
            name: workerInfo.name,
            target: workerInfo.config.target,
            type: "build",
            status: "error",
            message: errorMessage(err),
          });
        });
    }

    return {
      buildPromises: this._viteClientWorkers.map((workerInfo) => ({
        name: `${workerInfo.name} (client)`,
        promise: buildPromiseMap.get(workerInfo.name) ?? Promise.resolve(),
      })),
      readyPromises,
    };
  }

  /**
   * Setup and start Server Build/Runtime workers
   */
  private _setupServers(
    serverWorkerPath: string,
    serverRuntimeWorkerPath: string,
    viteClientReadyPromises: Map<string, { promise: Promise<void>; resolver: () => void }>,
  ): Array<{ name: string; promise: Promise<void> }> {
    // Create Server Build Worker and promise
    for (const { name } of this._serverPackages) {
      let resolver!: () => void;
      const promise = new Promise<void>((resolve) => {
        resolver = resolve;
      });
      this._serverBuildWorkers.set(name, {
        worker: Worker.create<typeof ServerWorkerModule>(serverWorkerPath),
        buildPromise: promise,
        buildResolver: resolver,
      });
    }

    // Server Runtime Promise (wait for initial server startup to complete)
    const serverRuntimePromises = new Map<
      string,
      { promise: Promise<void>; resolver: () => void }
    >();
    for (const { name } of this._serverPackages) {
      let resolver!: () => void;
      const promise = new Promise<void>((resolve) => {
        resolver = resolve;
      });
      serverRuntimePromises.set(name, { promise, resolver });
    }

    // Register Server Build Worker event handlers
    for (const { name } of this._serverPackages) {
      const serverBuild = this._serverBuildWorkers.get(name)!;
      let isFirstBuild = true;

      serverBuild.worker.on("buildStart", () => {
        if (!isFirstBuild) {
          // Register with RebuildManager on rebuild
          const resolver = this._rebuildManager.registerBuild(`${name}:server`, `${name} (server)`);
          this._serverBuildWorkers.set(name, {
            ...serverBuild,
            buildResolver: resolver,
          });
        }
      });

      serverBuild.worker.on("build", (data) => {
        const event = data as ServerBuildEventData;
        this._logger.debug(`[${name}] server build: success=${String(event.success)}`);

        // Print warnings
        if (event.warnings != null && event.warnings.length > 0) {
          this._logger.warn(formatBuildMessages(name, "server", event.warnings));
        }

        if (!event.success) {
          this._results.set(`${name}:build`, {
            name,
            target: "server",
            type: "build",
            status: "error",
            message: event.errors?.join("\n"),
          });

          if (isFirstBuild) {
            isFirstBuild = false;
            serverRuntimePromises.get(name)?.resolver();
          }
          this._serverBuildWorkers.get(name)!.buildResolver();
          return;
        }

        // Start runtime worker on build success (separate async function to prevent error propagation)
        void startServerRuntime(name, event.mainJsPath).catch((err: unknown) => {
          const message = errorMessage(err);
          this._logger.error(`[${name}] Error starting Server Runtime:`, message);

          this._results.set(`${name}:server`, {
            name,
            target: "server",
            type: "server",
            status: "error",
            message,
          });

          if (isFirstBuild) {
            isFirstBuild = false;
            serverRuntimePromises.get(name)?.resolver();
          }
          const updatedBuild = this._serverBuildWorkers.get(name)!;
          updatedBuild.buildResolver();
        });
      });

      /**
       * Start server runtime worker.
       * Separated as a dedicated function to catch errors from async event handlers.
       */
      const startServerRuntime = async (serverName: string, mainJsPath: string): Promise<void> => {
        this._logger.debug(`[${serverName}] startServerRuntime: ${mainJsPath}`);
        const updatedBuild = this._serverBuildWorkers.get(serverName)!;
        updatedBuild.mainJsPath = mainJsPath;

        // Terminate existing Server Runtime Worker
        const existingRuntime = this._serverRuntimeWorkers.get(serverName);
        if (existingRuntime != null) {
          this._logger.info(`[${serverName}] Restarting server...`);
          await existingRuntime.terminate();
        }

        // Create and start new Server Runtime Worker
        const runtimeWorker =
          Worker.create<typeof ServerRuntimeWorkerModule>(serverRuntimeWorkerPath);
        this._serverRuntimeWorkers.set(serverName, runtimeWorker);

        // Wait for Vite servers of clients connected to this server to be ready
        const connectedClients = this._serverClientsMap.get(serverName) ?? [];
        const clientReadyPromises = connectedClients
          .map((clientName) => viteClientReadyPromises.get(clientName)?.promise)
          .filter((p): p is Promise<void> => p != null);
        this._logger.debug(
          `[${serverName}] Waiting for clients: ${String(clientReadyPromises.length)} total`,
        );
        if (clientReadyPromises.length > 0) {
          await Promise.all(clientReadyPromises);
        }

        // Collect client ports for this server
        const serverClientPorts: Record<string, number> = {};
        for (const clientName of connectedClients) {
          if (clientName in this._clientPorts) {
            serverClientPorts[clientName] = this._clientPorts[clientName];
          }
        }

        // Server Runtime event handlers
        runtimeWorker.on("serverReady", (readyData) => {
          const readyEvent = readyData as ServerReadyEventData;
          this._results.set(`${serverName}:server`, {
            name: serverName,
            target: "server",
            type: "server",
            status: "running",
            port: readyEvent.port,
          });

          if (isFirstBuild) {
            isFirstBuild = false;
            serverRuntimePromises.get(serverName)?.resolver();
          }
          updatedBuild.buildResolver();
        });

        runtimeWorker.on("error", (errorData) => {
          const errorEvent = errorData as ErrorEventData;
          this._results.set(`${serverName}:server`, {
            name: serverName,
            target: "server",
            type: "server",
            status: "error",
            message: errorEvent.message,
          });

          if (isFirstBuild) {
            isFirstBuild = false;
            serverRuntimePromises.get(serverName)?.resolver();
          }
          updatedBuild.buildResolver();
        });

        // Start Server Runtime
        // If worker crashes, it terminates without emitting "serverReady"/"error" events,
        // so catch promise rejection to prevent hanging
        runtimeWorker
          .start({
            mainJsPath,
            clientPorts: serverClientPorts,
          })
          .catch((err: unknown) => {
            const message = errorMessage(err);
            this._logger.error(`[${serverName}] Server Runtime Worker crashed:`, message);

            this._results.set(`${serverName}:server`, {
              name: serverName,
              target: "server",
              type: "server",
              status: "error",
              message,
            });

            if (isFirstBuild) {
              isFirstBuild = false;
              serverRuntimePromises.get(serverName)?.resolver();
            }
            updatedBuild.buildResolver();
          });
      };

      serverBuild.worker.on("error", (data) => {
        const event = data as ErrorEventData;
        this._results.set(`${name}:build`, {
          name,
          target: "server",
          type: "build",
          status: "error",
          message: event.message,
        });
        if (isFirstBuild) {
          isFirstBuild = false;
          serverRuntimePromises.get(name)?.resolver();
        }
        this._serverBuildWorkers.get(name)!.buildResolver();
      });
    }

    // Start Server Build workers
    for (const { name, config } of this._serverPackages) {
      const pkgDir = path.join(this._cwd, "packages", name);
      const serverBuild = this._serverBuildWorkers.get(name)!;
      serverBuild.worker
        .startWatch({
          name,
          cwd: this._cwd,
          pkgDir,
          replaceDeps: this._sdConfig!.replaceDeps,
          env: { ...this._baseEnv, ...config.env },
          configs: config.configs,
          externals: config.externals,
        })
        .catch((err: unknown) => {
          this._results.set(`${name}:build`, {
            name,
            target: "server",
            type: "build",
            status: "error",
            message: errorMessage(err),
          });
          serverRuntimePromises.get(name)?.resolver();
          serverBuild.buildResolver();
        });
    }

    return this._serverPackages.map(({ name }) => ({
      name: `${name} (server)`,
      promise: serverRuntimePromises.get(name)?.promise ?? Promise.resolve(),
    }));
  }

  /**
   * Wait for termination signal
   */
  async awaitTermination(): Promise<void> {
    if (!this._hasPackages) {
      return;
    }
    await this._signalHandler.waitForTermination();
  }

  /**
   * Shutdown orchestrator
   */
  async shutdown(): Promise<void> {
    if (!this._hasPackages) {
      return;
    }

    // Terminate workers (all workers)
    process.stdout.write("⏳ Shutting down...\n");
    await Promise.all([
      ...this._standaloneClientWorkers.map(({ worker }) => worker.terminate()),
      ...this._viteClientWorkers.map(({ worker }) => worker.terminate()),
      ...[...this._serverBuildWorkers.values()].map(({ worker }) => worker.terminate()),
      ...[...this._serverRuntimeWorkers.values()].map((worker) => worker.terminate()),
    ]);
    this._replaceDepWatcher?.dispose();
    process.stdout.write("✔ Done\n");
  }
}

//#endregion
