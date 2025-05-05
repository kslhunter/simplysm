import { ISdStorage, ISdStorageConnectionConfig } from "./interfaces";
import { SdSftpStorage } from "./storages/sd-sftp.storage";
import { SdFtpStorage } from "./storages/sd-ftp.storage";
import { Wait } from "@simplysm/sd-core-common";

export class SdStorage {
  // 여러 storage만들었다가,
  // 하나 닫으면,
  // 아직 작업중인 다른 storage까지 닫혀버리는 현상이 있어서,
  // busyCount를 추가,
  // 모든 storage가 끝나야 모든 storage에 close명령을 내리도록 함
  static busyCount = 0;

  static async connectAsync<R>(
    type: "sftp" | "ftp" | "ftps",
    conf: ISdStorageConnectionConfig,
    fn: (storage: ISdStorage) => Promise<R>,
  ): Promise<R> {
    const storage: ISdStorage = type === "sftp" ? new SdSftpStorage()
      : type === "ftps" ? new SdFtpStorage(true)
        : new SdFtpStorage(false);

    await storage.connectAsync(conf);

    this.busyCount++;
    const result = await fn(storage);
    this.busyCount--;

    await Wait.until(() => this.busyCount === 0);
    await storage.closeAsync().catch(() => {
    }); // 이미 닫힌경우 무시

    return result;
  }
}