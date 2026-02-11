import { EventEmitter } from "node:events";
import { Listr } from "listr2";
import type { consola } from "consola";

/**
 * RebuildListrManager 이벤트 타입
 */
interface RebuildListrManagerEvents {
  batchComplete: [];
}

/**
 * 리빌드 시 Listr 실행을 관리하는 클래스
 *
 * 여러 Worker가 동시에 buildStart를 발생시킬 때, 한 번에 하나의 Listr만 실행되도록 보장합니다.
 * 실행 중에 들어온 빌드 요청은 pending에 모아두었다가 현재 배치가 완료되면 다음 배치로 실행합니다.
 *
 * EventEmitter를 확장하여 배치 완료 시 `batchComplete` 이벤트를 발생시킵니다.
 */
export class RebuildListrManager extends EventEmitter<RebuildListrManagerEvents> {
  private _isRunning = false;
  private readonly _pendingBuilds = new Map<string, { title: string; promise: Promise<void>; resolver: () => void }>();

  constructor(private readonly _logger: ReturnType<typeof consola.withTag>) {
    super();
  }

  /**
   * 빌드를 등록하고 resolver 함수를 반환합니다.
   *
   * @param key - 빌드를 식별하는 고유 키 (예: "core-common:build")
   * @param title - Listr에 표시할 제목 (예: "core-common (node)")
   * @returns 워커가 빌드 완료 시 호출할 resolver 함수
   */
  registerBuild(key: string, title: string): () => void {
    let resolver!: () => void;
    const promise = new Promise<void>((resolve) => {
      resolver = resolve;
    });

    this._pendingBuilds.set(key, { title, promise, resolver });

    // Listr가 실행 중이 아니면 다음 tick에 배치 실행
    if (!this._isRunning) {
      void Promise.resolve().then(() => void this._runBatch());
    }

    return resolver;
  }

  /**
   * pending에 있는 빌드들을 모아서 하나의 Listr로 실행합니다.
   * 실행 중에 들어온 새 빌드는 다음 배치로 넘어갑니다.
   */
  private async _runBatch(): Promise<void> {
    if (this._isRunning || this._pendingBuilds.size === 0) {
      return;
    }

    this._isRunning = true;

    // 현재 pending을 스냅샷으로 가져옴
    const batchBuilds = new Map(this._pendingBuilds);
    this._pendingBuilds.clear();

    // Listr 태스크 생성
    const tasks = Array.from(batchBuilds.entries()).map(([, { title, promise }]) => ({
      title,
      task: () => promise,
    }));

    const listr = new Listr(tasks, { concurrent: true });

    try {
      await listr.run();
      // 배치 완료 이벤트 발생
      this.emit("batchComplete");
    } catch (err) {
      this._logger.error("listr 실행 중 오류 발생", { error: String(err) });
    }

    this._isRunning = false;

    // 실행 중 새로 들어온 pending이 있으면 다음 배치 실행
    if (this._pendingBuilds.size > 0) {
      void this._runBatch();
    }
  }
}
