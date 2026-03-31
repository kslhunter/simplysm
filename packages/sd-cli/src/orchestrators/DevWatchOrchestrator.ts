import { spawn, type ChildProcess } from "child_process";
import { consola } from "consola";
import { Worker, type WorkerProxy, pathx } from "@simplysm/core-node";
import { FsWatcher } from "@simplysm/core-node";
import { err as errNs } from "@simplysm/core-common";
import type {
  SdBuildPackageConfig,
  SdClientPackageConfig,
  SdConfig,
  SdScriptsPackageConfig,
  SdServerPackageConfig,
} from "../sd-config.types";
import { loadSdConfig } from "../utils/sd-config";
import { filterPackagesByTargets, validateTargets, classifyWatchPackages, classifyDevPackages, buildPathMapFromConfig } from "../utils/package-utils";
import { getVersion } from "../utils/build-env";
import { watchReplaceDeps, type WatchReplaceDepResult } from "../utils/replace-deps";
import { printErrors, printServers } from "../utils/output-utils";
import { RebuildManager } from "../utils/rebuild-manager";
import { ResultCollector } from "../infra/ResultCollector";
import { SignalHandler } from "../infra/SignalHandler";
import { createBuildEngine, type BuildEngine, type BuildPackageInfo, type ClientPackageInfo, type ServerPackageInfo } from "../engines/index";
import { watchCopySrcFiles } from "../utils/copy-src";
import { Capacitor } from "../capacitor/capacitor";
import type * as ServerRuntimeWorkerModule from "../workers/server-runtime.worker";
import type { ServerReadyEventData, ErrorEventData } from "../utils/worker-events";

/**
 * Orchestrator mode
 */
export type OrchestratorMode = "watch" | "dev";

/**
 * DevWatchOrchestrator options
 */
export interface DevWatchOrchestratorOptions {
  mode: OrchestratorMode;
  targets: string[];
  options: string[];
}

/**
 * Unified Orchestrator for watch and dev modes.
 *
 * - watch: Library(js+dts) + Scripts(watch hook) + copySrc + replaceDeps
 * - dev: Server(js+runtime) + client-ready(skip) + replaceDeps
 */
export class DevWatchOrchestrator {
  private readonly _cwd: string;
  private readonly _options: DevWatchOrchestratorOptions;
  private readonly _logger;

  // Infrastructure
  private _resultCollector!: ResultCollector;
  private _signalHandler!: SignalHandler;
  private _rebuildManager!: RebuildManager;

  // Engines
  private readonly _libraryEngines: BuildEngine[] = [];
  private readonly _serverEngines = new Map<string, BuildEngine>();

  // Package info
  private _libraryPackages: BuildPackageInfo[] = [];
  private _serverPackages: Array<{ name: string; dir: string; config: SdServerPackageConfig }> = [];
  private _watchHookPackages: Array<{ name: string; dir: string; config: SdScriptsPackageConfig | SdBuildPackageConfig }> = [];
  private _clientPackages: Array<{ name: string; dir: string; config: SdClientPackageConfig }> = [];
  private readonly _clientEngines = new Map<string, BuildEngine>();
  private _serverClientsMap = new Map<string, string[]>();

  // Dev mode: runtime workers
  private _baseEnv: { VER: string; DEV: string } | undefined;
  private readonly _serverRuntimeWorkers = new Map<string, WorkerProxy<typeof ServerRuntimeWorkerModule>>();
  private _printServersTimer: ReturnType<typeof setTimeout> | undefined;
  private _serverRestartTimer: ReturnType<typeof setTimeout> | undefined;

  // Watchers
  private _copySrcWatchers: FsWatcher[] = [];
  private readonly _watchHookWatchers: FsWatcher[] = [];
  private readonly _watchHookChildren = new Map<string, ChildProcess>();
  private _replaceDepWatcher: WatchReplaceDepResult | undefined;

  private _replaceDeps: Record<string, string> | undefined;
  private _pathMap = new Map<string, string>();
  private _hasPackages = false;

