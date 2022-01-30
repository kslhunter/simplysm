/// <reference types="node" />
import glob from "glob";
import * as fs from "fs";
export declare class FsUtil {
    static getParentPaths(currentPath: string): string[];
    static getMd5Async(filePath: string): Promise<string>;
    static globAsync(pattern: string): Promise<string[]>;
    static globAsync(pattern: string, options: glob.IOptions): Promise<string[]>;
    static glob(pattern: string, options?: glob.IOptions): string[];
    static readdirAsync(targetPath: string): Promise<string[]>;
    static readdir(targetPath: string): string[];
    static exists(targetPath: string): boolean;
    static removeAsync(targetPath: string): Promise<void>;
    static remove(targetPath: string): void;
    static copyAsync(sourcePath: string, targetPath: string, filter?: (subPath: string) => boolean): Promise<void>;
    static copy(sourcePath: string, targetPath: string, filter?: (subPath: string) => boolean): void;
    static mkdirsAsync(targetPath: string): Promise<void>;
    static mkdirs(targetPath: string): void;
    static writeJsonAsync(targetPath: string, data: any, options?: {
        replacer?: (this: any, key: string | undefined, value: any) => any;
        space?: string | number;
    }): Promise<void>;
    static writeFileAsync(targetPath: string, data: any): Promise<void>;
    static writeFile(targetPath: string, data: any): void;
    static readFile(targetPath: string): string;
    static readFileAsync(targetPath: string): Promise<string>;
    static readFileBuffer(targetPath: string): Buffer;
    static readFileBufferAsync(targetPath: string): Promise<Buffer>;
    static readJson(targetPath: string): any;
    static readJsonAsync(targetPath: string): Promise<any>;
    static lstat(targetPath: string): fs.Stats;
    static lstatAsync(targetPath: string): Promise<fs.Stats>;
    static appendFile(targetPath: string, data: any): void;
    static open(targetPath: string, flags: string | number): number;
    static openAsync(targetPath: string, flags: string | number): Promise<fs.promises.FileHandle>;
    static createReadStream(sourcePath: string): fs.ReadStream;
    static createWriteStream(targetPath: string): fs.WriteStream;
    static isDirectoryAsync(targetPath: string): Promise<boolean>;
    static isDirectory(targetPath: string): boolean;
    static clearEmptyDirectoryAsync(dirPath: string): Promise<void>;
    static findAllParentChildPaths(childName: string, fromPath: string, rootPath: string): string[];
}
