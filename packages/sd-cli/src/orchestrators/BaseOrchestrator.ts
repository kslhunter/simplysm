import { consola, type ConsolaInstance } from "consola";
import type { SdConfig } from "../sd-config.types";
import { loadSdConfig } from "../utils/sd-config";
import { getVersion } from "../utils/build-env";
import { buildPathMapFromConfig, validateTargets } from "../utils/package-utils";
import { watchReplaceDeps, type WatchReplaceDepResult } from "../deps/replace-deps/replace-deps";
import { RebuildManager } from "../runtime/rebuild-manager";
import { ResultCollector } from "../runtime/ResultCollector";
import { SignalHandler } from "../runtime/SignalHandler";
/**
 * Orchestrator 공통 기반 클래스
 *
 * sd.config.ts 로드, pathMap 구축, 대상 검증, replaceDeps 감시,
 * 런타임(SignalHandler, ResultCollector, RebuildManager) 초기화를 수행한다.
 *
 * 서브클래스(WatchOrchestrator, DevOrchestrator)가 OrchestratorLifecycle을 implements한다.
 * BaseOrchestrator.initialize()는 params를 받으므로 인터페이스와 직접 호환되지 않으며,
 * 서브클래스가 parameterless override를 제공한다.
 */
export abstract class BaseOrchestrator {
  protected readonly _cwd: string;
  protected readonly _logger: ConsolaInstance;

  // 런타임
  protected _resultCollector!: ResultCollector;
  protected _signalHandler!: SignalHandler;
  protected _rebuildManager!: RebuildManager;

  // 공통 상태
  protected _pathMap = new Map<string, string>();
  protected _baseEnv!: { VER: string; DEV: string };
  protected _replaceDeps: Record<string, string> | undefined;
  protected _replaceDepWatcher: WatchReplaceDepResult | undefined;
  protected _hasPackages = false;

  constructor(logTag: string) {
    this._cwd = process.cwd();
    this._logger = consola.withTag(logTag);
  }

  async initialize(params: {
    targets: string[];
    options: string[];
    dev: boolean;
  }): Promise<void> {
    this._logger.debug(`시작`, { targets: params.targets });

    // 1. sd.config.ts 로드
    let sdConfig: SdConfig;
    try {
      sdConfig = await loadSdConfig({
        cwd: this._cwd,
        dev: params.dev,
        opt: params.options,
      });
      this._logger.debug("sd.config.ts 로드 완료");
    } catch (err) {
      this._logger.error(`sd.config.ts 로드 실패: ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
      throw err;
    }

    // 2. pathMap 구축
    this._pathMap = buildPathMapFromConfig(sdConfig.packages);

    // 3. 대상 유효성 검사
    validateTargets(params.targets, sdConfig.packages);

    // 4. 환경변수 준비 (VER, DEV)
    const version = await getVersion(this._cwd);
    this._baseEnv = { VER: version, DEV: params.dev ? "true" : "false" };

    // 5. replaceDeps 저장 + watch 시작
    this._replaceDeps = sdConfig.replaceDeps;
    if (sdConfig.replaceDeps != null) {
      this._replaceDepWatcher = await watchReplaceDeps(this._cwd, sdConfig.replaceDeps);
    }

    // 6. 서브클래스 초기화 (패키지 분류, 엔진 생성 등)
    await this._initializeMode(sdConfig, params.targets);

    // 7. 패키지 유무 확인 후 런타임 초기화
    if (!this._hasPackages) return;
    this._signalHandler = new SignalHandler();
    this._resultCollector = new ResultCollector();
    this._rebuildManager = new RebuildManager(this._logger);

    // 8. 런타임 의존 초기화 (엔진 생성 등)
    await this._initializeEngines(sdConfig);
  }

  abstract start(): Promise<void>;

  async awaitTermination(): Promise<void> {
    if (!this._hasPackages) return;
    await this._signalHandler.waitForTermination();
  }

  async shutdown(): Promise<void> {
    // replaceDepWatcher는 항상 정리 (initialize 부분 실패 대응)
    this._replaceDepWatcher?.dispose();
    this._replaceDepWatcher = undefined;

    if (!this._hasPackages) return;
    process.stdout.write("⏳ 종료 중...\n");
    await this._shutdownMode();
    process.stdout.write("✔ 종료 완료\n");
  }

  protected abstract _initializeMode(
    config: SdConfig,
    targets: string[],
  ): Promise<void> | void;

  protected abstract _initializeEngines(config: SdConfig): Promise<void> | void;

  protected abstract _shutdownMode(): Promise<void>;
}
