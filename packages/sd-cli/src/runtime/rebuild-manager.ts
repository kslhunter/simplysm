import { EventEmitter } from "node:events";
import { consola } from "consola";

interface RebuildManagerEvents {
  batchComplete: [completedKeys: string[]];
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

  private _batchTimer: ReturnType<typeof setTimeout> | undefined;

  registerBuild(key: string, title: string): () => void {
    this._logger.debug(`빌드 등록: ${key} (${title})`);
    let resolver!: () => void;
    const promise = new Promise<void>((resolve) => {
      resolver = resolve;
    });

    this._pendingBuilds.set(key, { title, promise, resolver });

    if (!this._isRunning) {
      // 워커 스레드들의 buildStart가 도착할 시간을 확보하기 위해 짧은 대기
      if (this._batchTimer != null) clearTimeout(this._batchTimer);
      this._batchTimer = setTimeout(() => {
        this._batchTimer = undefined;
        void this._runBatch();
      }, 100);
    }

    return resolver;
  }

  private async _runBatch(): Promise<void> {
    if (this._isRunning || this._pendingBuilds.size === 0) {
      this._logger.debug(`배치 건너뜀 (running: ${String(this._isRunning)}, pending: ${this._pendingBuilds.size})`);
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
        this._logger.error(`리빌드 에러 발생: ${String(result.reason)}`);
      }
    }

    this._logger.success(`리빌드 실행 완료 (${titles})`);

    this.emit("batchComplete", Array.from(batchBuilds.keys()));

    this._isRunning = false;

    if (this._pendingBuilds.size > 0) {
      void this._runBatch();
    }
  }
}
