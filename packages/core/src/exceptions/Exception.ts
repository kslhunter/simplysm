import {Type} from "../types/Type";

export class Exception extends Error {
    public constructor(message: string, constructorOpt?: Type<any>) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = new.target.name;
        this.message = message;
        Error.captureStackTrace(this, constructorOpt || new.target);
    }
}
