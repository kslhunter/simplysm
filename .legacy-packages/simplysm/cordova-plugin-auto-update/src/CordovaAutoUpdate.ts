import { CordovaFileSystem } from "@simplysm/cordova-plugin-file-system";
import { html, NetUtils, Wait } from "@simplysm/sd-core-common";
import type { SdServiceClient } from "@simplysm/sd-service-client";
import path from "path";
import semver from "semver";
import { CordovaApkInstaller } from "./CordovaApkInstaller";
import type { ISdAutoUpdateService } from "@simplysm/sd-service-common";

export abstract class CordovaAutoUpdate {
  private static _throwAboutReinstall(code: number, targetHref?: string) {
    const downloadHtml =
      targetHref != null
        ? html`
            <style>
              ._button {
                all: unset;
                color: blue;
                width: 100%;
                padding: 10px;
                line-height: 1.5em;
                font-size: 20px;
                position: fixed;
                bottom: 0;
                left: 0;
                border-top: 1px solid lightgrey;
              }

              ._button:active {
                background: lightgrey;
              }
            </style>
            <a
              class="_button"
              href="intent://${targetHref.replace(/^https?:\/\//, "")}#Intent;scheme=http;end"
            >
              다운로드
            </a>
          `
        : "";

    throw new Error(html`
      APK파일을 다시 다운로드 받아, 설치해야 합니다(${code}). ${downloadHtml}
    `);
  }

  private static async _checkPermissionAsync(
    log: (messageHtml: string) => void,
    targetHref?: string,
  ) {
    if (!navigator.userAgent.toLowerCase().includes("android")) {
      throw new Error(`안드로이드만 지원합니다.`);
    }

    try {
      if (!(await CordovaApkInstaller.hasPermissionManifest())) {
        this._throwAboutReinstall(1, targetHref);
      }
    } catch {
      this._throwAboutReinstall(2, targetHref);
    }

    const hasPerm = await CordovaApkInstaller.hasPermission();
    if (!hasPerm) {
      log(html`
        설치권한이 설정되어야합니다.
        <style>
          button {
            all: unset;
            color: blue;
            width: 100%;
            padding: 10px;
            line-height: 1.5em;
            font-size: 20px;
            position: fixed;
            bottom: 0;
            left: 0;
            border-top: 1px solid lightgrey;
          }

          button:active {
            background: lightgrey;
          }
        </style>
        <button onclick="location.reload()">재시도</button>
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
      <style>
        button {
          all: unset;
          color: blue;
          width: 100%;
          padding: 10px;
          line-height: 1.5em;
          font-size: 20px;
          position: fixed;
          bottom: 0;
          left: 0;
          border-top: 1px solid lightgrey;
        }

        button:active {
          background: lightgrey;
        }
      </style>
      <button onclick="location.reload()">재시도</button>
    `);
    const apkFileUri = await CordovaFileSystem.getFileUriAsync(apkFilePath);
    await CordovaApkInstaller.install(apkFileUri);
    return false;
  }

  private static _getErrorMessage(err: any) {
    return html`
      업데이트 중 오류 발생:
      <br />
      ${err instanceof Error ? err.message : String(err)}
    `;
  }

  private static async _freezeApp() {
    await new Promise(() => {}); // 무한대기
  }

  static async runAsync(opt: {
    log: (messageHtml: string) => void;
    serviceClient: SdServiceClient;
  }) {
    try {
      opt.log(`최신버전 확인 중...`);

      // 서버의 버전 및 다운로드링크 가져오기
      const autoUpdateServiceClient =
        opt.serviceClient.getService<ISdAutoUpdateService>("SdAutoUpdateService");

      const serverVersionInfo = await autoUpdateServiceClient.getLastVersion("android");
      if (!serverVersionInfo) {
        throw new Error("서버에서 최신버전 정보를 가져오지 못했습니다.");
      }

      opt.log(`권한 확인 중...`);
      await this._checkPermissionAsync(
        opt.log,
        opt.serviceClient.hostUrl + serverVersionInfo.downloadPath,
      );

      // 최신버전이면 반환
      // const currAppVersionInfo = await CordovaApkInstaller.getVersionInfo();
      // if (currAppVersionInfo.versionName === serverVersionInfo.version) {
      if (process.env["SD_VERSION"] === serverVersionInfo.version) {
        return;
      }

      opt.log(`최신버전 파일 다운로드중...`);
      const buffer = await NetUtils.downloadBufferAsync(
        opt.serviceClient.hostUrl + serverVersionInfo.downloadPath,
        {
          progressCallback: (progress) => {
            const progressText = ((progress.receivedLength * 100) / progress.contentLength).toFixed(
              2,
            );
            opt.log(`최신버전 파일 다운로드중...(${progressText}%)`);
          },
        },
      );
      const storagePath = await CordovaFileSystem.getStoragePathAsync("appCache");
      const apkFilePath = path.join(storagePath, `latest.apk`);
      await CordovaFileSystem.writeFileAsync(apkFilePath, buffer);

      await this._installApkAsync(opt.log, apkFilePath);
      await this._freezeApp();
    } catch (err) {
      opt.log(this._getErrorMessage(err));
      await this._freezeApp();
    }
  }

  static async runByExternalStorageAsync(opt: {
    log: (messageHtml: string) => void;
    dirPath: string;
  }) {
    try {
      opt.log(`권한 확인 중...`);
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

      // 버전파일 저장된것 없으면 반환
      if (versions.length === 0) return;

      const latestVersion = semver.maxSatisfying(
        versions.map((item) => item.version),
        "*",
      )!;

      // 최신버전이면 반환
      // const currVersion = await CordovaApkInstaller.getVersionInfo();
      // if (currVersion.versionName === latestVersion) {
      if (process.env["SD_VERSION"] === latestVersion) {
        return;
      }

      const apkFilePath = path.join(externalPath, opt.dirPath, latestVersion + ".apk");
      await this._installApkAsync(opt.log, apkFilePath);
      await this._freezeApp();
    } catch (err) {
      opt.log(this._getErrorMessage(err));
      await this._freezeApp();
    }
  }
}
