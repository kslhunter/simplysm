import type { FileInfo } from "../FileSystemPlugin";
import type { VirtualFsEntry } from "@simplysm/core-browser";
import { IndexedDbStore, IndexedDbVirtualFs } from "@simplysm/core-browser";

export class VirtualFileSystem {
  private readonly _STORE_NAME = "entries";
  private readonly _db: IndexedDbStore;
  private readonly _vfs: IndexedDbVirtualFs;

  constructor(dbName: string) {
    this._db = new IndexedDbStore(dbName, 1, [{ name: this._STORE_NAME, keyPath: "path" }]);
    this._vfs = new IndexedDbVirtualFs(this._db, this._STORE_NAME, "path");
  }

  async getEntry(filePath: string): Promise<VirtualFsEntry | undefined> {
    return this._vfs.getEntry(filePath);
  }

  async putEntry(entry: { path: string; kind: "file" | "dir"; dataBase64?: string }): Promise<void> {
    return this._vfs.putEntry(entry.path, entry.kind, entry.dataBase64);
  }

  async deleteByPrefix(pathPrefix: string): Promise<boolean> {
    return this._vfs.deleteByPrefix(pathPrefix);
  }

  /**
   * Return the direct children of a directory.
   * @param dirPath Directory path to query
   * @returns List of child files/directories
   * @note Implicit directory handling: Even when only file paths exist without directory entries,
   * intermediate paths are treated as directories. e.g., With only "/a/b/c.txt" stored,
   * calling listChildren("/a") returns "b" with isDirectory: true.
   */
  async listChildren(dirPath: string): Promise<FileInfo[]> {
    const prefix = dirPath === "/" ? "/" : dirPath + "/";
    return this._vfs.listChildren(prefix);
  }

  async ensureDir(dirPath: string): Promise<void> {
    return this._vfs.ensureDir((path) => path, dirPath);
  }
}
