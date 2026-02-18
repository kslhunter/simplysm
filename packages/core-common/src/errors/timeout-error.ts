import { SdError } from "./sd-error";

/**
 * 타임아웃 오류
 *
 * 대기 시간이 초과되었을 때 발생하는 에러이다.
 * Wait.until() 등의 비동기 대기 함수에서 최대 시도 횟수를 초과하면 자동으로 발생한다.
 *
 * @example
 * // Wait.until에서 자동 발생
 * try {
 *   await Wait.until(() => isReady, 100, 50); // 100ms 간격, 최대 50회
 * } catch (err) {
 *   if (err instanceof TimeoutError) {
 *     console.log("시간 초과");
 *   }
 * }
 *
 * @example
 * // 직접 발생
 * if (elapsed > maxTime) {
 *   throw new TimeoutError(undefined, "API 응답 대기 초과");
 * }
 */
export class TimeoutError extends SdError {
  /**
   * @param count 시도 횟수
   * @param message 추가 메시지
   */
  constructor(count?: number, message?: string) {
    super(
      "대기 시간이 초과되었습니다" +
        (count != null ? `(${count}회)` : "") +
        (message != null ? `: ${message}` : ""),
    );
    this.name = "TimeoutError";
  }
}
