/**
 * 비동기 직렬 큐
 *
 * 큐에 추가된 함수들은 순차적으로 실행됨.
 * 하나의 작업이 완료된 후에야 다음 작업이 시작됨.
 * 에러가 발생해도 후속 작업은 계속 실행됨.
 */
import { SdError } from "../errors/sd-error";
import { EventEmitter } from "./event-emitter";
import { createLogger } from "./logger";
import { time } from "../utils/wait";

interface SerialQueueEvents {
  error: SdError;
}

export class SerialQueue extends EventEmitter<SerialQueueEvents> {
  private static readonly _logger = createLogger("SerialQueue");

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
  override dispose(): void {
    this._queue.length = 0;
    super.dispose();
  }

  /**
   * 큐에 함수를 추가하고 실행
   */
  run(fn: () => void | Promise<void>): void {
    this._queue.push(fn);
    void this._process();
  }

  private async _process(): Promise<void> {
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

          // 리스너가 있으면 이벤트로 발행, 없으면 로그 출력
          if (this.listenerCount("error") > 0) {
            this.emit("error", sdError);
          } else {
            SerialQueue._logger.error(sdError);
          }
        }

        if (this._gap > 0 && this._queue.length > 0) {
          await time(this._gap);
        }
      }
    } finally {
      this._isQueueRunning = false;
    }
  }
}
