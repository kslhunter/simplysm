import { registerPlugin } from "@capacitor/core";
import type { FileInfo, FileSystemPlugin, StorageType } from "./FileSystemPlugin";
import type { Bytes } from "@simplysm/core-common";
import { bytes } from "@simplysm/core-common";

const fileSystemPlugin = registerPlugin<FileSystemPlugin>("FileSystem", {
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
  static async checkPermissions(): Promise<boolean> {
    const result = await fileSystemPlugin.checkPermissions();
    return result.granted;
  }

  /**
   * Request permission
   * - Android 11+: Navigate to settings
   * - Android 10-: Show permission dialog
   */
  static async requestPermissions(): Promise<void> {
    await fileSystemPlugin.requestPermissions();
  }

  /**
   * Read directory
   */
  static async readdir(dirPath: string): Promise<FileInfo[]> {
    const result = await fileSystemPlugin.readdir({ path: dirPath });
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
  static async getStoragePath(type: StorageType): Promise<string> {
    const result = await fileSystemPlugin.getStoragePath({ type });
    return result.path;
  }

  /**
   * Get file URI (FileProvider)
   */
  static async getUri(filePath: string): Promise<string> {
    const result = await fileSystemPlugin.getUri({ path: filePath });
    return result.uri;
  }

  /**
   * Write file
   */
  static async writeFile(filePath: string, data: string | Bytes): Promise<void> {
    if (typeof data !== "string") {
      // Bytes (Uint8Array) - works safely in cross-realm environments
      await fileSystemPlugin.writeFile({
        path: filePath,
        data: bytes.toBase64(data),
        encoding: "base64",
      });
    } else {
      await fileSystemPlugin.writeFile({
        path: filePath,
        data,
        encoding: "utf8",
      });
    }
  }

  /**
   * Read file (default: Bytes, with encoding "utf8": string)
   */
  static async readFile(filePath: string): Promise<Bytes>;
  static async readFile(filePath: string, encoding: "utf8"): Promise<string>;
  static async readFile(filePath: string, encoding?: "utf8"): Promise<string | Bytes> {
    if (encoding === "utf8") {
      const result = await fileSystemPlugin.readFile({ path: filePath, encoding: "utf8" });
      return result.data;
    } else {
      const result = await fileSystemPlugin.readFile({ path: filePath, encoding: "base64" });
      return bytes.fromBase64(result.data);
    }
  }

  /**
   * Delete file/directory (recursive)
   */
  static async remove(targetPath: string): Promise<void> {
    await fileSystemPlugin.remove({ path: targetPath });
  }

  /**
   * Create directory (recursive)
   */
  static async mkdir(targetPath: string): Promise<void> {
    await fileSystemPlugin.mkdir({ path: targetPath });
  }

  /**
   * Check existence
   */
  static async exists(targetPath: string): Promise<boolean> {
    const result = await fileSystemPlugin.exists({ path: targetPath });
    return result.exists;
  }
}
