export class Exception extends Error {
    innerError?: Error;

    constructor(message: string, innerError?: Error, constructorOpt?: Function) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = new.target.name;
        this.message = message;
        Error.captureStackTrace(this, constructorOpt || this.constructor);

        this.innerError = innerError;
    }
}
