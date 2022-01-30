export declare class SdEventEmitter {
    private readonly _eventListener;
    on(event: string | symbol, listener: (...args: any[]) => (void | Promise<void>)): this;
    off(event: string | symbol, listener: (...args: any[]) => (void | Promise<void>)): this;
    emit(event: string | symbol, ...args: any[]): Promise<void>;
}
