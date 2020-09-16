export interface ISdFtpConnectionConfig {
  host: string;
  port?: number;
  user?: string;
  password?: string;
}

export interface ISdStorage {
  connectAsync(connectionConfig: any): Promise<void>;

  mkdirAsync(storageDirPath: string): Promise<void>;

  renameAsync(fromPath: string, toPath: string): Promise<void>;

  putAsync(localPathOrBuffer: string | Buffer, storageFilePath: string): Promise<void>;

  closeAsync(): Promise<void>;
}
