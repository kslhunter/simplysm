import { SdError } from "./SdError";
export declare class TimeoutError extends SdError {
    constructor(millisecond?: number, message?: string);
}
