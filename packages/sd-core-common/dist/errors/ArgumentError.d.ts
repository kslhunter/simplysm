import { SdError } from "./SdError";
export declare class ArgumentError extends SdError {
    constructor(argObj: Record<string, any>);
}
