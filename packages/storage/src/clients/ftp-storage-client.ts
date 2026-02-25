import type { Bytes } from "@simplysm/core-common";
import { bytesConcat, SdError } from "@simplysm/core-common";
import ftp from "basic-ftp";
import { PassThrough, Readable } from "stream";
import type { Storage, FileInfo } from "../types/storage";
import type { StorageConnConfig } from "../types/storage-conn-config";

/**
 * Storage client using FTP/FTPS protocol.
 *
 * @remarks
 * The `secure` constructor parameter configures whether to use FTPS.
 * Using {@link StorageFactory.connect} is recommended over direct usage.
 */
export class FtpStorageClient implements Storage {
  private _client: ftp.Client | undefined;

  constructor(private readonly _secure: boolean = false) {}

  /**
   * Connect to the FTP server.
   *
   * @remarks
   * - Must close the connection with {@link close} after use.
   * - Do not call multiple times on the same instance (connection leak).
   * - Use {@link StorageFactory.connect} for automatic connection/close management (recommended).
   */
  async connect(config: StorageConnConfig): Promise<void> {
    if (this._client !== undefined) {
      throw new SdError("FTP server is already connected. Please call close() first.");
    }
    const client = new ftp.Client();
    try {
      await client.access({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.pass,
        secure: this._secure,
      });
      this._client = client;
    } catch (err) {
      client.close();
      throw err;
    }
  }

  private _requireClient(): ftp.Client {
    if (this._client === undefined) {
      throw new SdError("Not connected to FTP server.");
    }
    return this._client;
  }

  /** Create a directory. Creates parent directories if they do not exist. */
  async mkdir(dirPath: string): Promise<void> {
    await this._requireClient().ensureDir(dirPath);
  }

  async rename(fromPath: string, toPath: string): Promise<void> {
    await this._requireClient().rename(fromPath, toPath);
  }

  async readdir(dirPath: string): Promise<FileInfo[]> {
    const fileInfos = await this._requireClient().list(dirPath);
    return fileInfos.map((item) => ({ name: item.name, isFile: item.isFile }));
  }

  async readFile(filePath: string): Promise<Bytes> {
    const client = this._requireClient();
    const chunks: Bytes[] = [];
    const writable = new PassThrough();
    writable.on("data", (chunk: Uint8Array) => {
      chunks.push(chunk);
    });
    await client.downloadTo(writable, filePath);
    return bytesConcat(chunks);
  }

  /**
   * Check whether a file or directory exists.
   *
   * @remarks
   * For files, uses the size() command for O(1) performance.
   * For directories, queries the parent directory listing, so performance may degrade with many entries.
   *
   * Paths without slashes (e.g. `file.txt`) are searched in the root directory (`/`).
   *
   * Returns false even if the parent directory does not exist.
   * Returns false for all exceptions including network errors and permission errors.
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      // Quick check for files via size() (O(1))
      await this._requireClient().size(filePath);
      return true;
    } catch {
      // If size() fails, it may be a directory, so check via list()
      try {
        const lastSlash = filePath.lastIndexOf("/");
        const dirPath = lastSlash > 0 ? filePath.substring(0, lastSlash) : "/";
        const fileName = filePath.substring(lastSlash + 1);
        const list = await this._requireClient().list(dirPath);
        return list.some((item) => item.name === fileName);
      } catch {
        return false;
      }
    }
  }

  async remove(filePath: string): Promise<void> {
    await this._requireClient().remove(filePath);
  }

  /** Upload a local file path or byte data to the remote path. */
  async put(localPathOrBuffer: string | Bytes, storageFilePath: string): Promise<void> {
    let param: string | Readable;
    if (typeof localPathOrBuffer === "string") {
      param = localPathOrBuffer;
    } else {
      param = Readable.from(localPathOrBuffer);
    }
    await this._requireClient().uploadFrom(param, storageFilePath);
  }

  async uploadDir(fromPath: string, toPath: string): Promise<void> {
    await this._requireClient().uploadFromDir(fromPath, toPath);
  }

  /**
   * Close the connection.
   *
   * @remarks
   * Safe to call when already closed (no error thrown).
   * After closing, you can reconnect by calling {@link connect} again on the same instance.
   */
  close(): Promise<void> {
    if (this._client === undefined) {
      return Promise.resolve();
    }

    this._client.close();
    this._client = undefined;
    return Promise.resolve();
  }
}
