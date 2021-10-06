import { TSdPublishConfig } from "../commons";
import * as path from "path";
import { StringUtil } from "@simplysm/sd-core-common";
import { FsUtil, PathUtil } from "@simplysm/sd-core-node";
import { SdFtpStorage, SdSFtpStorage } from "@simplysm/sd-storage";

export class SdCliPublisher {
  public constructor(private readonly _config: TSdPublishConfig,
                     private readonly _distPath: string,
                     private readonly _version?: string) {
  }

  public async runAsync(): Promise<void> {
    if (this._config.type === "sftp") {
      const publishConfig = this._config;
      const sftp = new SdSFtpStorage();
      await sftp.connectAsync({
        host: publishConfig.host,
        port: publishConfig.port,
        username: publishConfig.username,
        password: publishConfig.password
      });

      try {
        // 결과 파일 업로드
        await sftp.uploadDirAsync(this._distPath, publishConfig.path);
        await sftp.closeAsync();
      }
      catch (err) {
        try {
          await sftp.closeAsync();
        }
        catch {
        }
        throw err;
      }
    }
    else if (this._config.type === "local-directory") {
      const targetRootPath = this._config.path.replace(/%([^%]*)%/g, (item) => {
        const envName = item.replace(/%/g, "");
        if (!StringUtil.isNullOrEmpty(this._version) && envName === "SD_VERSION") {
          return this._version;
        }
        return process.env[envName] ?? item;
      });

      const filePaths = await FsUtil.globAsync(path.resolve(this._distPath, "**", "*"), { dot: true, nodir: true });

      await filePaths.parallelAsync(async (filePath) => {
        const relativeFilePath = path.relative(this._distPath, filePath);
        const targetPath = PathUtil.posix(targetRootPath, relativeFilePath);

        await FsUtil.copyAsync(filePath, targetPath);
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    else if (this._config.type === "ftp") {
      const publishConfig = this._config;
      const ftp = new SdFtpStorage();
      await ftp.connectAsync({
        host: publishConfig.host,
        port: publishConfig.port,
        username: publishConfig.username,
        password: publishConfig.password
      });

      try {
        // 결과 파일 업로드
        await ftp.uploadDirAsync(this._distPath, publishConfig.path);

        await ftp.closeAsync();
      }
      catch (err) {
        try {
          await ftp.closeAsync();
        }
        catch {
        }
        throw err;
      }
    }
  }
}
