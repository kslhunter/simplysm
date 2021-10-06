import { SdProcessManager } from "./SdProcessManager";
import * as cp from "child_process";
import { EventEmitter } from "events";
import { Uuid } from "@simplysm/sd-core-common";
import { SdProcessWorkSender } from "./SdProcessWorkSender";

export class SdProcessWorker extends EventEmitter {
  private _lastSendId = 0;
  public processingCount = 0;

  private static readonly _workers: SdProcessWorker[] = [];

  public static async createAsync(binPath: string, args: any[], execArgv?: string[]): Promise<SdProcessWorker> {
    return await new Promise<SdProcessWorker>((resolve, reject) => {
      const logFileExecArg = process.execArgv.single((item) => item.startsWith("--logfile"));
      if (logFileExecArg !== undefined) {
        const index = process.execArgv.indexOf(logFileExecArg);
        process.execArgv.insert(index, logFileExecArg.replace(/\.log$/, "") + "-" + Uuid.new() + ".log");
        process.execArgv.remove(logFileExecArg);
      }

      const worker = SdProcessManager.fork(
        binPath,
        args.map((item: any) => (typeof item === "string" ? item : JSON.stringify(item))),
        {
          execArgv: [
            ...process.execArgv,
            ...execArgv ? execArgv : []/*,
            "--max-old-space-size=8192"*/
          ]
        }
      );

      const onMessageFn = (message: { event: string; body?: any }): void => {
        if (message.event === "ready") {
          worker.off("message", onMessageFn);
          worker.off("exit", onExitFn);

          const sdWorker = new SdProcessWorker(worker);
          this._workers.push(sdWorker);
          resolve(sdWorker);
        }
      };

      const onExitFn = (code: number | null): void => {
        if (code !== 0 && code != null) {
          worker.off("message", onMessageFn);
          worker.off("exit", onExitFn);

          reject(new Error(`'worker'를 실행하는 중에 오류가 발생했습니다: ${code} [${binPath} ${JSON.stringify(args)}]`));
        }
      };

      worker.on("message", onMessageFn);
      worker.on("exit", onExitFn);
    });
  }

  public static async closeAllAsync(): Promise<void> {
    for (const sdWorker of SdProcessWorker._workers) {
      await sdWorker.closeAsync();
    }
  }

  private _closed = false;

  private constructor(private readonly _worker: cp.ChildProcess) {
    super();

    this._worker.on("exit", (code) => {
      if (code != null && code !== 0 && !this._closed) {
        this.emit("error", new Error(`프로세스 워커를 실행하는 중에 오류가 발생했습니다. [${code}]`));
      }
      this._closed = true;
    });
  }

  public createWorkSender(): SdProcessWorkSender {
    if (this._closed) throw new Error("이미 닫힌 프로세스 워커입니다.");

    this.processingCount += 1;
    this._lastSendId += 1;

    return new SdProcessWorkSender(this._worker, this._lastSendId)
      .on("done", () => {
        this.processingCount -= 1;
      });
  }

  public async closeAsync(): Promise<void> {
    if (this._closed) return;

    this._closed = true;
    await SdProcessManager.spawnAsync(`taskkill /pid ${this._worker.pid!.toString()} /f /t`, undefined, () => {
    });
  }
}
