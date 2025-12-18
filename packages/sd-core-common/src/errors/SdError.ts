/**
 * 오류의 Tree 구조 구성이 가능한 오류 클래스
 */
export class SdError extends Error {
  innerError?: Error;

  constructor(innerError: Error, ...messages: string[]);
  constructor(...messages: string[]);
  constructor(arg1: Error | string, ...messages: string[]) {
    if (typeof arg1 === "object" && "message" in arg1) {
      super([arg1.message, ...messages].reverse().join(" => "));
    } else {
    }

    super(
      [typeof arg1 === "object" && "message" in arg1 ? arg1.message : arg1, ...messages]
        .reverse()
        .join(" => "),
    );

    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
    if (typeof Error.captureStackTrace !== "undefined") {
      Error.captureStackTrace(this, new.target);
    } else {
      try {
        throw new Error(this.message);
      } catch (err) {
        if (err instanceof Error) {
          this.stack = err.stack;
        } else {
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
