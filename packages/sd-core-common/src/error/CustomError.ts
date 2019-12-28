export class CustomError extends Error {
  public constructor(innerError?: Error, message?: string)
  public constructor(message?: string)
  public constructor(arg1?: Error | string, arg2?: string) {
    if (arg1 instanceof Error || typeof arg2 === "string") {
      super(arg2 + (arg1 instanceof Error ? ` => ${arg1.message}` : ""));
    }
    else {
      super(arg1);
    }

    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target);
    }
    else {
      try {
        throw new Error(this.message);
      }
      catch (err) {
        this.stack = err.stack;
      }
    }

    if (arg1 instanceof Error && arg1.stack) {
      this.stack += "\n-- inner error stack --\n" + arg1.stack;
    }
  }
}