import { SdProcessWorker } from "./SdProcessWorker";
import { Logger } from "../utils/Logger";

export class SdProcessWorkManager {
  // private readonly _logger = Logger.get(["simplysm", "sd-core-node", this.constructor.name]);

  public readonly workers: SdProcessWorker[] = [];
  public readonly prepareWorkers: SdProcessWorker[] = [];
  private _workerCount = 0;

  public constructor(private readonly _binPath: string,
                     private readonly _args: any[],
                     private readonly _max: number | undefined,
                     private readonly _logger: Logger) {
  }

  public static async createAsync(binPath: string,
                                  args: any[],
                                  logger: Logger,
                                  prepareCount?: number,
                                  max?: number): Promise<SdProcessWorkManager> {
    const manager = new SdProcessWorkManager(binPath, args, max, logger);

    if (prepareCount !== undefined && prepareCount > 0) {
      const promiseList: Promise<SdProcessWorker>[] = [];
      for (let i = 0; i < prepareCount; i++) {
        promiseList.push(manager._createWorkerAsync(true));
      }

      await Promise.all(promiseList);
    }

    return manager;
  }

  private async _createWorkerAsync(preset: boolean): Promise<SdProcessWorker> {
    this._workerCount++;
    const worker = await SdProcessWorker.createAsync(this._binPath, [this._args]);
    if (preset) {
      this.prepareWorkers.push(worker);
    }
    else {
      this.workers.push(worker);
    }
    this._logger.debug(`WORKER 생성 완료 (현재 WORKER 수: ${this._workerCount})`);
    return worker;
  }

  public async getNextWorkerAsync(): Promise<SdProcessWorker> {
    // 미리 준비된 WORKER가 있으면, 해당 WORKER 반환
    if (this.prepareWorkers.length > 0) {
      const worker = this.prepareWorkers.shift()!;
      this.workers.push(worker);
      return worker;
    }
    // MAX까지 다 만들었으면, 제일 하는일이 적은 WORKER 반환
    else if (this._max !== undefined && this._workerCount >= this._max) {
      const minProcessingCount = this.workers.min((item) => item.processingCount);
      return this.workers.find((item) => item.processingCount === minProcessingCount)!;
    }
    else {
      return await this._createWorkerAsync(false);
    }
  }

  public async closeAllAsync(): Promise<void> {
    await this.workers.parallelAsync(async (worker) => {
      await worker.closeAsync();
    });
  }
}
