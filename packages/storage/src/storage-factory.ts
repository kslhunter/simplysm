import type { StorageConnConfig } from "./types/storage-conn-config";
import type { Storage } from "./types/storage";
import type { StorageType } from "./types/storage-type";
import { FtpStorageClient } from "./clients/ftp-storage-client";
import { SftpStorageClient } from "./clients/sftp-storage-client";

/**
 * 스토리지 클라이언트 팩토리
 *
 * FTP, FTPS, SFTP 스토리지 연결을 생성하고 관리한다.
 */
export class StorageFactory {
  /**
   * 스토리지에 연결하고 콜백을 실행한 후 자동으로 연결을 종료한다.
   *
   * @remarks
   * 콜백 패턴으로 연결/종료가 자동 관리되므로, 직접 클라이언트를 사용하는 것보다 권장된다.
   * 콜백에서 예외가 발생해도 연결은 자동으로 종료된다.
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
