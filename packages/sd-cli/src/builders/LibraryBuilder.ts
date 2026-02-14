import type * as LibraryWorkerModule from "../workers/library.worker";
import type { BuildResult } from "../infra/ResultCollector";
import type { SdBuildPackageConfig } from "../sd-config.types";
import { BaseBuilder } from "./BaseBuilder";
import type { PackageInfo } from "./types";

/**
 * Library 패키지 빌드를 담당하는 Builder
 *
 * node/browser/neutral 타겟 패키지의 esbuild 빌드를 처리한다.
 * Watch 모드와 프로덕션 빌드를 모두 지원한다.
 */
export class LibraryBuilder extends BaseBuilder {
  private readonly _workerPath: string;

  constructor(options: ConstructorParameters<typeof BaseBuilder>[0]) {
    super(options);
    this._workerPath = import.meta.resolve("../workers/library.worker");
  }

  protected getBuilderType(): string {
    return "build";
  }

  protected createWorkers(): void {
    for (const pkg of this.packages) {
      this.workerManager.create<typeof LibraryWorkerModule>(`${pkg.name}:build`, this._workerPath);
    }
  }

  protected registerEventHandlers(): void {
    for (const pkg of this.packages) {
      const workerKey = `${pkg.name}:build`;
      const listrTitle = `${pkg.name} (${pkg.config.target})`;
      this.registerEventHandlersForWorker(pkg, workerKey, "build", listrTitle);
    }
  }

  protected async buildPackage(pkg: PackageInfo): Promise<void> {
    const worker = this.workerManager.get<typeof LibraryWorkerModule>(`${pkg.name}:build`)!;

    // 빌드 완료 Promise 생성
    const buildPromise = new Promise<void>((resolve) => {
      const originalResolver = this.buildResolvers.get(`${pkg.name}:build`);
      this.buildResolvers.set(`${pkg.name}:build`, () => {
        originalResolver?.();
        resolve();
      });
    });

    // 빌드 시작 (await 없이 - 이벤트로 완료 감지)
    // LibraryBuilder는 library 패키지(node/browser/neutral)만 받으므로 캐스팅 안전
    void worker.startWatch({
      name: pkg.name,
      config: pkg.config as SdBuildPackageConfig,
      cwd: this.cwd,
      pkgDir: pkg.dir,
    });

    await buildPromise;
  }

  protected startWatchPackage(pkg: PackageInfo): void {
    const worker = this.workerManager.get<typeof LibraryWorkerModule>(`${pkg.name}:build`)!;

    // LibraryBuilder는 library 패키지(node/browser/neutral)만 받으므로 캐스팅 안전
    worker
      .startWatch({
        name: pkg.name,
        config: pkg.config as SdBuildPackageConfig,
        cwd: this.cwd,
        pkgDir: pkg.dir,
      })
      .catch((err: unknown) => {
        const result: BuildResult = {
          name: pkg.name,
          target: pkg.config.target,
          type: "build",
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        };
        this.resultCollector.add(result);
        this.completeBuild(pkg);
      });
  }

  /**
   * Graceful shutdown (esbuild context dispose)
   */
  override async shutdown(): Promise<void> {
    const shutdownTimeout = 3000;

    // 각 Worker의 stopWatch 메서드 호출 후 terminate
    await Promise.all(
      this.workerManager.ids.map(async (id) => {
        const worker = this.workerManager.get<typeof LibraryWorkerModule>(id);
        if (worker != null) {
          try {
            await Promise.race([
              worker.stopWatch(),
              new Promise<void>((resolve) => setTimeout(resolve, shutdownTimeout)),
            ]);
          } catch {
            // stopWatch 실패해도 계속 진행
          }
        }
      }),
    );

    await super.shutdown();
  }
}
