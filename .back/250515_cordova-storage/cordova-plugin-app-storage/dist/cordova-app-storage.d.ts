export declare class CordovaAppStorage {
    static raw: import("@awesome-cordova-plugins/file").FileOriginal;
    private _rootDirectoryUrl;
    constructor(rootDirectory?: string);
    readJsonAsync(filePath: string): Promise<any>;
    readFileBufferAsync(filePath: string): Promise<Buffer>;
    readFileAsync(filePath: string): Promise<string>;
    writeJsonAsync(filePath: string, data: any): Promise<void>;
    writeAsync(filePath: string, data: Blob | string): Promise<void>;
    readdirAsync(dirPath: string): Promise<string[]>;
    existsAsync(targetPath: string): Promise<boolean>;
    removeAsync(dirOrFilePath: string): Promise<void>;
    getFullUrl(targetPath: string): string;
    getFullPath(targetPath: string): string;
    private _mkdirAsync;
    private _mkdirsAsync;
}
