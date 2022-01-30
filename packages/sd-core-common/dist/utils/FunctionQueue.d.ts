export declare class FunctionQueue {
    private readonly _gap?;
    private readonly _queue;
    private _isQueueRunning;
    constructor(_gap?: number | undefined);
    run(fn: () => void | Promise<void>): void;
}
