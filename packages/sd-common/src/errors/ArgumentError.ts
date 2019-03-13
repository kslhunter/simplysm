export class ArgumentError extends Error {
  public constructor(argObj: { [key: string]: any }) {
    super("인수가 잘못되었습니다: " + JSON.stringify(argObj));

    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
    Error.captureStackTrace(this, new.target);
  }
}