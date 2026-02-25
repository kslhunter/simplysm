import type { Bytes } from "@simplysm/core-common";
import { SdError } from "@simplysm/core-common";
import SftpClient from "ssh2-sftp-client";
import type { Storage, FileInfo } from "../types/storage";
import type { StorageConnConfig } from "../types/storage-conn-config";

// Buffer usage from ssh2-sftp-client library type definitions
type SftpGetResult = string | NodeJS.WritableStream | Bytes;

/**
 * Storage client using SFTP protocol.
 *
 * @remarks
 * Using {@link StorageFactory.connect} is recommended over direct usage.
 */
export class SftpStorageClient implements Storage {
  private _client: SftpClient | undefined;

  /**
   * Connect to the SFTP server.
   *
   * @remarks
   * - Must close the connection with {@link close} after use.
   * - Do not call multiple times on the same instance (connection leak).
   * - Use {@link StorageFactory.connect} for automatic connection/close management (recommended).
   */
  async connect(config: StorageConnConfig): Promise<void> {
    if (this._client !== undefined) {
      throw new SdError("SFTP server is already connected. Please call close() first.");
    }

    const client = new SftpClient();
    try {
      if (config.pass != null) {
        await client.connect({
          host: config.host,
          port: config.port,
          username: config.user,
          password: config.pass,
        });
      } else {
        // Authenticate with SSH agent + key file
        const fsP = await import("fs/promises");
        const os = await import("os");
        const pathMod = await import("path");
        const keyPath = pathMod.join(os.homedir(), ".ssh", "id_ed25519");

        const baseOptions = {
          host: config.host,
          port: config.port,
          username: config.user,
          ...(process.env["SSH_AUTH_SOCK"] != null ? { agent: process.env["SSH_AUTH_SOCK"] } : {}),
        };

        try {
          await client.connect({
            ...baseOptions,
            privateKey: await fsP.readFile(keyPath),
          });
        } catch {
          // privateKey parsing failed (encrypted key, etc.) -> retry with agent only
          await client.connect(baseOptions);
        }
      }
      this._client = client;
    } catch (err) {
      await client.end();
      throw err;
    }
  }

  private _requireClient(): SftpClient {
    if (this._client === undefined) {
      throw new SdError("Not connected to SFTP server.");
    }
    return this._client;
  }

  /** Create a directory. Creates parent directories if they do not exist. */
  async mkdir(dirPath: string): Promise<void> {
    await this._requireClient().mkdir(dirPath, true);
  }

  async rename(fromPath: string, toPath: string): Promise<void> {
    await this._requireClient().rename(fromPath, toPath);
  }

  /**
   * Check whether a file or directory exists.
   *
   * @remarks
   * Returns false even if the parent directory does not exist.
   * Returns false for all exceptions including network errors and permission errors.
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      // ssh2-sftp-client's exists() returns false | 'd' | '-' | 'l'.
      // false: does not exist, 'd': directory, '-': file, 'l': symbolic link
      const result = await this._requireClient().exists(filePath);
      return typeof result === "string";
    } catch {
      return false;
    }
  }

  async readdir(dirPath: string): Promise<FileInfo[]> {
    const list = await this._requireClient().list(dirPath);
    return list.map((item) => ({
      name: item.name,
      isFile: item.type === "-",
    }));
  }

  async readFile(filePath: string): Promise<Bytes> {
    // ssh2-sftp-client's get() returns Buffer when dst is not provided.
    // Despite the type definition (string | WritableStream | Buffer), only Buffer is actually returned.
    const result = (await this._requireClient().get(filePath)) as SftpGetResult;
    if (result instanceof Uint8Array) {
      return result;
    }
    // Defensive code since string is possible per type definition
    if (typeof result === "string") {
      return new TextEncoder().encode(result);
    }
    throw new SdError("Unexpected response type.");
  }

  async remove(filePath: string): Promise<void> {
    await this._requireClient().delete(filePath);
  }

  /** Upload a local file path or byte data to the remote path. */
  async put(localPathOrBuffer: string | Bytes, storageFilePath: string): Promise<void> {
    if (typeof localPathOrBuffer === "string") {
      await this._requireClient().fastPut(localPathOrBuffer, storageFilePath);
    } else {
      // eslint-disable-next-line no-restricted-globals -- ssh2-sftp-client library requirement
      await this._requireClient().put(Buffer.from(localPathOrBuffer), storageFilePath);
    }
  }

  async uploadDir(fromPath: string, toPath: string): Promise<void> {
    await this._requireClient().uploadDir(fromPath, toPath);
  }

  /**
   * Close the connection.
   *
   * @remarks
   * Safe to call when already closed (no error thrown).
   * After closing, you can reconnect by calling {@link connect} again on the same instance.
   */
  async close(): Promise<void> {
    if (this._client === undefined) {
      return;
    }
    await this._client.end();
    this._client = undefined;
  }
}
