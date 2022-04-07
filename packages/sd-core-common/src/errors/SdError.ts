import os from "os";

export class SdError extends Error {
  public innerError?: Error;

  public constructor(innerError?: Error, message?: string);
  public constructor(message?: string);
  public constructor(innerErrorMessage?: string, message?: string);
  public constructor(arg1?: Error | string, arg2?: string) {
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

    if (typeof arg1 === "object" && typeof arg1.stack === "string") {
      this.innerError = arg1;
      this.stack += `${os.EOL}---- inner error stack ----${os.EOL}${arg1.stack}`;
    }
  }
}
