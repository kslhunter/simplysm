/**
 * 비동기 함수 직렬 큐
 * 큐에 추가된 함수들을 순서대로 실행
 */
import { SdError } from "../errors/sd-error";
import { Wait } from "./wait";
import { SdEventEmitter } from "./sd-event-emitter";
import pino from "pino";

interface SerialQueueEvents {
  error: SdError;
}

export class SerialQueue extends SdEventEmitter<SerialQueueEvents> {
  private static readonly _logger = pino({ name: "SerialQueue" });

  private readonly _queue: (() => void | Promise<void>)[] = [];
  private _isQueueRunning = false;

  /**
   * @param _gap 각 작업 사이의 간격 (ms)
   */
  constructor(private readonly _gap: number = 0) {
    super();
  }

  /**
   * 대기 중인 큐 비우기 (현재 실행 중인 작업은 완료됨)
   */
  dispose(): void {
    this._queue.length = 0;
  }

  /**
   * using 문 지원
   */
  [Symbol.dispose](): void {
    this.dispose();
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
          const sdError = new SdError(error, "큐 작업 실행 중 오류 발생");

          // 리스너가 있으면 이벤트로 전달, 없으면 로깅
          if (this.listenerCount("error") > 0) {
            this.emit("error", sdError);
          } else {
            SerialQueue._logger.error(sdError);
          }
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
