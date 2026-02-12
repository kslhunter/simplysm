import path from "path";
import { Listr } from "listr2";
import { consola } from "consola";
import type { BuildTarget, SdConfig, SdPackageConfig } from "../sd-config.types";
import { loadSdConfig } from "../utils/sd-config";
import { filterPackagesByTargets } from "../utils/package-utils";
import { setupReplaceDeps } from "../utils/replace-deps";
import { printErrors } from "../utils/output-utils";
import { RebuildListrManager } from "../utils/listr-manager";
import { ResultCollector } from "../infra/ResultCollector";
import { SignalHandler } from "../infra/SignalHandler";
import { LibraryBuilder } from "../builders/LibraryBuilder";
import { DtsBuilder } from "../builders/DtsBuilder";
import type { PackageInfo } from "../builders/types";

/**
 * Watch 명령 옵션
 */
export interface WatchOrchestratorOptions {
  targets: string[];
  options: string[];
}

/**
 * Watch 모드 실행을 조율하는 Orchestrator
 *
 * Library 패키지(node/browser/neutral)의 watch 모드 실행을 관리한다.
 * - LibraryBuilder: esbuild watch
 * - DtsBuilder: .d.ts 생성
 */
export class WatchOrchestrator {
  private readonly _cwd: string;
  private readonly _options: WatchOrchestratorOptions;
  private readonly _logger = consola.withTag("sd:cli:watch");

  private _resultCollector!: ResultCollector;
  private _signalHandler!: SignalHandler;
  private _rebuildManager!: RebuildListrManager;
  private _libraryBuilder!: LibraryBuilder;
  private _dtsBuilder!: DtsBuilder;
  private _packages: PackageInfo[] = [];

  constructor(options: WatchOrchestratorOptions) {
    this._cwd = process.cwd();
    this._options = options;
  }

  /**
   * Orchestrator 초기화
   * - sd.config.ts 로드
   * - 패키지 분류
   * - Builder 생성 및 초기화
   */
  async initialize(): Promise<void> {
    this._logger.debug("watch 시작", { targets: this._options.targets });

    // sd.config.ts 로드
    let sdConfig: SdConfig;
    try {
      sdConfig = await loadSdConfig({
        cwd: this._cwd,
        dev: true,
        opt: this._options.options,
      });
      this._logger.debug("sd.config.ts 로드 완료");
    } catch (err) {
      consola.error(`sd.config.ts 로드 실패: ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
      throw err;
    }

    // replaceDeps 설정이 있으면 symlink 교체
    if (sdConfig.replaceDeps != null) {
      await setupReplaceDeps(this._cwd, sdConfig.replaceDeps);
    }

    // targets 필터링
    const allPackages = filterPackagesByTargets(sdConfig.packages, this._options.targets);

    // library 패키지만 필터링 (node, browser, neutral)
    const isLibraryTarget = (target: string): target is BuildTarget =>
      target === "node" || target === "browser" || target === "neutral";

    const libraryConfigs: Record<string, SdPackageConfig> = {};
    for (const [name, config] of Object.entries(allPackages)) {
      if (isLibraryTarget(config.target)) {
        libraryConfigs[name] = config;
      }
    }

    if (Object.keys(libraryConfigs).length === 0) {
      process.stdout.write("⚠ watch할 library 패키지가 없습니다.\n");
      return;
    }

    // PackageInfo 배열 생성
    this._packages = Object.entries(libraryConfigs).map(([name, config]) => ({
      name,
      dir: path.join(this._cwd, "packages", name),
      config,
    }));

    // 인프라 초기화
    this._resultCollector = new ResultCollector();
    this._signalHandler = new SignalHandler();
    this._rebuildManager = new RebuildListrManager(this._logger);

    // 배치 완료 시 에러 출력
    this._rebuildManager.on("batchComplete", () => {
      printErrors(this._resultCollector.toMap());
    });

    // Builder 생성
    const builderOptions = {
      cwd: this._cwd,
      packages: this._packages,
      resultCollector: this._resultCollector,
      rebuildManager: this._rebuildManager,
    };

    this._libraryBuilder = new LibraryBuilder(builderOptions);
    this._dtsBuilder = new DtsBuilder(builderOptions);

    // Builder 초기화
    await Promise.all([this._libraryBuilder.initialize(), this._dtsBuilder.initialize()]);
  }

  /**
   * Watch 모드 시작
   * - 초기 빌드 Listr 실행
   * - 결과 출력
   */
  async start(): Promise<void> {
    if (this._packages.length === 0) {
      return;
    }

    // 초기 빌드 Listr 구성
    const buildPromises = this._libraryBuilder.getInitialBuildPromises();
    const dtsPromises = this._dtsBuilder.getInitialBuildPromises();

    const initialListr = new Listr(
      [
        // Library 빌드 태스크
        ...this._packages.map((pkg) => ({
          title: `${pkg.name} (${pkg.config.target})`,
          task: () => buildPromises.get(`${pkg.name}:build`) ?? Promise.resolve(),
        })),
        // DTS 태스크
        ...this._packages.map((pkg) => ({
          title: `${pkg.name} (dts)`,
          task: () => dtsPromises.get(`${pkg.name}:dts`) ?? Promise.resolve(),
        })),
      ],
      { concurrent: true },
    );

    // Watch 시작 (백그라운드 실행)
    void this._libraryBuilder.startWatch();
    void this._dtsBuilder.startWatch();

    // Listr 실행 (초기 빌드 완료까지 대기)
    await initialListr.run();

    // 초기 빌드 결과 출력
    printErrors(this._resultCollector.toMap());
  }

  /**
   * 종료 시그널 대기
   */
  async awaitTermination(): Promise<void> {
    if (this._packages.length === 0) {
      return;
    }
    await this._signalHandler.waitForTermination();
  }

  /**
   * Orchestrator 종료
   */
  async shutdown(): Promise<void> {
    if (this._packages.length === 0) {
      return;
    }

    process.stdout.write("⏳ 종료 중...\n");

    await Promise.all([this._libraryBuilder.shutdown(), this._dtsBuilder.shutdown()]);

    process.stdout.write("✔ 완료\n");
  }
}
