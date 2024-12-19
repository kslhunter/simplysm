import {type ISdStorage, type ISdStorageConnectionConfig} from "./commons";
import {SdSFtpStorage} from "./storages/SdSFtpStorage";
import {SdFtpStorage} from "./storages/SdFtpStorage";

export class SdStorage {
  public static async connectAsync(type: "sftp" | "ftp" | "ftps", conf: ISdStorageConnectionConfig): Promise<ISdStorage> {
    const storage: ISdStorage = type === "sftp" ? new SdSFtpStorage()
      : type === "ftps" ? new SdFtpStorage(true)
        : new SdFtpStorage(false);

    await storage.connectAsync(conf);

    return storage;
  }
}