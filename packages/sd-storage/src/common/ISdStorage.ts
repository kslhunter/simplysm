export interface ISdStorage {
  connectAsync(connectionConfig: any): Promise<void>;

  mkdirAsync(storageDirPath: string): Promise<void>;

  putAsync(localPathOrBuffer: string | Buffer, storageFilePath: string): Promise<void>;

  closeAsync(): Promise<void>;
}
