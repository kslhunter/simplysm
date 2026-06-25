import { type ChildProcess } from "child_process";
import { cpx, FsWatcher, pathx } from "@simplysm/core-node";
import type {
  SdBuildPackageConfig,
  SdConfig,
  SdScriptsPackageConfig,
} from "../sd-config.types";
import { filterPackagesByTargets, classifyWatchPackages } from "../utils/package-classify";
import { printDiagnostics } from "../utils/output-utils";
import { createBuildEngine } from "../engines/engine-factory";
import type { BuildEngine, BuildPackageInfo } from "../engines/types";
import { watchCopySrcFiles } from "../utils/copy-src";
import { BaseOrchestrator } from "./BaseOrchestrator";
import type { OrchestratorLifecycle } from "./types";

/**
 * WatchOrchestrator 옵션
 */
export interface WatchOrchestratorOptions {
  targets: string[];
  options: string[];
}

/**
 * watch 모드 전용 Orchestrator
 *
 * 라이브러리(JS+DTS) + Scripts(watch hook) + copySrc + replaceDeps 감시
 */
export class WatchOrchestrator extends BaseOrchestrator implements OrchestratorLifecycle {
  private readonly _options: WatchOrchestratorOptions;

  // watch 전용 상태
  private readonly _libraryEngines: BuildEngine[] = [];
  private _libraryPackages: BuildPackageInfo[] = [];
  private _watchHookPackages: Array<{ name: string; dir: string; config: SdScriptsPackageConfig | SdBuildPackageConfig }> = [];
  private _copySrcWatchers: FsWatcher[] = [];
  private _distDeleteWatchers: FsWatcher[] = [];
  private readonly _watchHookWatchers: FsWatcher[] = [];
  private readonly _watchHookChildren = new Map<string, ChildProcess>();

  constructor(options: WatchOrchestratorOptions) {
    super("sd:cli:watch");
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

    // watch 모드 패키지 분류
    const classified = classifyWatchPackages(allPackages, this._cwd, this._pathMap);
    this._libraryPackages = classified.libraryPackages;
    this._watchHookPackages = classified.watchHookPackages;

    // 처리할 패키지가 있는지 확인
    const totalPackages = this._libraryPackages.length + this._watchHookPackages.length;
    if (totalPackages === 0) {
      this._logger.warn("워치 대상 패키지가 없습니다.");
      return;
    }

    this._hasPackages = true;
  }

  protected _initializeEngines(_config: SdConfig): void {
    // 배치 완료 핸들러 등록
    this._rebuildManager.on("batchComplete", (_completedKeys) => {
      printDiagnostics(this._resultCollector.toMap());
    });

    // 라이브러리 패키지용 BuildEngine 생성
    for (const pkg of this._libraryPackages) {
      const engine = createBuildEngine(pkg, {
        cwd: this._cwd,
        replaceDeps: this._replaceDeps,
        resultCollector: this._resultCollector,
        rebuildManager: this._rebuildManager,
      });
      this._libraryEngines.push(engine);
    }
  }

  async start(): Promise<void> {
    if (!this._hasPackages) {
      this._logger.debug("대상 패키지 없음, start 건너뜀");
      return;
    }
    this._logger.debug("watch 모드 시작");

    // 라이브러리 패키지 dist 삭제 감지 워처
    for (const pkg of this._libraryPackages) {
      const distDir = pathx.posixResolve(pkg.dir, "dist");
      const watcher = await FsWatcher.watch([distDir]);
      watcher.onChange({ delay: 100 }, (changes) => {
        for (const c of changes) {
          if (c.event === "unlink" || c.event === "unlinkDir") {
            this._logger.error(`[dist-delete:${pkg.name}] ${c.event}: ${c.path}\n${new Error().stack}`);
          }
        }
      });
      this._distDeleteWatchers.push(watcher);
    }

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
      await engine.startWatch({ js: true, dts: true, lint: false, includeTests: false });
      completed++;
      this._logger.info(`  [${completed}/${total}] ${pkgName} 완료`);
    });

    await Promise.allSettled(watchPromises);
    this._logger.success("초기 빌드 실행 완료");

    // Print initial build results
    printDiagnostics(this._resultCollector.toMap());

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

  protected async _shutdownMode(): Promise<void> {
    const shutdownTasks: Array<Promise<void>> = [];

    // 모든 엔진 중지
    shutdownTasks.push(...this._libraryEngines.map((e) => e.stop()));

    // 워처 종료
    shutdownTasks.push(...this._copySrcWatchers.map((w) => w.close()));
    shutdownTasks.push(...this._distDeleteWatchers.map((w) => w.close()));
    shutdownTasks.push(...this._watchHookWatchers.map((w) => w.close()));

    // hook 자식 프로세스 종료
    for (const child of this._watchHookChildren.values()) {
      if (child.exitCode == null) {
        child.kill();
      }
    }
    this._watchHookChildren.clear();

    await Promise.all(shutdownTasks);
    this._copySrcWatchers = [];
    this._distDeleteWatchers = [];
    this._watchHookWatchers.length = 0;
  }

  private _runWatchHookCmd(pkgName: string, cwd: string, cmd: string, args?: string[]): void {
    // Kill previous hook process if still running
    const prev = this._watchHookChildren.get(pkgName);
    if (prev != null && prev.exitCode == null) {
      prev.kill();
    }

    const proc = cpx.spawn(cmd, args ?? [], { cwd, stdio: "inherit", shell: true, reject: false });
    const child = proc.process;
    this._watchHookChildren.set(pkgName, child);
    // cpx.spawn 은 실패 시 reject 하는 Promise 도 만든다. 여기선 child 이벤트로 직접 처리하므로
    // unhandled rejection 방지를 위해 Promise 는 무시한다.
    void proc.catch(() => {});

    child.on("error", (err) => {
      this._logger.error(`[${pkgName}] 워치 훅 에러: ${err.message}`);
    });
    child.on("close", (code) => {
      if (code !== 0 && code != null) {
        this._logger.warn(`[${pkgName}] 워치 훅이 코드 ${String(code)}로 종료됨`);
      }
    });
  }
}
