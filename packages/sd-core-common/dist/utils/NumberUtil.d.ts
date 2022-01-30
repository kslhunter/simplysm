export declare class NumberUtil {
    static parseInt(text: any, radix?: number): number | undefined;
    static parseFloat(text: any): number | undefined;
    static isNullOrEmpty(val: number | null | undefined): val is (0 | undefined | null);
}
