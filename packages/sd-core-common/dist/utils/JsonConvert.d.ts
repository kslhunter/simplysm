export declare class JsonConvert {
    static stringify(obj: any, options?: {
        space?: string | number;
        replacer?: (key: string | undefined, value: any) => any;
        hideBuffer?: boolean;
    }): string;
    static parse(json: string): any;
}
