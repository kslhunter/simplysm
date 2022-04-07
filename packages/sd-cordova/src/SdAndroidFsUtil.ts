/// <reference types="cordova-plugin-file" />

export class SdAndroidFsUtil {
  public static async readdirAsync(dirPath: string, option?: { noDir?: boolean; noFile?: boolean; create?: boolean }): Promise<string[]> {
    const currDirEntity = await this._getDirEntryByPathAsync(dirPath, option?.create ?? false);
    const childrenEntries = await this._getChildEntriesAsync(currDirEntity);
    return childrenEntries
      .filter((item) => (!option?.noDir || !item.isDirectory) && (!option?.noFile || !item.isFile))
      .map((item) => item.name);
  }

  public static async writeFileAsync(filePath: string, blob: Blob): Promise<void> {
    const fileEntity = await this._getFileEntryByPathAsync(filePath, true, true);
    await this._writeFileAsync(fileEntity, blob);
  }

  public static async getFullUrlAsync(filePath: string): Promise<string> {
    const fileEntry = await this._getFileEntryByPathAsync(filePath, false, false);
    return fileEntry.toURL();
  }

  private static async _getDirEntryByPathAsync(dirPath: string, create: boolean): Promise<DirectoryEntry> {
    const split = dirPath.replace(/^[\\\/]/g, "").split(/[\\\/]/);
    return await this._getDirEntryByPathArrAsync(split, create);
  }

  private static async _getFileEntryByPathAsync(filePath: string, createDir: boolean, createFile: boolean): Promise<FileEntry> {
    const split = filePath.replace(/^[\\\/]/g, "").split(/[\\\/]/);
    const currDirEntity = await this._getDirEntryByPathArrAsync(split.slice(0, -1), createDir);
    return await this._getFileEntryAsync(currDirEntity, split[split.length - 1]!, createFile);
  }

  private static async _getDirEntryByPathArrAsync(pathArr: string[], create: boolean): Promise<DirectoryEntry> {
    const fs = await this._getFileSystemAsync();

    let currDirEntity: DirectoryEntry = fs.root as any;
    for (const pathArrItem of pathArr) {
      currDirEntity = await this._getDirEntryAsync(currDirEntity, pathArrItem, create);
    }

    return currDirEntity;
  }

  private static async _getFileSystemAsync(): Promise<FileSystem> {
    return await new Promise<FileSystem>((resolve, reject) => {
      window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, (fs) => {
        resolve(fs);
      }, (err) => {
        reject(err);
      });
    });
  }

  private static async _getDirEntryAsync(dirEntry: DirectoryEntry, dirName: string, create: boolean): Promise<DirectoryEntry> {
    return await new Promise<DirectoryEntry>((resolve, reject) => {
      dirEntry.getDirectory(dirName, { create }, (entry) => {
        resolve(entry);
      }, (err) => {
        reject(err);
      });
    });
  }

  private static async _getFileEntryAsync(dirEntry: DirectoryEntry, filePath: string, create: boolean): Promise<FileEntry> {
    return await new Promise<FileEntry>((resolve, reject) => {
      dirEntry.getFile(filePath, { create }, (fileEntry) => {
        resolve(fileEntry);
      }, (err) => {
        reject(err);
      });
    });
  }

  private static async _getChildEntriesAsync(dirEntry: DirectoryEntry): Promise<Entry[]> {
    return await new Promise<Entry[]>((resolve, reject) => {
      dirEntry.createReader().readEntries((entries) => {
        resolve(entries);
      }, (err) => {
        reject(err);
      });
    });
  }

  private static async _writeFileAsync(fileEntry: FileEntry, blob: Blob): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      fileEntry.createWriter((writer) => {
        writer.onwriteend = () => {
          resolve();
        };
        writer.onerror = (e) => {
          reject(e);
        };

        writer.write(blob);
      }, (err) => {
        reject(err);
      });
    });
  }
}
