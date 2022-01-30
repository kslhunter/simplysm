export declare class Wait {
    static until(forwarder: () => boolean | Promise<boolean>, milliseconds?: number, timeout?: number): Promise<void>;
    static time(millisecond: number): Promise<void>;
}
