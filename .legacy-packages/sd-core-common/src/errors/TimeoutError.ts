import { SdError } from "./SdError";

/**
 * 타임아웃 오류
 */
export class TimeoutError extends SdError {
  /**
   * @param millisecond 얼마를 기다리고 타임아웃 되었는지?
   * @param message 추가 출력 메시지
   */
  constructor(millisecond?: number, message?: string) {
    super(
      "대기시간이 초과되었습니다" +
        (millisecond !== undefined ? `(${millisecond}ms)` : "") +
        (message !== undefined ? `: ${message}` : ""),
    );
  }
}
