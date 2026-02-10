import type { IFileInfo } from "../IFileSystemPlugin";
interface FsEntry {
  path: string;
  kind: "file" | "dir";
  dataBase64?: string;
}
export declare class VirtualFileSystem {
  private readonly _dbName;
  private readonly _STORE_NAME;
  private readonly _DB_VERSION;
  constructor(_dbName: string);
  private _openDb;
  private _withStore;
  getEntry(filePath: string): Promise<FsEntry | undefined>;
  putEntry(entry: FsEntry): Promise<void>;
  deleteByPrefix(pathPrefix: string): Promise<boolean>;
  listChildren(dirPath: string): Promise<IFileInfo[]>;
  ensureDir(dirPath: string): Promise<void>;
}
export {};
