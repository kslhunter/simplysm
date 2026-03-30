import { EventEmitter } from "node:events";
import { consola } from "consola";

interface RebuildManagerEvents {
  batchComplete: [];
}

export class RebuildManager extends EventEmitter<RebuildManagerEvents> {
  private _isRunning = false;
  private readonly _pendingBuilds = new Map<
    string,
    { title: string; promise: Promise<void>; resolver: () => void }
  >();
  private readonly _logger: ReturnType<typeof consola.withTag>;

  constructor(logger: ReturnType<typeof consola.withTag>) {
    super();
    this._logger = logger;
  }

  registerBuild(key: string, title: string): () => void {
    let resolver!: () => void;
    const promise = new Promise<void>((resolve) => {
      resolver = resolve;
    });

    this._pendingBuilds.set(key, { title, promise, resolver });

    if (!this._isRunning) {
      void Promise.resolve().then(() => void this._runBatch());
    }

    return resolver;
  }

  private async _runBatch(): Promise<void> {
    if (this._isRunning || this._pendingBuilds.size === 0) {
      return;
    }

    this._isRunning = true;

    const batchBuilds = new Map(this._pendingBuilds);
    this._pendingBuilds.clear();

    const tasks = Array.from(batchBuilds.entries());
    const titles = tasks.map(([, { title }]) => title).join(", ");
    this._logger.start(`리빌드 실행 중... (${titles})`);

    const results = await Promise.allSettled(tasks.map(([, { promise }]) => promise));

    // Defensive: registerBuild의 Promise는 현재 reject되지 않지만,
    // 향후 변경에 대비한 안전장치
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    if (failed.length > 0) {
      for (const result of failed) {
        this._logger.error("리빌드 에러 발생", { error: String(result.reason) });
      }
    }

    this._logger.success(`리빌드 실행 완료 (${titles})`);

    this.emit("batchComplete");

    this._isRunning = false;

    if (this._pendingBuilds.size > 0) {
      void this._runBatch();
    }
  }
}
