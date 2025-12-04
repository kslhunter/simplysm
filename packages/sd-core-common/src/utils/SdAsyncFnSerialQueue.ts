import { SdError } from "../errors/SdError";
import { Wait } from "./Wait";
import EventEmitter from "events";

export class SdAsyncFnSerialQueue extends EventEmitter {
  private readonly _queue: (() => void | Promise<void>)[] = [];
  private _isQueueRunning = false;

  override on(event: "error", listener: (err: SdError) => void): this;
  override on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  constructor(private readonly _gap: number = 0) {
    super();
  }

  run(fn: () => void | Promise<void>): void {
    this._queue.push(fn);
    void this._processAsync();
  }

  private async _processAsync(): Promise<void> {
    if (this._isQueueRunning) return;
    this._isQueueRunning = true;

    try {
      while (this._queue.length > 0) {
        const fn = this._queue.shift();
        if (!fn) break;

        try {
          await fn();
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          this.emit("error", new SdError(error, "큐 작업 실행 중 오류 발생"));
        }

        if (this._gap > 0 && this._queue.length > 0) {
          await Wait.time(this._gap);
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.emit("error", new SdError(error, "큐 내부 오류 발생"));
    } finally {
      this._isQueueRunning = false;
    }
  }
}
