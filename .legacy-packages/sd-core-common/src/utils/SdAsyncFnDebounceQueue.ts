import { SdError } from "../errors/SdError";
import EventEmitter from "events";

export class SdAsyncFnDebounceQueue extends EventEmitter {
  private _pendingFn: (() => void | Promise<void>) | undefined;
  private _isRunning = false;
  private _timer: ReturnType<typeof setTimeout> | undefined;

  override on(event: "error", listener: (err: SdError) => void): this;
  override on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  constructor(private readonly _delay?: number) {
    super();
  }

  run(fn: () => void | Promise<void>): void {
    this._pendingFn = fn;

    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = undefined;
    }

    if (!this._isRunning) {
      this._timer = setTimeout(() => {
        void this._processLast();
      }, this._delay);
    }
  }

  private async _processLast(): Promise<void> {
    if (this._isRunning || !this._pendingFn) return;

    this._isRunning = true;
    this._timer = undefined;

    try {
      while (this._pendingFn) {
        const currentFn = this._pendingFn;
        this._pendingFn = undefined;

        try {
          await currentFn();
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          this.emit("error", new SdError(error, "작업 실행 중 오류 발생"));
        }
      }
    } finally {
      this._isRunning = false;
    }
  }
}
