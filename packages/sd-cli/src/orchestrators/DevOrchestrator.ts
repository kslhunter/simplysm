import { pathx } from "@simplysm/core-node";
import { err as errNs } from "@simplysm/core-common";
import type {
  SdClientPackageConfig,
  SdConfig,
  SdServerPackageConfig,
} from "../sd-config.types";
import { filterPackagesByTargets, classifyDevPackages } from "../utils/package-classify";
import { printDiagnostics, printServers } from "../utils/output-utils";
import { createBuildEngine } from "../engines/engine-factory";
import type { BuildEngine } from "../engines/types";
import { Capacitor } from "../capacitor/capacitor";
import { BaseOrchestrator } from "./BaseOrchestrator";
import { ServerRuntimeManager } from "./ServerRuntimeManager";
import type { OrchestratorLifecycle } from "./types";

/**
 * DevOrchestrator 옵션
 */
export interface DevOrchestratorOptions {
  targets: string[];
  options: string[];
}

/**
 * dev 모드 전용 Orchestrator
 *
 * 서버(JS+런타임) + 클라이언트(Vite dev server) + replaceDeps 감시
 */
export class DevOrchestrator extends BaseOrchestrator implements OrchestratorLifecycle {
  private readonly _options: DevOrchestratorOptions;

  // dev 전용 상태
  private readonly _serverEngines = new Map<string, BuildEngine>();
  private readonly _clientEngines = new Map<string, BuildEngine>();
  private _serverPackages: Array<{ name: string; dir: string; config: SdServerPackageConfig }> = [];
  private _clientPackages: Array<{ name: string; dir: string; config: SdClientPackageConfig }> = [];
  private _serverClientsMap = new Map<string, string[]>();
  private _serverRuntimeManager!: ServerRuntimeManager;
  private _serverRestartTimer: ReturnType<typeof setTimeout> | undefined;
  private _printServersTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(options: DevOrchestratorOptions) {
    super("sd:cli:dev");
    this._options = options;
  }

  override async initialize(): Promise<void> {
    await super.initialize({
      targets: this._options.targets,
      options: this._options.options,
      dev: true,
    });
  }

  protected _initializeMode(
    config: SdConfig,
    targets: string[],
  ): void {
    // 대상으로 필터링
    const allPackages = filterPackagesByTargets(config.packages, targets);

    // dev 모드 패키지 분류
    const classified = classifyDevPackages(allPackages, this._cwd, this._pathMap);
    this._serverPackages = classified.serverPackages;
    this._clientPackages = classified.clientPackages;
    this._serverClientsMap = classified.serverClientsMap;

    // 처리할 패키지가 있는지 확인
    const totalPackages = this._serverPackages.length + this._clientPackages.length;
    if (totalPackages === 0) {
      process.stdout.write("⚠ 개발 대상 패키지가 없습니다.\n");
      return;
    }

    this._hasPackages = true;
  }

