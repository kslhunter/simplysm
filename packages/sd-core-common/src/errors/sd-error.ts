/**
 * 오류의 Tree 구조 구성이 가능한 오류 클래스
 */
export class SdError extends Error {
  /**
   * 내부오류
   */
  innerError?: Error;

  /**
   * @param innerError 내부오류
   * @param message 현재 오류의 메시지
   */
  constructor(innerError?: Error, message?: string);

  /**
   * @param message 현재 오류의 메시지
   */
  constructor(message?: string);

  /**
   * @param innerErrorMessage 내부오류의 메시지
   * @param message 현재 오류의 메시지
   */
  constructor(innerErrorMessage?: string, message?: string);
  constructor(arg1?: Error | string, arg2?: string) {
    if (typeof arg1 === "object" || typeof arg2 === "string") {
      super(
        (arg2 ?? "")
        + (
          typeof arg1 === "object" ? ` => ${arg1.message}`
            : typeof arg1 === "string" ? ` => ${arg1}`
              : "처리되지 않은 예외가 발생하였습니다."
        )
      );
    }
    else {
      super(arg1 ?? "처리되지 않은 예외가 발생하였습니다.");
    }

    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
    if (typeof Error.captureStackTrace !== "undefined") {
      Error.captureStackTrace(this, new.target);
    }
    else {
      try {
        throw new Error(this.message);
      }
      catch (err) {
        if (err instanceof Error) {
          this.stack = err.stack;
        }
        else {
          throw err;
        }
      }
    }

    // noinspection SuspiciousTypeOfGuard
    if (typeof arg1 === "object" && typeof arg1.stack === "string") {
      this.innerError = arg1;
      this.stack += `\n---- inner error stack ----\n${arg1.stack}`;
    }
  }
}
