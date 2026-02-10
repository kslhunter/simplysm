import { WebPlugin } from "@capacitor/core";
import type { IFileInfo, IFileSystemPlugin, TStorage } from "../IFileSystemPlugin";
export declare class FileSystemWeb extends WebPlugin implements IFileSystemPlugin {
  private readonly _fs;
  checkPermission(): Promise<{
    granted: boolean;
  }>;
  requestPermission(): Promise<void>;
  readdir(options: { path: string }): Promise<{
    files: IFileInfo[];
  }>;
  getStoragePath(options: { type: TStorage }): Promise<{
    path: string;
  }>;
  getFileUri(options: { path: string }): Promise<{
    uri: string;
  }>;
  writeFile(options: { path: string; data: string; encoding?: "utf8" | "base64" }): Promise<void>;
  readFile(options: { path: string; encoding?: "utf8" | "base64" }): Promise<{
    data: string;
  }>;
  remove(options: { path: string }): Promise<void>;
  mkdir(options: { path: string }): Promise<void>;
  exists(options: { path: string }): Promise<{
    exists: boolean;
  }>;
}