  protected _initializeEngines(_config: SdConfig): void {
    // ServerRuntimeManager 생성
    this._serverRuntimeManager = new ServerRuntimeManager(this._logger);

    // 서버 패키지용 BuildEngine 생성
    for (const { name, dir, config } of this._serverPackages) {
      const engineConfig = { ...config, env: { ...this._baseEnv, ...config.env } };

      const engine = createBuildEngine(
        { name, dir, config: engineConfig },
        {
          cwd: this._cwd,
          replaceDeps: this._replaceDeps,
          resultCollector: this._resultCollector,
          rebuildManager: this._rebuildManager,
        },
      );
      this._serverEngines.set(name, engine);
    }

    // 클라이언트 패키지용 BuildEngine 생성
    for (const { name, dir, config } of this._clientPackages) {
      const engineConfig = { ...config, env: { ...this._baseEnv, ...config.env } };
      const engine = createBuildEngine(
        { name, dir, config: engineConfig },
        {
          cwd: this._cwd,
          replaceDeps: this._replaceDeps,
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
    this._logger.debug("dev 모드 시작");

    await this._startDevMode();
  }

  private async _startDevMode(): Promise<void> {
    // Start client and server engines in parallel
    this._logger.debug("초기 빌드 시작");
    const initialBuildPromises: Array<{ name: string; promise: Promise<void> }> = [];

    for (const [name, engine] of this._clientEngines) {
      initialBuildPromises.push({
        name: `${name} (client)`,
        promise: engine.startWatch({ js: true, dts: false, lint: false, includeTests: false }),
      });
    }

    for (const [name, engine] of this._serverEngines) {
      initialBuildPromises.push({
        name: `${name} (server)`,
        promise: engine.startWatch({ js: true, dts: false, lint: false, includeTests: false }),
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

    // 서버에 연결된 클라이언트 Set 구성
    const serverConnectedClients = new Set(
      [...this._serverClientsMap.values()].flat(),
    );

    // 독립 클라이언트 결과를 ResultCollector에 등록
    for (const { name } of this._clientPackages) {
      if (!serverConnectedClients.has(name)) {
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

    // 클라이언트 패키지의 Capacitor 초기화
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

    // 모든 엔진 준비 완료 후 서버 런타임 시작
    await this._restartServers();

    // 독립 클라이언트만 존재하고 서버가 없는 경우 URL 출력 예약
    if (this._serverPackages.length === 0) {
      const hasIndependentClients = this._clientPackages.some(({ name }) =>
        !serverConnectedClients.has(name) && this._getClientPort(name) != null,
      );
      if (hasIndependentClients) {
        this._schedulePrintServers();
      }
    }

    // dev 모드 배치 완료 핸들러 등록
    this._rebuildManager.on("batchComplete", (completedKeys) => {
      this._onDevBatchComplete(completedKeys);
    });
  }

  private _onDevBatchComplete(completedKeys: string[]): void {
    this._logger.debug(`배치 완료 (${completedKeys.join(", ")})`);
    const serverBuildKeys = this._serverPackages.map((p) => `${p.name}:build`);
    if (!completedKeys.some((k) => serverBuildKeys.includes(k))) {
      printDiagnostics(this._resultCollector.toMap());
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
          this._serverRuntimeManager.startRuntime({
            serverName: name,
            mainJsPath,
            env: { ...this._baseEnv, ...config.env },
            clientPorts,
            resultCollector: this._resultCollector,
            onServerReady: () => this._schedulePrintServers(),
          }).catch((err: unknown) => {
            this._logger.error(`[${name}] 서버 런타임 시작 실패:`, errNs.message(err));
            this._logger.debug(`[${name}] 서버 런타임 시작 실패 스택:\n${errNs.stack(err)}`);
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
    printDiagnostics(this._resultCollector.toMap());
  }

  private _schedulePrintServers(): void {
    if (this._printServersTimer != null) clearTimeout(this._printServersTimer);
    this._printServersTimer = setTimeout(() => {
      printServers(this._resultCollector.toMap(), this._serverClientsMap);
    }, 300);
  }

  private _getClientPort(name: string): number | undefined {
    return this._clientEngines.get(name)?.port;
  }

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

  protected async _shutdownMode(): Promise<void> {
    // pending 타이머 정리
    if (this._printServersTimer != null) {
      clearTimeout(this._printServersTimer);
      this._printServersTimer = undefined;
    }
    if (this._serverRestartTimer != null) {
      clearTimeout(this._serverRestartTimer);
      this._serverRestartTimer = undefined;
    }

    const shutdownTasks: Array<Promise<void>> = [];

    // 모든 엔진 중지
    shutdownTasks.push(...[...this._serverEngines.values()].map((e) => e.stop()));
    shutdownTasks.push(...[...this._clientEngines.values()].map((e) => e.stop()));

    // 런타임 워커 종료
    shutdownTasks.push(this._serverRuntimeManager.shutdownAll());

    await Promise.all(shutdownTasks);
  }
}
