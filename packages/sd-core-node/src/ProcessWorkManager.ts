import {ProcessManager} from "./ProcessManager";
import * as child_process from "child_process";

// TODO: UnitTest
export class ProcessWorkManager {
  private constructor(private readonly _workers: TSdWorker[]) {
  }

  public static async createAsync(binPath: string, count: number, notDone: boolean): Promise<ProcessWorkManager> {
    const promiseList: Promise<TSdWorker>[] = [];
    for (let i = 0; i < count; i++) {
      promiseList.push(
        new Promise<TSdWorker>((resolve, reject) => {
          const worker: TSdWorker = ProcessManager.fork(binPath, []) as TSdWorker;
          worker.processingCount = 1;

          worker.on("message", (message) => {
            if (message === "ready") {
              worker.processingCount--;
              resolve(worker);
            }
            if (!notDone && message === "done") {
              worker.processingCount--;
            }
          });

          worker.on("exit", (code) => {
            if (code !== 0) {
              reject(new Error("'worker'를 실행하는 중에 오류가 발생했습니다."));
            }
          });
        })
      );
    }

    return new ProcessWorkManager(await Promise.all(promiseList));
  }

  public async runAsync(...args: any[]): Promise<child_process.ChildProcess> {
    const minProcessingCount = this._workers.min(
      (item) => item.processingCount
    );
    const worker = this._workers.find(
      (item) => item.processingCount === minProcessingCount
    );

    if (!worker) {
      throw new Error("예상치 못한 에러가 발생하였습니다.");
    }

    worker.processingCount++;

    await new Promise<void>((resolve, reject) => {
      worker.send(args, (err: Error | null) => {
        if (err) {
          reject(err);
        }
      });

      worker.on("message", (message) => {
        if (message === "done") {
          resolve();
        }
      });
    });

    return worker;
  }

  public async closeAllAsync(): Promise<void> {
    await Promise.all(this._workers.map(async (worker) => {
      child_process.spawnSync("taskkill", ["/pid", worker.pid.toString(), "/f", "/t"]);
    }));
  }

  public static async runWorkAsync(fn: (message: any) => Promise<void>): Promise<void> {
    process.on("message", async (message: any) => {
      await fn(message);
      process.send!("done");
    });

    process.send!("ready");
  }

}

type TSdWorker = child_process.ChildProcess & { processingCount: number };
