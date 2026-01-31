import { SdError } from "./SdError";

/**
 * 미구현 오류
 */
export class NotImplementError extends SdError {
  /**
   * @param message 도움 출력 메시지
   */
  constructor(message?: string) {
    super("구현되어있지 않습니다" + (message !== undefined ? ": " + message : ""));
  }
}
