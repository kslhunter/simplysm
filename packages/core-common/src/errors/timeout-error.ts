import { SdError } from "./sd-error";

/**
 * 타임아웃 오류
 */
export class TimeoutError extends SdError {
  /**
   * @param millisecond 타임아웃까지 대기한 시간 (밀리초)
   * @param message 추가 메시지
   */
  constructor(millisecond?: number, message?: string) {
    super(
      "대기시간이 초과되었습니다" +
        (millisecond != null ? `(${millisecond}ms)` : "") +
        (message != null ? `: ${message}` : ""),
    );
    this.name = "TimeoutError";
  }
}
