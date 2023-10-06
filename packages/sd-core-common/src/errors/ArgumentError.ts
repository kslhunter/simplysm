import {SdError} from "./SdError";

/**
 * 인수 오류
 */
export class ArgumentError extends SdError {
  /**
   * @param argObj 잘못된 인수/값 들
   */
  public constructor(argObj: Record<string, any>) {
    super("인수가 잘못되었습니다: " + JSON.stringify(argObj));
  }
}
