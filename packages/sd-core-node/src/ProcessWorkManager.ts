import { SdProcessWorker } from "./SdProcessWorker";
import { Logger } from "./Logger";

export class ProcessWorkManager {
  private readonly _logger = Logger.get(["simplysm", "sd-core-node", "ProcessWorkManager"]);

  public readonly workers: SdProcessWorker[] = [];

  public constructor(private readonly _binPath: string,
                     private readonly _args: any[],
                     private readonly _isPrepared: boolean) {
  }

  public static async createAsync(binPath: string,
                                  args: any[],
                                  count?: number): Promise<ProcessWorkManager> {
    const isPrepared = count !== undefined && count > 0;

    const manager = new ProcessWorkManager(binPath, args, isPrepared);

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
    const worker = await SdProcessWorker.createAsync(this._binPath, [this._args]);
    this.workers.push(worker);
    this._logger.debug(`WORKER 생성 완료 (총수량: ${this.workers.length})`);
    return worker;
  }

  public async getNextWorkerAsync(): Promise<SdProcessWorker> {
    if (this._isPrepared) {
      const minProcessingCount = this.workers.min(item => item.processingCount);
      const worker = this.workers.find(item => item.processingCount === minProcessingCount);
      if (!worker) {
        throw new Error("예상치 못한 에러가 발생하였습니다.");
      }

      return worker;
    }
    else {
      return await this._createWorkerAsync();
    }
  }

  public async closeAllAsync(): Promise<void> {
    await this.workers.parallelAsync(async worker => {
      await worker.closeAsync();
    });
  }
}
