import {ProcessManager} from "./ProcessManager";
import * as cp from "child_process";
import {EventEmitter} from "events";
import {NeverEntryError, SdError} from "@simplysm/sd-core-common";

export class SdProcessWorker extends EventEmitter {
  private _lastSend = 0;
  public processingCount = 0;

  public static async createAsync(binPath: string, ...args: any[]): Promise<SdProcessWorker> {
    return await new Promise<SdProcessWorker>((resolve, reject) => {
      const worker = ProcessManager.fork(
        binPath,
        args.map((item: any) => (typeof item === "string" ? item : JSON.stringify(item))),
        {
          execArgv: [
            "--max-old-space-size=8192",
            ...process.execArgv
          ]
        }
      );
      worker.on("message", (message: { event: string; body?: any }) => {
        if (message.event === "ready") {
          resolve(new SdProcessWorker(worker));
        }
      });

      worker.on("exit", code => {
        if (code !== 0) {
          reject(new Error(`'worker'를 실행하는 중에 오류가 발생했습니다.(${code}) [${binPath} ${JSON.stringify(args)}]`));
        }
      });
    });
  }

  private _closed = false;

  private constructor(private readonly _worker: cp.ChildProcess) {
    super();

    this._worker.on("exit", code => {
      if (code != null && code !== 0 && !this._closed) {
        this.emit("error", new Error(`프로세스 워커를 실행하는 중에 오류가 발생했습니다. [${code}]`));
      }
      this._closed = true;
    });
  }

  public async sendAsync(...args: any[]): Promise<any> {
    if (this._closed) throw new Error("이미 닫힌 프로세스 워커입니다.");

    this.processingCount += 1;
    this._lastSend += 1;

    return await new Promise<any>((resolve, reject) => {
      const currSendId = this._lastSend;

      this._worker
        .on("message", (message: { event: string; sendId: number; body?: any }) => {
          if (message.event === "done" && message.sendId === currSendId) {
            this.processingCount -= 1;
            resolve(message.body);
          }
          else if (message.event === "error" && message.sendId === currSendId) {
            this.emit("error", new SdError(message.body, `프로세스 수행중 에러 [${JSON.stringify(args)}]`));
          }
          else if (!["done", "error", "ready"].includes(message.event) && message.sendId === currSendId) {
            this.emit(message.event, message.body);
          }
        })
        .send([currSendId, ...args], (err: Error | null) => {
          if (err) reject(err);
        });
    });
  }

  public async closeAsync(): Promise<void> {
    if (this._closed) throw new Error("이미 닫힌 프로세스 워커입니다.");

    this._closed = true;
    await ProcessManager.spawnAsync(`taskkill /pid ${this._worker.pid.toString()} /f /t`, undefined, () => {
    });
  }

  public static defineWorker(fn: (worker: SdProcessChildWorker, args: any[]) => Promise<any> | any): void {
    process.on("message", async (args: any[]) => {
      const childWorker = new SdProcessChildWorker(args[0]);

      try {
        const result = await fn(childWorker, args.slice(1).map(item => (item == null ? undefined : item)));
        childWorker.send("done", result);
      }
      catch (err) {
        childWorker.send("error", {name: err.name, message: err.message, stack: err.stack});
      }
    });

    if (!process.send) throw new NeverEntryError();
    process.send({event: "ready"});
  }
}

export class SdProcessChildWorker {
  public constructor(private readonly _id: number) {
  }

  public send(event: Exclude<string, "done" | "error" | "ready">, body?: any): void {
    if (!process.send) throw new NeverEntryError();
    if (event === "error" && body instanceof Error) {
      process.send({
        event: "error",
        sendId: this._id,
        body: {name: body.name, message: body.message, stack: body.stack}
      });
    }
    else {
      process.send({event, sendId: this._id, body});
    }
  }
}