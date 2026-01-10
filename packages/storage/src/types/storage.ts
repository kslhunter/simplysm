import type { StorageConnConfig } from "./storage-conn-config";

export interface FileInfo {
  name: string;
  isFile: boolean;
}

export interface Storage {
  connect(config: StorageConnConfig): Promise<void>;
  mkdir(dirPath: string): Promise<void>;
  rename(fromPath: string, toPath: string): Promise<void>;
  readdir(dirPath: string): Promise<FileInfo[]>;
  readFile(filePath: string): Promise<Buffer>;
  exists(filePath: string): Promise<boolean>;
  put(localPathOrBuffer: string | Buffer, storageFilePath: string): Promise<void>;
  uploadDir(fromPath: string, toPath: string): Promise<void>;
  remove(filePath: string): Promise<void>;
  close(): Promise<void>;
}
