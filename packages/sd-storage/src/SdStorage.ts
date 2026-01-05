import type { ISdStorageConnConf } from "./ISdStorageConnConf";
import { SdSftpStorage } from "./storages/SdSftpStorage";
import { SdFtpStorage } from "./storages/SdFtpStorage";
import { Wait } from "@simplysm/sd-core-common";

export class SdStorage {
  // 여러 storage만들었다가,
  // 하나 닫으면,
  // 아직 작업중인 다른 storage까지 닫혀버리는 현상이 있어서,
  // busyCount를 추가,
  // 모든 storage가 끝나야 모든 storage에 close명령을 내리도록 함
  static busyCount = 0;

  static async connectAsync<T extends "sftp" | "ftp" | "ftps", R>(
    type: T,
    conf: ISdStorageConnConf,
    fn: (storage: T extends "sftp" ? SdSftpStorage : SdFtpStorage) => Promise<R>,
  ): Promise<R> {
    const storage =
      type === "sftp"
        ? new SdSftpStorage()
        : type === "ftps"
          ? new SdFtpStorage(true)
          : new SdFtpStorage(false);

    try {
      await storage.connectAsync(conf);

      this.busyCount++;
      const result = await fn(storage as any);
      this.busyCount--;

      await Wait.until(() => this.busyCount === 0);
      await storage.closeAsync().catch(() => {}); // 이미 닫힌경우 무시

      return result;
    } catch (err) {
      await storage.closeAsync().catch(() => {}); // 이미 닫힌경우 무시
      throw err;
    }
  }
}
