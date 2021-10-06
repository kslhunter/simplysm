import { EventEmitter } from "events";
import { SdError } from "@simplysm/sd-core-common";
import * as cp from "child_process";

export class SdProcessWorkSender extends EventEmitter {
  public constructor(private readonly _worker: cp.ChildProcess,
                     private readonly _sendId: number) {
    super();
  }

  public async sendAsync(...args: any[]): Promise<SdProcessWorkSender> {
    return await new Promise<any>((resolve, reject) => {
      const onMessageFn = (message: { event: string; sendId: number; body?: any }): void => {
        if (message.event === "done" && message.sendId === this._sendId) {
          this.emit("done", message.body);
          resolve(message.body);
        }
        else if (message.event === "error" && message.sendId === this._sendId) {
          reject(new SdError(message.body, `프로세스 수행중 에러 [${JSON.stringify(args)}]`));
        }
        else if (message.sendId === this._sendId) {
          this.emit(message.event, message.body);
        }
      };
      this._worker.on("message", onMessageFn);

      this._worker.send([this._sendId, ...args], (err: Error | null) => {
        if (err) reject(err);
      });
    });
  }
}
