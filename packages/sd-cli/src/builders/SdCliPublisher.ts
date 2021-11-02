import { ISdFtpPublishConfig, TSdPublishConfig } from "../commons";
import * as path from "path";
import { NumberUtil, StringUtil } from "@simplysm/sd-core-common";
import { FsUtil, PathUtil } from "@simplysm/sd-core-node";
import { SdFtpStorage, SdSFtpStorage } from "@simplysm/sd-storage";
import * as msRestNodeAuth from "@azure/ms-rest-nodeauth";
import { WebSiteManagementClient } from "@azure/arm-appservice";
import * as xml2js from "xml2js";
import * as URL from "url";

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
    else if (this._config.type === "ftp") {
      const publishConfig = this._config;
      const ftp = new SdFtpStorage();
      await ftp.connectAsync({
        host: publishConfig.host,
        port: publishConfig.port,
        username: publishConfig.username,
        password: publishConfig.password,
        secure: publishConfig.secure
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
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    else if (this._config.type === "azure-app-service") {
      const creds = await msRestNodeAuth.loginWithUsernamePassword(this._config.username, this._config.password);
      const client = new WebSiteManagementClient(creds, this._config.subscriptionId);

      await client.webApps.stop(this._config.resourceGroupName, this._config.serviceName);

      try {
        const webappFtpXmlStream = await client.webApps.listPublishingProfileXmlWithSecrets(this._config.resourceGroupName, this._config.serviceName, {
          format: "Ftp"
        });
        const xmlObj = await xml2js.parseStringPromise(webappFtpXmlStream.readableStreamBody!.read());
        const xmlFtpConfig = xmlObj.publishData.publishProfile.find((item: any) => item.$.publishMethod === "FTP")!.$;

        const urlObj = URL.parse(xmlFtpConfig.publishUrl, false);

        const ftpConfig: ISdFtpPublishConfig = {
          type: "ftp",
          host: urlObj.host!,
          port: NumberUtil.parseInt(urlObj.port),
          path: this._config.path.startsWith("/") ? this._config.path : path.join(urlObj.pathname ?? "", this._config.path),
          username: xmlFtpConfig.userName,
          password: xmlFtpConfig.userPWD,
          secure: true
        };

        const ftp = new SdFtpStorage();
        await ftp.connectAsync({
          host: ftpConfig.host,
          port: ftpConfig.port,
          username: ftpConfig.username,
          password: ftpConfig.password,
          secure: ftpConfig.secure
        });

        try {
          // 결과 파일 업로드
          await ftp.uploadDirAsync(this._distPath, ftpConfig.path);

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

        await client.webApps.start(this._config.resourceGroupName, this._config.serviceName);
      }
      catch (err) {
        await client.webApps.start(this._config.resourceGroupName, this._config.serviceName);
        throw err;
      }
    }
  }
}
