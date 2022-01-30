export declare class PathUtil {
    static posix(...args: string[]): string;
    static changeFileDirectory(filePath: string, fromDirectory: string, toDirectory: string): string;
    static removeExt(filePath: string): string;
    static isChildPath(childPath: string, parentPath: string): boolean;
}
