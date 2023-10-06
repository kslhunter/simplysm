import {SdError} from "@simplysm/sd-core-common";

/**
 * API 서비스 오류
 */
export class ApiServiceError extends SdError {
  /**
   * @param statusCode 상태코드
   * @param body 오류 바디
   */
  public constructor(public statusCode: number, body: string) {
    super(body);
  }
}
