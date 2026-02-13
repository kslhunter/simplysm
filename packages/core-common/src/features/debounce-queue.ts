/**
 * 비동기 함수 디바운스 큐
 *
 * 짧은 시간 내에 여러 번 호출되면 마지막 요청만 실행하고 이전 요청은 무시합니다.
 * 입력 필드 자동완성, 연속적인 상태 변경 배치 처리 등에 유용합니다.
 *
 * @remarks
 * 실행 중에 추가된 요청은 디바운스 지연 없이 현재 실행이 완료된 직후 처리됩니다.
 * 이는 실행 완료 전에 들어온 요청이 누락되지 않도록 하기 위한 의도적 설계입니다.
 *
 * @example
 * const queue = new DebounceQueue(300); // 300ms 딜레이
 * queue.run(() => console.log("1")); // 무시됨
 * queue.run(() => console.log("2")); // 무시됨
 * queue.run(() => console.log("3")); // 300ms 후 실행됨
 *
 * @example
 * // 에러 처리
 * queue.on("error", (err) => console.error(err));
 */
import { SdError } from "../errors/sd-error";
import { EventEmitter } from "./event-emitter";
import consola from "consola";

interface DebounceQueueEvents {
  error: SdError;
}

export class DebounceQueue extends EventEmitter<DebounceQueueEvents> {
  private static readonly _logger = consola.withTag("DebounceQueue");

  private _pendingFn: (() => void | Promise<void>) | undefined;
  private _isRunning = false;
  private _isDisposed = false;
  private _timer: ReturnType<typeof setTimeout> | undefined;

  /**
   * @param _delay 디바운스 지연 시간 (밀리초). 생략 시 즉시 실행 (다음 이벤트 루프)
   */
  constructor(private readonly _delay?: number) {
    super();
  }

  /**
   * 대기 중인 작업과 타이머 정리
   */
  override dispose(): void {
    this._isDisposed = true;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = undefined;
    }
    this._pendingFn = undefined;
    super.dispose();
  }

  /**
   * using 문 지원
   */
  override [Symbol.dispose](): void {
    this.dispose();
  }

  /**
   * 함수를 큐에 추가
   * 이전에 추가된 함수가 있으면 대체됨
   */
  run(fn: () => void | Promise<void>): void {
    if (this._isDisposed) return;

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
    if (this._isDisposed || this._isRunning || !this._pendingFn) return;

    this._isRunning = true;
    this._timer = undefined;

    try {
      // 실행 중에 새 요청이 들어오면 디바운스 지연 없이 즉시 처리
      // 이는 "실행 완료 전에 들어온 요청은 실행 직후 바로 처리"하는 의도적 설계
      while (this._pendingFn) {
        const currentFn = this._pendingFn;
        this._pendingFn = undefined;

        try {
          await currentFn();
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          const sdError = new SdError(error, "작업 실행 중 오류 발생");

          // 리스너가 있으면 이벤트로 전달, 없으면 로깅
          if (this.listenerCount("error") > 0) {
            this.emit("error", sdError);
          } else {
            DebounceQueue._logger.error(sdError);
          }
        }
      }
    } finally {
      this._isRunning = false;
    }
  }
}
