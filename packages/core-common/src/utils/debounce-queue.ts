/**
 * 비동기 함수 디바운스 큐
 * 마지막 요청만 실행하고 이전 요청은 무시
 */
import { SdError } from "../errors/SdError.js";
import EventEmitter from "events";

export interface ISdAsyncFnDebounceQueueEvents {
  error: [err: SdError];
}

export class SdAsyncFnDebounceQueue extends EventEmitter<ISdAsyncFnDebounceQueueEvents> {
  private _pendingFn: (() => void | Promise<void>) | undefined;
  private _isRunning = false;
  private _timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly _delay?: number) {
    super();
  }

  /**
   * 함수를 큐에 추가
   * 이전에 추가된 함수가 있으면 대체됨
   */
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
