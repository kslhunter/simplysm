/**
 * 비동기 함수 직렬 큐
 * 큐에 추가된 함수들을 순서대로 실행
 */
import { SdError } from "../errors/SdError.js";
import { Wait } from "./wait.js";
import EventEmitter from "events";

export interface ISdAsyncFnSerialQueueEvents {
  error: [err: SdError];
}

export class SdAsyncFnSerialQueue extends EventEmitter<ISdAsyncFnSerialQueueEvents> {
  private readonly _queue: (() => void | Promise<void>)[] = [];
  private _isQueueRunning = false;

  /**
   * @param _gap 각 작업 사이의 간격 (ms)
   */
  constructor(private readonly _gap: number = 0) {
    super();
  }

  /**
   * 함수를 큐에 추가하고 실행
   */
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
    } finally {
      this._isQueueRunning = false;
    }
  }
}
