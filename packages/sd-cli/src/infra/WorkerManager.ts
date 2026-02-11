import { Worker, type WorkerProxy, type WorkerModule } from "@simplysm/core-node";

/**
 * Worker 생명주기를 관리하는 클래스
 *
 * Worker 생성, 조회, 종료를 중앙에서 관리하여
 * 리소스 누수를 방지하고 일관된 Worker 관리를 제공한다.
 */
export class WorkerManager {
  private readonly _workers = new Map<string, WorkerProxy<WorkerModule>>();

  /**
   * 새 Worker 생성
   * @param id Worker 식별자 (예: "core-common:build")
   * @param workerPath Worker 파일 경로
   * @returns 생성된 WorkerProxy
   */
  create<TModule extends WorkerModule>(id: string, workerPath: string): WorkerProxy<TModule> {
    const worker = Worker.create<TModule>(workerPath);
    this._workers.set(id, worker as WorkerProxy<WorkerModule>);
    return worker;
  }

  /**
   * ID로 Worker 조회
   * @param id Worker 식별자
   */
  get<TModule extends WorkerModule>(id: string): WorkerProxy<TModule> | undefined {
    return this._workers.get(id) as WorkerProxy<TModule> | undefined;
  }

  /**
   * 특정 Worker 종료 및 제거
   * @param id Worker 식별자
   */
  async terminate(id: string): Promise<void> {
    const worker = this._workers.get(id);
    if (worker != null) {
      await worker.terminate();
      this._workers.delete(id);
    }
  }

  /**
   * 모든 Worker 종료
   */
  async terminateAll(): Promise<void> {
    await Promise.all([...this._workers.values()].map((w) => w.terminate()));
    this._workers.clear();
  }

  /**
   * 관리 중인 Worker 수
   */
  get size(): number {
    return this._workers.size;
  }

  /**
   * 모든 Worker ID 목록
   */
  get ids(): string[] {
    return [...this._workers.keys()];
  }
}
