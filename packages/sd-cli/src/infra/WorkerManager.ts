import { Worker, type WorkerProxy, type WorkerModule } from "@simplysm/core-node";

/**
 * Class that manages Worker lifecycle
 *
 * Centrally manages Worker creation, lookup, and termination
 * to prevent resource leaks and provide consistent Worker management.
 */
export class WorkerManager {
  private readonly _workers = new Map<string, WorkerProxy<WorkerModule>>();

  /**
   * Create a new Worker
   * @param id Worker identifier (e.g., "core-common:build")
   * @param workerPath Worker file path
   * @returns Created WorkerProxy
   */
  create<TModule extends WorkerModule>(id: string, workerPath: string): WorkerProxy<TModule> {
    const worker = Worker.create<TModule>(workerPath);
    this._workers.set(id, worker as WorkerProxy<WorkerModule>);
    return worker;
  }

  /**
   * Lookup Worker by ID
   * @param id Worker identifier
   */
  get<TModule extends WorkerModule>(id: string): WorkerProxy<TModule> | undefined {
    return this._workers.get(id) as WorkerProxy<TModule> | undefined;
  }

  /**
   * Terminate and remove a specific Worker
   * @param id Worker identifier
   */
  async terminate(id: string): Promise<void> {
    const worker = this._workers.get(id);
    if (worker != null) {
      await worker.terminate();
      this._workers.delete(id);
    }
  }

  /**
   * Terminate all Workers
   */
  async terminateAll(): Promise<void> {
    await Promise.all([...this._workers.values()].map((w) => w.terminate()));
    this._workers.clear();
  }

  /**
   * Number of managed Workers
   */
  get size(): number {
    return this._workers.size;
  }

  /**
   * List of all Worker IDs
   */
  get ids(): string[] {
    return [...this._workers.keys()];
  }
}
