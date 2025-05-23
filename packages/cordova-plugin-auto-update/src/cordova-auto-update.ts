/// <reference types="@simplysm/types-cordova-plugin-ionic-webview"/>

import { CordovaFileSystem } from "@simplysm/cordova-plugin-file-system";
import { NetUtils } from "@simplysm/sd-core-common";
import { SdAutoUpdateServiceClient, SdServiceClient } from "@simplysm/sd-service-client";
import path from "path";
import semver from "semver";
import { WebIntent } from "@awesome-cordova-plugins/web-intent";

export abstract class CordovaAutoUpdate {
  static async runAsync(opt: {
    log: (messageHtml: string) => void;
    serviceClient: SdServiceClient;
  }) {
    try {
      if (!navigator.userAgent.toLowerCase().includes("android")) {
        throw new Error("안드로이드만 지원합니다.");
      }

      opt.log(`최신버전 확인 중...`);

      // 서버의 버전 및 다운로드링크 가져오기
      const autoUpdateServiceClient = new SdAutoUpdateServiceClient(opt.serviceClient);

      const serverVersionInfo = await autoUpdateServiceClient.getLastVersion("android");
      if (!serverVersionInfo) {
        throw new Error("서버에서 최신버전 정보를 가져오지 못했습니다.");
      }

      return await this._runAsync({
        log: opt.log,
        latestVersion: serverVersionInfo.version,
        getApkBufferAsync: async () => {
          return await NetUtils.downloadBufferAsync(
            opt.serviceClient.serverUrl + serverVersionInfo.downloadPath,
            (progress) => {
              const progressText = (
                (progress.receivedLength * 100) /
                progress.contentLength
              ).toFixed(2);
              opt.log(`최신버전 파일 다운로드중...(${progressText}%)`);
            },
          );
        },
      });
    } catch (err) {
      opt.log(`업데이트 중 오류 발생: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }

  static async runByExternalStorageAsync(opt: {
    log: (messageHtml: string) => void;
    dirPath: string;
  }) {
    try {
      if (!navigator.userAgent.toLowerCase().includes("android")) {
        throw new Error("안드로이드만 지원합니다.");
      }

      opt.log(`최신버전 확인 중...`);

      // 버전 가져오기
      const externalPath = await CordovaFileSystem.getStoragePathAsync("external");
      const fileInfos = await CordovaFileSystem.readdirAsync(path.join(externalPath, opt.dirPath));

      const versions = fileInfos
        .filter((fileInfo) => !fileInfo.isDirectory)
        .map((fileInfo) => ({
          fileName: fileInfo.name,
          version: path.basename(fileInfo.name, path.extname(fileInfo.name)),
          extName: path.extname(fileInfo.name),
        }))
        .filter((item) => {
          return item.extName === ".apk" && /^[0-9.]*$/.test(item.version);
        });
      const latestVersion = semver.maxSatisfying(
        versions.map((item) => item.version),
        "*",
      )!;

      return await this._runAsync({
        log: opt.log,
        latestVersion: latestVersion,
        getApkBufferAsync: async () => {
          return await CordovaFileSystem.readFileBufferAsync(
            path.join(externalPath, opt.dirPath, latestVersion + ".apk"),
          );
        },
      });
    } catch (err) {
      opt.log(`업데이트 중 오류 발생: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }

  // 파일복사 방식은 플러그인의 변경이 업데이트되지 않는 문제로 APK 설치방식으로 변경함
  private static async _runAsync(opt: {
    log: (messageHtml: string) => void;
    latestVersion: string;
    getApkBufferAsync: () => Promise<Buffer>;
  }) {
    // 서버와 로컬의 버전이 다르면,
    if (process.env["SD_VERSION"] !== opt.latestVersion) {
      opt.log(`최신버전 파일 다운로드중...`);
      const buffer = await opt.getApkBufferAsync();
      const externalPath = await CordovaFileSystem.getStoragePathAsync("externalCache");
      const apkFilePath = path.join(externalPath, `latest.apk`);
      await CordovaFileSystem.writeFileAsync(apkFilePath, buffer);

      opt.log(`최신버전 설치파일 실행중...`);
      const externalUrl = await CordovaFileSystem.getStorageUrlAsync("externalCache");
      const contentUrl = `${externalUrl}latest.apk`;

      console.log(apkFilePath, contentUrl);
      const FLAG_ACTIVITY_NEW_TASK = 0x10000000;
      const FLAG_GRANT_READ_URI_PERMISSION = 0x00000001;
      await WebIntent.startActivity({
        action: WebIntent.ACTION_VIEW,
        url: contentUrl,
        type: "application/vnd.android.package-archive",
        flags: [FLAG_ACTIVITY_NEW_TASK, FLAG_GRANT_READ_URI_PERMISSION],
      });
      return false;
    }

    opt.log(`최신버전 실행중...`);
    return true;
  }
}
