/// <reference types="node" />
import { ISdStorage, ISdStorageConnectionConfig } from "../commons";
export declare class SdFtpStorage implements ISdStorage {
    private readonly _secure;
    private _ftp?;
    constructor(_secure: boolean);
    connectAsync(connectionConfig: ISdStorageConnectionConfig): Promise<void>;
    mkdirAsync(storageDirPath: string): Promise<void>;
    renameAsync(fromPath: string, toPath: string): Promise<void>;
    putAsync(localPathOrBuffer: string | Buffer, storageFilePath: string): Promise<void>;
    uploadDirAsync(fromPath: string, toPath: string): Promise<void>;
    closeAsync(): Promise<void>;
}
