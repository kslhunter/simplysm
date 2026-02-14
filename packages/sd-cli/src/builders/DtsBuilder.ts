import type * as DtsWorkerModule from "../workers/dts.worker";
import type { BuildResult } from "../infra/ResultCollector";
import type { TypecheckEnv } from "../utils/tsconfig";
import { BaseBuilder } from "./BaseBuilder";
import type { PackageInfo } from "./types";

/**
 * .d.ts 파일 생성을 담당하는 Builder
 *
 * Library 패키지의 TypeScript 선언 파일 생성을 처리한다.
 * Watch 모드와 프로덕션 빌드를 모두 지원한다.
 */
export class DtsBuilder extends BaseBuilder {
  private readonly _workerPath: string;

  constructor(options: ConstructorParameters<typeof BaseBuilder>[0]) {
    super(options);
    this._workerPath = import.meta.resolve("../workers/dts.worker");
  }

  protected getBuilderType(): string {
    return "dts";
  }

  /**
   * 패키지 타겟에서 TypecheckEnv 결정
   */
  private _getEnv(pkg: PackageInfo): TypecheckEnv {
    const target = pkg.config.target;
    if (target === "node") return "node";
    return "browser"; // browser, neutral, client 모두 browser 환경
  }

  protected createWorkers(): void {
    for (const pkg of this.packages) {
      this.workerManager.create<typeof DtsWorkerModule>(`${pkg.name}:dts`, this._workerPath);
    }
  }

  protected registerEventHandlers(): void {
    for (const pkg of this.packages) {
      const workerKey = `${pkg.name}:dts`;
      const listrTitle = `${pkg.name} (dts)`;
      this.registerEventHandlersForWorker(pkg, workerKey, "dts", listrTitle);
    }
  }

  protected async buildPackage(pkg: PackageInfo): Promise<void> {
    const worker = this.workerManager.get<typeof DtsWorkerModule>(`${pkg.name}:dts`)!;

    const buildPromise = new Promise<void>((resolve) => {
      const originalResolver = this.buildResolvers.get(`${pkg.name}:dts`);
      this.buildResolvers.set(`${pkg.name}:dts`, () => {
        originalResolver?.();
        resolve();
      });
    });

    void worker.startDtsWatch({
      name: pkg.name,
      cwd: this.cwd,
      pkgDir: pkg.dir,
      env: this._getEnv(pkg),
    });

    await buildPromise;
  }

  protected startWatchPackage(pkg: PackageInfo): void {
    const worker = this.workerManager.get<typeof DtsWorkerModule>(`${pkg.name}:dts`)!;

    worker
      .startDtsWatch({
        name: pkg.name,
        cwd: this.cwd,
        pkgDir: pkg.dir,
        env: this._getEnv(pkg),
      })
      .catch((err: unknown) => {
        const result: BuildResult = {
          name: pkg.name,
          target: pkg.config.target,
          type: "dts",
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        };
        this.resultCollector.add(result);
        this.completeBuild(pkg);
      });
  }
}
