import {Type} from "../types/Type";

export class Exception extends Error {
  public code?: string;

  public constructor(message: string = "", code?: string, constructorOpt?: Type<any>) {
    super(message);

    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
    this.message = message;
    this.code = code;
    Error.captureStackTrace(this, constructorOpt || new.target);
  }
}