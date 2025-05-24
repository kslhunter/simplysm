/// <reference types="@simplysm/types-cordova-plugin-ionic-webview"/>

import { CordovaFileSystem } from "@simplysm/cordova-plugin-file-system";
import { html, NetUtils, Wait } from "@simplysm/sd-core-common";
import { SdAutoUpdateServiceClient, SdServiceClient } from "@simplysm/sd-service-client";
import path from "path";
import semver from "semver";
import { CordovaApkInstaller } from "./cordova-apk-installer";

export abstract class CordovaAutoUpdate {
  private static async _checkPermissionAsync(log: (messageHtml: string) => void) {
    log(`권한 확인 중...`);

    if (!navigator.userAgent.toLowerCase().includes("android")) {
      throw new Error(`안드로이드만 지원합니다.`);
    }

    const hasPerm = await CordovaApkInstaller.hasPermission();
    if (!hasPerm) {
      log(html`
        설치권한이 설정되어야합니다.
        <br />
        <br />
        <button
          onclick="location.reload()"
          style="all: unset; color: blue; text-decoration: underline;"
        >
          재시도
        </button>
      `);
      await CordovaApkInstaller.requestPermission();
      await Wait.until(async () => {
        return await CordovaApkInstaller.hasPermission();
      }, 1000);
    }
  }

  private static async _installApkAsync(log: (messageHtml: string) => void, apkFilePath: string) {
    log(html`
      최신버전을 설치한 후 재시작하세요.
      <br />
      <br />
      <button
        onclick="location.reload()"
        style="all: unset; color: blue; text-decoration: underline;"
      >
        재시도
      </button>
      &nbsp;&nbsp;
      <button
        onclick="navigator.app.exitApp();"
        style="all: unset; color: blue; text-decoration: underline;"
      >
        종료
      </button>
    `);
    const apkFileUri = await CordovaFileSystem.getFileUriAsync(apkFilePath);
    await CordovaApkInstaller.install(apkFileUri);
    return false;
  }

  private static _getErrorMessage(err: any) {
    return html`
      업데이트 중 오류 발생: ${err instanceof Error ? err.message : String(err)}
      <br />
      <br />
      <button
        onclick="location.reload()"
        style="all: unset; color: blue; text-decoration: underline;"
      >
        재시도
      </button>
    `;
  }

  static async runAsync(opt: {
    log: (messageHtml: string) => void;
    serviceClient: SdServiceClient;
  }) {
    try {
      await this._checkPermissionAsync(opt.log);

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

      await this._installApkAsync(opt.log, apkFilePath);
      return false;
    } catch (err) {
      opt.log(this._getErrorMessage(err));
      throw err;
    }
  }

  static async runByExternalStorageAsync(opt: {
    log: (messageHtml: string) => void;
    dirPath: string;
  }) {
    try {
      await this._checkPermissionAsync(opt.log);

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

      const apkFilePath = path.join(externalPath, opt.dirPath, latestVersion + ".apk");
      await this._installApkAsync(opt.log, apkFilePath);
      return false;
    } catch (err) {
      opt.log(this._getErrorMessage(err));
      throw err;
    }
  }
}
