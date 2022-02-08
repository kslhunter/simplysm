import { SdError } from "./SdError";

export class TimeoutError extends SdError {
  public constructor(millisecond?: number, message?: string) {
    super(
      "대기시간이 초과되었습니다"
      + (millisecond !== undefined ? `(${millisecond}ms)` : "")
      + (message !== undefined ? `: ${message}` : "")
    );
  }
}