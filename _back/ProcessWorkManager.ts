import {SdProcessWorker} from "./SdProcessWorker";

export class ProcessWorkManager {
  /*public static async createAsync(binPath: string,
                                  args: any[],
                                  count: number): Promise<ProcessWorkManager> {
    const manager = new ProcessWorkManager(binPath, args, count);
    const promiseList: Promise<SdProcessWorker>[] = [];
    for (let i = 0; i < count; i++) {
      promiseList.push(manager.createWorkerAsync());
    }

    await Promise.all(promiseList);
    return manager;
  }*/

  public readonly workers: SdProcessWorker[] = [];

  public constructor(private readonly _binPath: string,
                     private readonly _args: any[],
                     private readonly _count: number) {
  }

  public async createWorkerAsync(): Promise<SdProcessWorker> {
    const worker = await SdProcessWorker.createAsync(this._binPath, ...this._args);
    this.workers.push(worker);
    return worker;
  }

  public async getNextWorkerAsync(): Promise<SdProcessWorker> {
    let worker;

    if (this.workers.length < this._count) {
      worker = await this.createWorkerAsync();
    }
    else {
      const minProcessingCount = this.workers.min(item => item.processingCount);
      worker = this.workers.find(item => item.processingCount === minProcessingCount);
    }

    if (!worker) {
      throw new Error("예상치 못한 에러가 발생하였습니다.");
    }

    return worker;
  }

  public async closeAllAsync(): Promise<void> {
    await this.workers.parallelAsync(async worker => {
      await worker.closeAsync();
    });
  }
}
