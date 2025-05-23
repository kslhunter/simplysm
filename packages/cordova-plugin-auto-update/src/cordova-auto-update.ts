/// <reference types="@simplysm/types-cordova-plugin-ionic-webview"/>

import { CordovaFileSystem } from "@simplysm/cordova-plugin-file-system";
import { NetUtils } from "@simplysm/sd-core-common";
import { SdAutoUpdateServiceClient, SdServiceClient } from "@simplysm/sd-service-client";
import path from "path";
import semver from "semver";

export abstract class CordovaAutoUpdate {
  private static async _ensureCanInstallApk(): Promise<boolean> {
    return await new Promise((resolve) => {
      cordova.exec(
        (result: string) => resolve(result === "true"),
        () => resolve(false),
        "ApkInstaller",
        "canRequestPackageInstalls",
        [],
      );
    });
  }

  private static async _openUnknownSourceSettings(): Promise<void> {
    return await new Promise((resolve, reject) => {
      cordova.exec(resolve, reject, "ApkInstaller", "openUnknownAppSourcesSettings", []);
    });
  }

  private static async _installApkFromPath(apkPath: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      cordova.exec(resolve, reject, "ApkInstaller", "installApk", [apkPath]);
    });
  }

  private static async _requestPermission() {
    const canInstall = await this._ensureCanInstallApk();
    if (canInstall) return true;

    await this._openUnknownSourceSettings();
    return false;
  }

  static async runAsync(opt: {
    log: (messageHtml: string) => void;
    serviceClient: SdServiceClient;
  }) {
    try {
      opt.log(`권한 확인 중...`);

      if (!navigator.userAgent.toLowerCase().includes("android")) {
        throw new Error("안드로이드만 지원합니다.");
      }

      const hasPerm = await this._requestPermission();
      if (!hasPerm) {
        return false;
      }

      opt.log(`최신버전 확인 중...`);

      // 서버의 버전 및 다운로드링크 가져오기
      const autoUpdateServiceClient = new SdAutoUpdateServiceClient(opt.serviceClient);

      const serverVersionInfo = await autoUpdateServiceClient.getLastVersion("android");
      if (!serverVersionInfo) {
        throw new Error("서버에서 최신버전 정보를 가져오지 못했습니다.");
      }

      // 최신버전이면 반환
      if (process.env["SD_VERSION"] === serverVersionInfo.version) {
        return true;
      }

      opt.log(`최신버전 파일 다운로드중...`);
      const buffer = await NetUtils.downloadBufferAsync(
        opt.serviceClient.serverUrl + serverVersionInfo.downloadPath,
        (progress) => {
          const progressText = ((progress.receivedLength * 100) / progress.contentLength).toFixed(
            2,
          );
          opt.log(`최신버전 파일 다운로드중...(${progressText}%)`);
        },
      );
      const storagePath = await CordovaFileSystem.getStoragePathAsync("appCache");
      const apkFilePath = path.join(storagePath, `latest.apk`);
      await CordovaFileSystem.writeFileAsync(apkFilePath, buffer);

      opt.log(`최신버전을 설치한 후 재시작하세요.`);
      await this._installApkFromPath(apkFilePath);
      return false;
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

      // 최신버전이면 반환
      if (process.env["SD_VERSION"] === latestVersion) {
        return true;
      }

      opt.log(`최신버전을 설치한 후 재시작하세요.`);
      await this._installApkFromPath(path.join(externalPath, opt.dirPath, latestVersion + ".apk"));
      return false;
    } catch (err) {
      opt.log(`업데이트 중 오류 발생: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }
}
