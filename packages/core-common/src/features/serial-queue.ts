/**
 * 비동기 함수 직렬 큐
 *
 * 큐에 추가된 함수들을 순서대로 실행합니다.
 * 한 작업이 완료되어야 다음 작업이 시작됩니다.
 * 에러가 발생해도 후속 작업은 계속 실행됩니다.
 *
 * @example
 * const queue = new SerialQueue();
 * queue.run(async () => { await fetch("/api/1"); });
 * queue.run(async () => { await fetch("/api/2"); }); // 1번 완료 후 실행
 * queue.run(async () => { await fetch("/api/3"); }); // 2번 완료 후 실행
 *
 * @example
 * // 에러 처리
 * queue.on("error", (err) => console.error(err));
 */
import { SdError } from "../errors/sd-error";
import { EventEmitter } from "./event-emitter";
import consola from "consola";
import { waitTime } from "../utils/wait";

interface SerialQueueEvents {
  error: SdError;
}

export class SerialQueue extends EventEmitter<SerialQueueEvents> {
  private static readonly _logger = consola.withTag("SerialQueue");

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
   * using 문 지원
   */
  override [Symbol.dispose](): void {
    this.dispose();
  }

  /**
   * 함수를 큐에 추가하고 실행
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

          // 리스너가 있으면 이벤트로 전달, 없으면 로깅
          if (this.listenerCount("error") > 0) {
            this.emit("error", sdError);
          } else {
            SerialQueue._logger.error(sdError);
          }
        }

        if (this._gap > 0 && this._queue.length > 0) {
          await waitTime(this._gap);
        }
      }
    } finally {
      this._isQueueRunning = false;
    }
  }
}
