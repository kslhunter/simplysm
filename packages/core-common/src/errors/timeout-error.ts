import { SdError } from "./sd-error";

/**
 * 타임아웃 오류
 *
 * 대기 시간이 초과되었을 때 발생하는 에러.
 * Wait.until() 같은 비동기 대기 함수에서 최대 시도 횟수를 초과하면 자동으로 발생한다.
 */
export class TimeoutError extends SdError {
  /**
   * @param count 시도 횟수
   * @param message 추가 메시지
   */
  constructor(count?: number, message?: string) {
    super(
      "대기 시간 초과" +
        (count != null ? `(${count}회 시도)` : "") +
        (message != null ? `: ${message}` : ""),
    );
    this.name = "TimeoutError";
  }
}
