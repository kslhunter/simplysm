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
   * 디렉토리의 직접 하위 항목을 반환합니다.
   * @param dirPath 조회할 디렉토리 경로
   * @returns 하위 파일/디렉토리 목록
   * @note 암시적 디렉토리 처리: 디렉토리 항목 없이 파일 경로만 존재하더라도
   * 중간 경로를 디렉토리로 취급합니다. 예: "/a/b/c.txt"만 저장된 경우,
   * listChildren("/a") 호출 시 "b"를 isDirectory: true로 반환합니다.
   */
  async listChildren(dirPath: string): Promise<FileInfo[]> {
    const prefix = dirPath === "/" ? "/" : dirPath + "/";
    return this._vfs.listChildren(prefix);
  }

  async ensureDir(dirPath: string): Promise<void> {
    return this._vfs.ensureDir((path) => path, dirPath);
  }
}
