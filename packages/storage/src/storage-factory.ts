import type { StorageConnConfig } from "./types/storage-conn-config";
import type { Storage } from "./types/storage";
import { FtpStorageClient } from "./clients/ftp-storage-client";
import { SftpStorageClient } from "./clients/sftp-storage-client";

export type StorageType = "ftp" | "ftps" | "sftp";

export class StorageFactory {
  static async connect<R>(
    type: StorageType,
    config: StorageConnConfig,
    fn: (storage: Storage) => Promise<R>,
  ): Promise<R> {
    const client = StorageFactory._createClient(type);

    await client.connect(config);
    try {
      return await fn(client);
    } finally {
      await client.close().catch(() => {
        // 이미 닫힌 경우 무시
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
