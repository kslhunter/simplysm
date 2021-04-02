import { SdProcessWorker } from "./SdProcessWorker";
import { Logger } from "../utils/Logger";
import { NeverEntryError, Wait } from "@simplysm/sd-core-common";

export class SdProcessWorkManager {
  private readonly _logger = Logger.get(["simplysm", "sd-core-node", "ProcessWorkManager"]);

  public readonly workers: SdProcessWorker[] = [];
  private _workerCount = 0;

  public constructor(private readonly _binPath: string,
                     private readonly _args: any[],
                     private readonly _isPrepared: boolean,
                     private readonly _max: number | undefined) {
  }

  public static async createAsync(binPath: string,
                                  args: any[],
                                  count?: number,
                                  max?: number): Promise<SdProcessWorkManager> {
    const isPrepared = count !== undefined && count > 0;

    const manager = new SdProcessWorkManager(binPath, args, isPrepared, max);

    if (isPrepared) {
      const promiseList: Promise<SdProcessWorker>[] = [];
      for (let i = 0; i < count!; i++) {
        promiseList.push(manager._createWorkerAsync());
      }

      await Promise.all(promiseList);
    }

    return manager;
  }

  private async _createWorkerAsync(): Promise<SdProcessWorker> {
    this._workerCount++;
    const worker = await SdProcessWorker.createAsync(this._binPath, [this._args]);
    this.workers.push(worker);
    this._logger.debug(`WORKER 생성 완료 (현재 WORKER 수: ${this._workerCount})`);
    return worker;
  }

  public async getNextWorkerAsync(): Promise<SdProcessWorker> {
    if (
      this._isPrepared
      || (this._max !== undefined && this._workerCount >= this._max)
    ) {
      await Wait.true(() => this._workerCount <= this.workers.length);
      const minProcessingCount = this.workers.min((item) => item.processingCount);
      const worker = this.workers.find((item) => item.processingCount === minProcessingCount);
      if (!worker) throw new NeverEntryError();

      return worker;
    }
    else {
      return await this._createWorkerAsync();
    }
  }

  public async closeAllAsync(): Promise<void> {
    await this.workers.parallelAsync(async (worker) => {
      await worker.closeAsync();
    });
  }
}