  constructor(options: DevWatchOrchestratorOptions) {
    this._cwd = process.cwd();
    this._options = options;
    this._logger = consola.withTag(`sd:cli:${options.mode}`);
  }

  async initialize(): Promise<void> {
    this._logger.debug(`${this._options.mode} 시작`, { targets: this._options.targets });

    // sd.config.ts 로드
    let sdConfig: SdConfig;
    try {
      sdConfig = await loadSdConfig({
        cwd: this._cwd,
        dev: true,
        options: this._options.options,
      });
      this._logger.debug("sd.config.ts 로드 완료");
    } catch (err) {
      this._logger.error(`sd.config.ts 로드 실패: ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
      throw err;
    }

    // Build pathMap from config packages only (tests packages are excluded from watch/dev)
    this._pathMap = buildPathMapFromConfig(sdConfig.packages);

    // Validate targets
    validateTargets(this._options.targets, sdConfig.packages);

    // Store replaceDeps for engine creation
    this._replaceDeps = sdConfig.replaceDeps;

    // Start watch if replaceDeps config exists
    if (sdConfig.replaceDeps != null) {
      this._replaceDepWatcher = await watchReplaceDeps(this._cwd, sdConfig.replaceDeps);
    }

    // Prepare VER, DEV environment variables for dev mode
    if (this._options.mode === "dev") {
      const version = await getVersion(this._cwd);
      this._baseEnv = { VER: version, DEV: "true" };
    }

    // Filter by targets
    const allPackages = filterPackagesByTargets(sdConfig.packages, this._options.targets);

    // Classify packages based on mode
    if (this._options.mode === "watch") {
      const classified = classifyWatchPackages(allPackages, this._cwd, this._pathMap);
      this._libraryPackages = classified.libraryPackages;
      this._watchHookPackages = classified.watchHookPackages;
    } else {
      const classified = classifyDevPackages(allPackages, this._cwd, this._pathMap);
      this._serverPackages = classified.serverPackages;
      this._clientPackages = classified.clientPackages;
      this._serverClientsMap = classified.serverClientsMap;
    }

    // Check if there are packages to process
    const totalPackages = this._libraryPackages.length + this._serverPackages.length + this._watchHookPackages.length + this._clientPackages.length;
    if (totalPackages === 0) {
      const modeLabel = this._options.mode === "watch" ? "워치" : "개발";
      process.stdout.write(`⚠ ${modeLabel} 대상 패키지가 없습니다.\n`);
      return;
    }

    this._hasPackages = true;

    // Initialize infrastructure
    this._signalHandler = new SignalHandler();
    this._resultCollector = new ResultCollector();
    this._rebuildManager = new RebuildManager(this._logger);

    // Batch complete handler
    if (this._options.mode === "watch") {
      this._rebuildManager.on("batchComplete", (_completedKeys) => {
        printErrors(this._resultCollector.toMap());
      });
    } else {
      this._rebuildManager.on("batchComplete", (completedKeys) => {
        this._onDevBatchComplete(completedKeys);
      });
    }

    // Create BuildEngines for library packages (watch mode only)
    for (const pkg of this._libraryPackages) {
      const engine = createBuildEngine(pkg, {
        cwd: this._cwd,
        replaceDeps: this._replaceDeps,
        resultCollector: this._resultCollector,
        rebuildManager: this._rebuildManager,
      });
      this._libraryEngines.push(engine);
    }

    // Create BuildEngines for server packages
    for (const { name, dir, config } of this._serverPackages) {
      const engineConfig = this._options.mode === "dev"
        ? { ...config, env: { ...this._baseEnv, ...config.env } }
        : config;

      const engine = createBuildEngine(
        { name, dir, config: engineConfig } as ServerPackageInfo,
        {
          cwd: this._cwd,
          replaceDeps: this._replaceDeps,
          resultCollector: this._resultCollector,
          rebuildManager: this._rebuildManager,
        },
      );
      this._serverEngines.set(name, engine);
    }

    // Create BuildEngines for client packages (dev mode only)
    const resolvedReplaceDeps = this._replaceDepWatcher?.entries.map((e) => ({
      packageName: e.targetName,
      sourcePath: e.resolvedSourcePath,
    }));

    for (const { name, dir, config } of this._clientPackages) {
      const engineConfig = { ...config, env: { ...this._baseEnv, ...config.env } };
      const engine = createBuildEngine(
        { name, dir, config: engineConfig } as ClientPackageInfo,
        {
          cwd: this._cwd,
          replaceDeps: this._replaceDeps,
          resolvedReplaceDeps,
          resultCollector: this._resultCollector,
          rebuildManager: this._rebuildManager,
        },
      );
      this._clientEngines.set(name, engine);
    }
  }

  async start(): Promise<void> {
    if (!this._hasPackages) {
      this._logger.debug("대상 패키지 없음, start 건너뜀");
      return;
    }
    this._logger.debug("start 시작");

    if (this._options.mode === "watch") {
      await this._startWatchMode();
    } else {
      await this._startDevMode();
    }
  }

  async awaitTermination(): Promise<void> {
    if (!this._hasPackages) {
      return;
    }
    await this._signalHandler.waitForTermination();
  }

  async shutdown(): Promise<void> {
    if (!this._hasPackages) {
      return;
    }
    this._logger.debug("shutdown 시작");

    process.stdout.write("⏳ 종료 중...\n");

    const shutdownTasks: Array<Promise<void>> = [];

    // Stop all engines
    shutdownTasks.push(...this._libraryEngines.map((e) => e.stop()));
    shutdownTasks.push(...[...this._serverEngines.values()].map((e) => e.stop()));
    shutdownTasks.push(...[...this._clientEngines.values()].map((e) => e.stop()));

    // Close watchers (watch mode)
    shutdownTasks.push(...this._copySrcWatchers.map((w) => w.close()));
    shutdownTasks.push(...this._watchHookWatchers.map((w) => w.close()));

    // Kill hook child processes
    for (const child of this._watchHookChildren.values()) {
      if (child.exitCode == null) {
        child.kill();
      }
    }
    this._watchHookChildren.clear();

    // Terminate runtime workers (dev mode)
    shutdownTasks.push(...[...this._serverRuntimeWorkers.values()].map((w) => w.terminate()));

    await Promise.all(shutdownTasks);
    this._copySrcWatchers = [];
    this._watchHookWatchers.length = 0;
    this._replaceDepWatcher?.dispose();

    process.stdout.write("✔ 종료 완료\n");
  }

  // --- Watch mode ---

  private async _startWatchMode(): Promise<void> {
    this._logger.debug("watch 모드 시작");
    // Start copySrc watchers for library packages
    for (const pkg of this._libraryPackages) {
      if (pkg.config.copySrc != null && pkg.config.copySrc.length > 0) {
        const watcher = await watchCopySrcFiles(pkg.dir, pkg.config.copySrc);
        this._copySrcWatchers.push(watcher);
      }
    }

    // Start all engines
    const total = this._libraryEngines.length;
    this._logger.start(`초기 빌드 실행 중... (${total}개 패키지)`);
    let completed = 0;

    const watchPromises = this._libraryEngines.map(async (engine, i) => {
      const pkgName = this._libraryPackages[i].name;
      await engine.startWatch({ js: true, dts: true, lint: false });
      completed++;
      this._logger.info(`  [${completed}/${total}] ${pkgName} 완료`);
    });

    await Promise.allSettled(watchPromises);
    this._logger.success("초기 빌드 실행 완료");

    // Print initial build results
    printErrors(this._resultCollector.toMap());

    // Start watch hook watchers for scripts+watch packages
    for (const pkg of this._watchHookPackages) {
      const watchConfig = pkg.config.watch!;
      const watchTargets = watchConfig.target.map((t) => pathx.posixResolve(pkg.dir, t));

      // Run initial hook
      this._runWatchHookCmd(pkg.name, pkg.dir, watchConfig.cmd, watchConfig.args);

      // Start watching
      const watcher = await FsWatcher.watch(watchTargets);
      watcher.onChange({ delay: 300 }, () => {
        this._runWatchHookCmd(pkg.name, pkg.dir, watchConfig.cmd, watchConfig.args);
      });
      this._watchHookWatchers.push(watcher);

      this._logger.success(`워치 훅 시작됨: ${pkg.name}`);
    }
  }

  private _runWatchHookCmd(pkgName: string, cwd: string, cmd: string, args?: string[]): void {
    // Kill previous hook process if still running
    const prev = this._watchHookChildren.get(pkgName);
    if (prev != null && prev.exitCode == null) {
      prev.kill();
    }

    const child = spawn(cmd, args ?? [], { cwd, stdio: "inherit", shell: true });
    this._watchHookChildren.set(pkgName, child);

    child.on("error", (err) => {
      this._logger.error(`[${pkgName}] 워치 훅 에러: ${err.message}`);
    });
    child.on("close", (code) => {
      if (code !== 0 && code !== null) {
        this._logger.warn(`[${pkgName}] 워치 훅이 코드 ${String(code)}로 종료됨`);
      }
    });
  }

  // --- Dev mode ---

  private async _startDevMode(): Promise<void> {
    // Start client and server engines in parallel
    this._logger.debug("초기 빌드 시작");
    const initialBuildPromises: Array<{ name: string; promise: Promise<void> }> = [];

    for (const [name, engine] of this._clientEngines) {
      initialBuildPromises.push({
        name: `${name} (client)`,
        promise: engine.startWatch({ js: true, dts: false, lint: false }),
      });
    }

    for (const [name, engine] of this._serverEngines) {
      initialBuildPromises.push({
        name: `${name} (server)`,
        promise: engine.startWatch({ js: true, dts: false, lint: false }),
      });
    }

    const initialResults = await Promise.allSettled(
      initialBuildPromises.map((item) => item.promise),
    );

    initialResults.forEach((result, index) => {
      const taskName = initialBuildPromises[index].name;
      if (result.status === "rejected") {
        this._logger.debug(`[${taskName}] 초기 빌드 실패:`, result.reason);
      } else {
        this._logger.debug(`[${taskName}] 초기 빌드 완료`);
      }
    });

    // Register standalone client results in ResultCollector
    for (const { name } of this._clientPackages) {
      const isServerConnected = [...this._serverClientsMap.values()].some(
        (clients) => clients.includes(name),
      );
      if (!isServerConnected) {
        const port = this._getClientPort(name);
        if (port != null) {
          this._resultCollector.add({
            name,
            target: "client",
            type: "server",
            status: "running",
            port,
          });
        }
      }
    }

    // Initialize Capacitor for client packages (device execution is handled by the `device` command)
    for (const { name, config } of this._clientPackages) {
      const port = this._getClientPort(name);
      if (port == null) continue;

      const pkgDir = pathx.posixResolve(this._cwd, "packages", name);

      if (config.capacitor != null) {
        try {
          const cap = await Capacitor.create(pkgDir, config.capacitor, config.exclude);
          await cap.initialize();
        } catch (err) {
          this._logger.error(
            `[${name}] Capacitor 초기화 실패: ${errNs.message(err)}`,
          );
        }
      }
    }

    // Print initial results
    printErrors(this._resultCollector.toMap());
    printServers(this._resultCollector.toMap(), this._serverClientsMap);
  }

  private _onDevBatchComplete(completedKeys: string[]): void {
    this._logger.debug(`배치 완료 (${completedKeys.join(", ")})`);
    const serverBuildKeys = this._serverPackages.map((p) => `${p.name}:build`);
    if (!completedKeys.some((k) => serverBuildKeys.includes(k))) {
      printErrors(this._resultCollector.toMap());
      return;
    }

    if (this._serverRestartTimer != null) clearTimeout(this._serverRestartTimer);
    this._serverRestartTimer = setTimeout(() => {
      this._serverRestartTimer = undefined;
      void this._restartServers();
    }, 100);
  }

  private async _restartServers(): Promise<void> {
    this._logger.debug("서버 재시작 시작");
    const restartPromises: Array<Promise<void>> = [];
    for (const { name, config } of this._serverPackages) {
      const buildResult = this._resultCollector.get(`${name}:build`);
      if (buildResult?.status === "success") {
        const mainJsPath = pathx.posixResolve(this._cwd, "packages", name, "dist", "main.js");
        const clientPorts = this._collectClientPorts(name);
        restartPromises.push(
          this._startServerRuntime(name, mainJsPath, { ...this._baseEnv, ...config.env }, clientPorts)
            .catch((err: unknown) => {
              this._logger.error(`[${name}] 서버 런타임 시작 실패:`, errNs.message(err));
              this._resultCollector.add({
                name,
                target: "server",
                type: "server",
                status: "error",
                message: errNs.message(err),
              });
            }),
        );
      }
    }
    await Promise.all(restartPromises);
    this._logger.debug("서버 재시작 완료");
    printErrors(this._resultCollector.toMap());
    this._schedulePrintServers();
  }

  private _schedulePrintServers(): void {
    if (this._printServersTimer != null) clearTimeout(this._printServersTimer);
    this._printServersTimer = setTimeout(() => {
      printServers(this._resultCollector.toMap(), this._serverClientsMap);
    }, 300);
  }

  /** Get port from a client engine (duck-typing for ViteEngine.port) */
  private _getClientPort(name: string): number | undefined {
    const engine = this._clientEngines.get(name) as { port?: number } | undefined;
    return engine?.port;
  }

  /** Collect client ports for a server's connected clients */
  private _collectClientPorts(serverName: string): Record<string, number> {
    const clientPorts: Record<string, number> = {};
    const connectedClients = this._serverClientsMap.get(serverName) ?? [];
    for (const clientName of connectedClients) {
      const port = this._getClientPort(clientName);
      if (port != null) {
        clientPorts[clientName] = port;
      }
    }
    return clientPorts;
  }

  private async _startServerRuntime(
    serverName: string,
    mainJsPath: string,
    env?: Record<string, string>,
    clientPorts?: Record<string, number>,
  ): Promise<void> {
    this._logger.debug(`[${serverName}] 서버 런타임 시작: ${mainJsPath}`);

    // Terminate existing runtime
    const existingRuntime = this._serverRuntimeWorkers.get(serverName);
    if (existingRuntime != null) {
      this._logger.info(`[${serverName}] 서버 재시작 중...`);
      await existingRuntime.terminate();
    }

    // Create and start new runtime worker
    const runtimeWorkerPath = import.meta.resolve("../workers/server-runtime.worker");
    const runtimeWorker = Worker.create<typeof ServerRuntimeWorkerModule>(runtimeWorkerPath);
    this._serverRuntimeWorkers.set(serverName, runtimeWorker);

    // Runtime event handlers
    runtimeWorker.on("serverReady", (readyData) => {
      const readyEvent = readyData as ServerReadyEventData;
      this._resultCollector.add({
        name: serverName,
        target: "server",
        type: "server",
        status: "running",
        port: readyEvent.port,
      });
      this._schedulePrintServers();
    });

    runtimeWorker.on("error", (errorData) => {
      const errorEvent = errorData as ErrorEventData;
      this._resultCollector.add({
        name: serverName,
        target: "server",
        type: "server",
        status: "error",
        message: errorEvent.message,
      });
    });

    runtimeWorker
      .start({ mainJsPath, clientPorts, env })
      .catch((err: unknown) => {
        this._logger.error(`[${serverName}] 서버 런타임 워커 비정상 종료:`, errNs.message(err));
        this._resultCollector.add({
          name: serverName,
          target: "server",
          type: "server",
          status: "error",
          message: errNs.message(err),
        });
      });
  }
}
