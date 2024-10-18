export declare class CordovaAppStorage {
    #private;
    constructor(rootDirectory?: string);
    readJsonAsync(filePath: string): Promise<any>;
    readFileBufferAsync(filePath: string): Promise<Buffer>;
    readFileAsync(filePath: string): Promise<string>;
    writeJsonAsync(filePath: string, data: any): Promise<void>;
    writeAsync(filePath: string, data: Blob | string | ArrayBuffer): Promise<void>;
    readdirAsync(dirPath: string): Promise<string[]>;
    removeAsync(dirOrFilePath: string): Promise<void>;
    getFullUrl(targetPath: string): string;
}
