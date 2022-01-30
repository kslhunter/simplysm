export declare class FunctionUtil {
    static parse(fn: (...args: any[]) => any): {
        params: string[];
        returnContent: string;
    };
}
