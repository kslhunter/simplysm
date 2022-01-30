export declare class StringUtil {
    static getSuffix(text: string, type: "을" | "은" | "이" | "와" | "랑" | "로" | "라"): string;
    static toPascalCase(str: string): string;
    static toCamelCase(str: string): string;
    static toKebabCase(str: string): string;
    static isNullOrEmpty(str: string | null | undefined): str is ("" | undefined | null);
}
