export declare class SdError extends Error {
    innerError?: Error;
    constructor(innerError?: Error, message?: string);
    constructor(message?: string);
    constructor(innerErrorMessage?: string, message?: string);
}
