import { Type } from "../types/Type";

export class Exception extends Error {
  [key: string]: any;

  public constructor(message: string, assignObj?: { [key: string]: any }, constructorOpt?: Type<any>) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
    this.message = message;
    Error.captureStackTrace(this, constructorOpt || new.target);

    if (assignObj) {
      Object.assign(this, assignObj);
    }
  }
}
