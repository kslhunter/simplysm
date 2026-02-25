import path from "path";
import { consola } from "consola";
import type { BuildTarget, SdConfig, SdPackageConfig } from "../sd-config.types";
import { loadSdConfig } from "../utils/sd-config";
import { filterPackagesByTargets } from "../utils/package-utils";
import { watchReplaceDeps, type WatchReplaceDepResult } from "../utils/replace-deps";
import { printErrors } from "../utils/output-utils";
import { RebuildManager } from "../utils/rebuild-manager";
import { ResultCollector } from "../infra/ResultCollector";
import { SignalHandler } from "../infra/SignalHandler";
import { LibraryBuilder } from "../builders/LibraryBuilder";
import { DtsBuilder } from "../builders/DtsBuilder";
import type { PackageInfo } from "../builders/types";
import { watchCopySrcFiles } from "../utils/copy-src";
import type { FsWatcher } from "@simplysm/core-node";
import type { SdBuildPackageConfig } from "../sd-config.types";

/**
 * Watch command options
 */
export interface WatchOrchestratorOptions {
  targets: string[];
  options: string[];
}

/**
 * Orchestrator that coordinates watch mode execution
 *
 * Manages watch mode execution for Library packages (node/browser/neutral).
 * - LibraryBuilder: esbuild watch
 * - DtsBuilder: .d.ts generation
 */
export class WatchOrchestrator {
  private readonly _cwd: string;
  private readonly _options: WatchOrchestratorOptions;
  private readonly _logger = consola.withTag("sd:cli:watch");

  private _resultCollector!: ResultCollector;
  private _signalHandler!: SignalHandler;
  private _rebuildManager!: RebuildManager;
  private _libraryBuilder!: LibraryBuilder;
  private _dtsBuilder!: DtsBuilder;
  private _packages: PackageInfo[] = [];
  private _copySrcWatchers: FsWatcher[] = [];
  private _replaceDepWatcher: WatchReplaceDepResult | undefined;

  constructor(options: WatchOrchestratorOptions) {
    this._cwd = process.cwd();
    this._options = options;
  }

  /**
   * Initialize Orchestrator
   * - Load sd.config.ts
   * - Classify packages
   * - Create and initialize builders
   */
  async initialize(): Promise<void> {
    this._logger.debug("watch start", { targets: this._options.targets });

    // Load sd.config.ts
    let sdConfig: SdConfig;
    try {
      sdConfig = await loadSdConfig({
        cwd: this._cwd,
        dev: true,
        opt: this._options.options,
      });
      this._logger.debug("sd.config.ts loaded");
    } catch (err) {
      this._logger.error(`Failed to load sd.config.ts: ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
      throw err;
    }

    // Start watch if replaceDeps config exists (initial replacement handled in sd-cli.ts)
    if (sdConfig.replaceDeps != null) {
      this._replaceDepWatcher = await watchReplaceDeps(this._cwd, sdConfig.replaceDeps);
    }

    // Filter by targets
    const allPackages = filterPackagesByTargets(sdConfig.packages, this._options.targets);

    // Filter only library packages (node, browser, neutral)
    const isLibraryTarget = (target: string): target is BuildTarget =>
      target === "node" || target === "browser" || target === "neutral";

    const libraryConfigs: Record<string, SdPackageConfig> = {};
    for (const [name, config] of Object.entries(allPackages)) {
      if (isLibraryTarget(config.target)) {
        libraryConfigs[name] = config;
      }
    }

    if (Object.keys(libraryConfigs).length === 0) {
      process.stdout.write("⚠ No library packages to watch.\n");
      return;
    }

    // Create PackageInfo array
    this._packages = Object.entries(libraryConfigs).map(([name, config]) => ({
      name,
      dir: path.join(this._cwd, "packages", name),
      config,
    }));

    // 인프라 초기화
    this._resultCollector = new ResultCollector();
    this._signalHandler = new SignalHandler();
    this._rebuildManager = new RebuildManager(this._logger);

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
   * - 초기 빌드 실행
   * - 결과 출력
   */
  async start(): Promise<void> {
    if (this._packages.length === 0) {
      return;
    }

    // 초기 빌드 Promise 구성
    const buildPromises = this._libraryBuilder.getInitialBuildPromises();
    const dtsPromises = this._dtsBuilder.getInitialBuildPromises();

    // copySrc watch 시작
    for (const pkg of this._packages) {
      const buildConfig = pkg.config as SdBuildPackageConfig;
      if (buildConfig.copySrc != null && buildConfig.copySrc.length > 0) {
        const watcher = await watchCopySrcFiles(pkg.dir, buildConfig.copySrc);
        this._copySrcWatchers.push(watcher);
      }
    }

    // Watch 시작 (백그라운드 실행)
    void this._libraryBuilder.startWatch();
    void this._dtsBuilder.startWatch();

    // 초기 빌드 시작
    this._logger.start("초기 빌드 진행 중...");

    // Library 빌드 및 DTS 빌드 전체 Promise 배열 구성
    const allBuildTasks: Array<{ name: string; promise: Promise<void> }> = [];

    // Library 빌드 태스크
    for (const pkg of this._packages) {
      const promise = buildPromises.get(`${pkg.name}:build`) ?? Promise.resolve();
      allBuildTasks.push({
        name: `${pkg.name}:build`,
        promise,
      });
    }

    // DTS 태스크
    for (const pkg of this._packages) {
      const promise = dtsPromises.get(`${pkg.name}:dts`) ?? Promise.resolve();
      allBuildTasks.push({
        name: `${pkg.name}:dts`,
        promise,
      });
    }

    // 모든 빌드 작업 동시 실행 (초기 빌드 완료까지 대기)
    await Promise.allSettled(allBuildTasks.map((task) => task.promise));

    this._logger.success("초기 빌드 완료");

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

    await Promise.all([
      this._libraryBuilder.shutdown(),
      this._dtsBuilder.shutdown(),
      ...this._copySrcWatchers.map((w) => w.close()),
    ]);
    this._copySrcWatchers = [];
    this._replaceDepWatcher?.dispose();

    process.stdout.write("✔ 완료\n");
  }
}
