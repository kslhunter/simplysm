import {ProcessManager} from "./ProcessManager";
import * as child_process from "child_process";
import {CustomError} from "@simplysm/sd-core-common";

export class ProcessWorkManager {
  public readonly workers: TSdProcessWorker[] = [];

  public constructor(private readonly _binPath: string,
                     private readonly _args: any[]) {
  }

  public static async createAsync(binPath: string,
                                  args: any[],
                                  count: number,
                                  notDoneAfterRun: boolean): Promise<ProcessWorkManager> {
    const manager = new ProcessWorkManager(binPath, args);
    const promiseList: Promise<child_process.ChildProcess>[] = [];
    for (let i = 0; i < count; i++) {
      promiseList.push(manager.createWorkerAsync(notDoneAfterRun));
    }

    await Promise.all(promiseList);
    return manager;
  }

  public async createWorkerAsync(notDoneAfterRun: boolean): Promise<TSdProcessWorker> {
    const worker: TSdProcessWorker = ProcessManager.fork(this._binPath, this._args) as TSdProcessWorker;
    worker.processingCount = 1;

    await new Promise<void>((resolve, reject) => {
      worker.on("message", (message: { event: "ready" | "done" | "error"; body?: any }) => {
        if (message.event === "ready") {
          worker.processingCount--;
          this.workers.push(worker);
          resolve();
        }
        if (!notDoneAfterRun && message.event === "done") {
          worker.processingCount--;
        }
      });

      worker.on("exit", code => {
        if (code !== 0) {
          reject(new Error("'worker'를 실행하는 중에 오류가 발생했습니다."));
        }
      });
    });

    return worker;
  }

  public async runAsync(worker: child_process.ChildProcess, ...args: any[]): Promise<child_process.ChildProcess>;
  public async runAsync(...args: any[]): Promise<child_process.ChildProcess>;
  public async runAsync(...args: any[]): Promise<child_process.ChildProcess> {
    return await new Promise<child_process.ChildProcess>((resolve, reject) => {
      let worker: TSdProcessWorker | undefined;
      if (args[0] && args[0]["on"]) {
        worker = args[0];
        args.shift();
      }
      else {
        const minProcessingCount = this.workers.min(item => item.processingCount);
        worker = this.workers.find(item => item.processingCount === minProcessingCount);
      }

      if (!worker) {
        throw new Error("예상치 못한 에러가 발생하였습니다.");
      }

      worker.processingCount++;

      worker.send(args, (err: Error | null) => {
        if (err) {
          reject(err);
        }
      });

      worker.on("message", (message: { event: "ready" | "done" | "error"; body?: any }) => {
        if (message.event === "done") {
          resolve(worker);
        }
        if (message.event === "error") {
          reject(new CustomError(message.body, `프로세스 수행중 에러 [${this._binPath} ${args.join(" ")}]`));
        }
      });
    });
  }

  public async closeAllAsync(): Promise<void> {
    await Promise.all(this.workers.map(async worker => {
      child_process.spawnSync("taskkill", ["/pid", worker.pid.toString(), "/f", "/t"]);
    }));
  }

  public static async defineWorkAsync(fn: (args: any[]) => Promise<void>): Promise<void> {
    process.on("message", async (args: any[]) => {
      try {
        await fn(args);
        process.send!({event: "done"});
      }
      catch (err) {
        process.send!({event: "error", body: {name: err.name, message: err.message, stack: err.stack}});
      }
    });

    process.send!({event: "ready"});
  }
}

export type TSdProcessWorker = child_process.ChildProcess & { processingCount: number };
