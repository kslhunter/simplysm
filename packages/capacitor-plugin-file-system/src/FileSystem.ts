import { registerPlugin } from "@capacitor/core";
import type { IFileInfo, IFileSystemPlugin, TStorage } from "./IFileSystemPlugin";
import type { Bytes } from "@simplysm/core-common";
import { bytesToBase64, bytesFromBase64 } from "@simplysm/core-common";

const FileSystemPlugin = registerPlugin<IFileSystemPlugin>("FileSystem", {
  web: async () => {
    const { FileSystemWeb } = await import("./web/FileSystemWeb");
    return new FileSystemWeb();
  },
});

/**
 * File system access plugin
 * - Android 11+: Full file system access via MANAGE_EXTERNAL_STORAGE permission
 * - Android 10-: READ/WRITE_EXTERNAL_STORAGE permission
 * - Browser: IndexedDB-based emulation
 */
export abstract class FileSystem {
  /**
   * Check permission
   */
  static async hasPermission(): Promise<boolean> {
    const result = await FileSystemPlugin.hasPermission();
    return result.granted;
  }

  /**
   * Request permission
   * - Android 11+: Navigate to settings
   * - Android 10-: Show permission dialog
   */
  static async requestPermission(): Promise<void> {
    await FileSystemPlugin.requestPermission();
  }

  /**
   * Read directory
   */
  static async readdir(dirPath: string): Promise<IFileInfo[]> {
    const result = await FileSystemPlugin.readdir({ path: dirPath });
    return result.files;
  }

  /**
   * Get storage path
   * @param type Storage type
   * - external: External storage root (Environment.getExternalStorageDirectory)
   * - externalFiles: App-specific external files directory
   * - externalCache: App-specific external cache directory
   * - externalMedia: App-specific external media directory
   * - appData: App data directory
   * - appFiles: App files directory
   * - appCache: App cache directory
   */
  static async getStoragePath(type: TStorage): Promise<string> {
    const result = await FileSystemPlugin.getStoragePath({ type });
    return result.path;
  }

  /**
   * Get file URI (FileProvider)
   */
  static async getFileUri(filePath: string): Promise<string> {
    const result = await FileSystemPlugin.getFileUri({ path: filePath });
    return result.uri;
  }

  /**
   * Write file
   */
  static async writeFile(filePath: string, data: string | Bytes): Promise<void> {
    if (typeof data !== "string") {
      // Bytes (Uint8Array) - works safely in cross-realm environments
      await FileSystemPlugin.writeFile({
        path: filePath,
        data: bytesToBase64(data),
        encoding: "base64",
      });
    } else {
      await FileSystemPlugin.writeFile({
        path: filePath,
        data,
        encoding: "utf8",
      });
    }
  }

  /**
   * Read file (UTF-8 string)
   */
  static async readFileString(filePath: string): Promise<string> {
    const result = await FileSystemPlugin.readFile({ path: filePath, encoding: "utf8" });
    return result.data;
  }

  /**
   * Read file (Bytes)
   */
  static async readFileBytes(filePath: string): Promise<Bytes> {
    const result = await FileSystemPlugin.readFile({ path: filePath, encoding: "base64" });
    return bytesFromBase64(result.data);
  }

  /**
   * Delete file/directory (recursive)
   */
  static async remove(targetPath: string): Promise<void> {
    await FileSystemPlugin.remove({ path: targetPath });
  }

  /**
   * Create directory (recursive)
   */
  static async mkdir(targetPath: string): Promise<void> {
    await FileSystemPlugin.mkdir({ path: targetPath });
  }

  /**
   * Check existence
   */
  static async exists(targetPath: string): Promise<boolean> {
    const result = await FileSystemPlugin.exists({ path: targetPath });
    return result.exists;
  }
}
