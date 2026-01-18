import { SdError } from "./sd-error";

/**
 * 미구현 오류
 */
export class NotImplementedError extends SdError {
  /**
   * @param message 추가 설명 메시지
   */
  constructor(message?: string) {
    super("구현되어있지 않습니다" + (message != null ? ": " + message : ""));
    this.name = "NotImplementedError";
  }
}
