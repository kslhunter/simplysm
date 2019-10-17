export class CustomError extends Error {
  public constructor(message?: string) {
    super(message);

    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
    Error.captureStackTrace(this, new.target);
  }
}