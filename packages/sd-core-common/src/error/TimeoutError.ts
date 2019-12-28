import {CustomError} from "./CustomError";

export class TimeoutError extends CustomError {
  public constructor(millisecond?: number, message?: string) {
    super(`대기시간이 초과되었습니다${millisecond ? `(${millisecond}ms)` : ""}${message ? `: ${message}` : ""}`);
  }
}