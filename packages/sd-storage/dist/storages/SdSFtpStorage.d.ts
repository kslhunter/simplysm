/// <reference types="node" />
import { ISdStorage, ISdStorageConnectionConfig } from "../commons";
export declare class SdSFtpStorage implements ISdStorage {
    private _sftp?;
    connectAsync(connectionConfig: ISdStorageConnectionConfig): Promise<void>;
    mkdirAsync(storageDirPath: string): Promise<void>;
    renameAsync(fromPath: string, toPath: string): Promise<void>;
    putAsync(localPathOrBuffer: string | Buffer, storageFilePath: string): Promise<void>;
    uploadDirAsync(fromPath: string, toPath: string): Promise<void>;
    closeAsync(): Promise<void>;
}
