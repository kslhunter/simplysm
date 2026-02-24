import type { StorageConnConfig } from "./types/storage-conn-config";
import type { Storage } from "./types/storage";
import type { StorageType } from "./types/storage-type";
import { FtpStorageClient } from "./clients/ftp-storage-client";
import { SftpStorageClient } from "./clients/sftp-storage-client";

/**
 * Storage client factory
 *
 * Creates and manages FTP, FTPS, and SFTP storage connections.
 */
export class StorageFactory {
  /**
   * Connect to storage, execute the callback, and automatically close the connection.
   *
   * @remarks
   * The callback pattern auto-manages connection/close, so this is preferred over direct client usage.
   * The connection is automatically closed even if the callback throws an exception.
   */
  static async connect<R>(
    type: StorageType,
    config: StorageConnConfig,
    fn: (storage: Storage) => R | Promise<R>,
  ): Promise<R> {
    const client = StorageFactory._createClient(type);

    await client.connect(config);
    try {
      return await fn(client);
    } finally {
      await client.close().catch(() => {
        // Ignore if already closed
      });
    }
  }

  private static _createClient(type: StorageType): Storage {
    switch (type) {
      case "sftp":
        return new SftpStorageClient();
      case "ftps":
        return new FtpStorageClient(true);
      case "ftp":
        return new FtpStorageClient(false);
    }
  }
}
