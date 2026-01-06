import { SdError } from "./SdError";

/**
 * 절대 진입되지 않을것으로 예상되는 장소에 진입함 오류
 */
export class NeverEntryError extends SdError {
  /**
   * @param message 도움 출력 메시지
   */
  constructor(message?: string) {
    super(
      "절대 진입될 수 없는것으로 판단된 코드에 진입되었습니다" +
        (message !== undefined ? ": " + message : ""),
    );
  }
}
