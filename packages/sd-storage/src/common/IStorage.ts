export interface IStorage {
    connect(connectionConfig: any): Promise<void>;

    mkdir(storageDirPath: string): Promise<void>;

    put(localPathOrBuffer: string | Buffer, storageFilePath: string): Promise<void>;

    close(): Promise<void>;
}