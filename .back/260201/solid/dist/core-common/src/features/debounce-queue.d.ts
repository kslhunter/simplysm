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
interface DebounceQueueEvents {
  error: SdError;
}
export declare class DebounceQueue extends EventEmitter<DebounceQueueEvents> {
  private readonly _delay?;
  private static readonly _logger;
  private _pendingFn;
  private _isRunning;
  private _isDisposed;
  private _timer;
  /**
   * @param _delay 디바운스 지연 시간 (밀리초). 생략 시 즉시 실행 (다음 이벤트 루프)
   */
  constructor(_delay?: number | undefined);
  /**
   * 대기 중인 작업과 타이머 정리
   */
  dispose(): void;
  /**
   * using 문 지원
   */
  [Symbol.dispose](): void;
  /**
   * 함수를 큐에 추가
   * 이전에 추가된 함수가 있으면 대체됨
   */
  run(fn: () => void | Promise<void>): void;
  private _processLast;
}
export {};
//# sourceMappingURL=debounce-queue.d.ts.map
