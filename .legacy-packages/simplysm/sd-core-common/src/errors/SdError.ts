/**
 * 오류의 Tree 구조 구성이 가능한 오류 클래스
 */
export class SdError extends Error {
  innerError?: Error;

  constructor(innerError: unknown, ...messages: string[]);
  constructor(...messages: string[]);
  constructor(arg1?: unknown, ...messages: string[]);
  constructor(arg1?: unknown, ...messages: string[]) {
    const arg1Message =
      arg1 instanceof Error
        ? arg1.message
        : typeof arg1 === "string"
          ? arg1
          : arg1 != null
            ? String(arg1)
            : undefined;

    super(
      [arg1Message, ...messages]
        .filter((m) => m != null)
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

    if (arg1 instanceof Error && arg1.stack != null) {
      this.innerError = arg1;
      this.stack += `\n---- inner error stack ----\n${arg1.stack}`;
    }
  }
}
