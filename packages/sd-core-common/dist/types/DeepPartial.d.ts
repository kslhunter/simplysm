export declare type DeepPartial<T> = Partial<{
    [K in keyof T]: DeepPartial<T[K]>;
}>;
