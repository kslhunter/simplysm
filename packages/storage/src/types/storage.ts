import type { Bytes } from "@simplysm/core-common";
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
  readFile(filePath: string): Promise<Bytes>;
  exists(filePath: string): Promise<boolean>;
  put(localPathOrBuffer: string | Bytes, storageFilePath: string): Promise<void>;
  uploadDir(fromPath: string, toPath: string): Promise<void>;
  remove(filePath: string): Promise<void>;
  close(): Promise<void>;
}
