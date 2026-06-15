import { SdError } from "./sd-error";

/**
 * 미구현 오류
 *
 * 아직 구현되지 않은 기능이 호출되었을 때 발생하는 에러.
 * 추상 메서드 스텁, 향후 구현 예정인 분기 등에 사용된다.
 */
export class NotImplementedError extends SdError {
  /**
   * @param message 추가 설명 메시지
   */
  constructor(message?: string) {
    super("미구현" + (message != null ? ": " + message : ""));
    this.name = "NotImplementedError";
  }
}
