import {type ISdStorage, type ISdStorageConnectionConfig} from "./interfaces";
import {SdSftpStorage} from "./storages/sd-sftp.storage";
import {SdFtpStorage} from "./storages/sd-ftp.storage";

export class SdStorage {
  public static async connectAsync(type: "sftp" | "ftp" | "ftps", conf: ISdStorageConnectionConfig): Promise<ISdStorage> {
    const storage: ISdStorage = type === "sftp" ? new SdSftpStorage()
      : type === "ftps" ? new SdFtpStorage(true)
        : new SdFtpStorage(false);

    await storage.connectAsync(conf);

    return storage;
  }
}