import { FileSystem } from "@simplysm/capacitor-plugin-file-system";
import { html, NetUtils, Wait } from "@simplysm/sd-core-common";
import semver from "semver";
import { ApkInstaller } from "./ApkInstaller.d.ts";
import path from "path";
export class AutoUpdate {
  static _throwAboutReinstall(code, targetHref) {
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
  static async _checkPermissionAsync(log, targetHref) {
    if (!navigator.userAgent.toLowerCase().includes("android")) {
      throw new Error("안드로이드만 지원합니다.");
    }
    try {
      if (!(await ApkInstaller.hasPermissionManifest())) {
        this._throwAboutReinstall(1, targetHref);
      }
    } catch {
      this._throwAboutReinstall(2, targetHref);
    }
    const hasPerm = await ApkInstaller.hasPermission();
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
      await ApkInstaller.requestPermission();
      await Wait.until(async () => {
        return await ApkInstaller.hasPermission();
      }, 1000);
    }
  }
  static async _installApkAsync(log, apkFilePath) {
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
    const apkFileUri = await FileSystem.getFileUriAsync(apkFilePath);
    await ApkInstaller.install(apkFileUri);
    return false;
  }
  static _getErrorMessage(err) {
    return html`
      업데이트 중 오류 발생:
      <br />
      ${err instanceof Error ? err.message : String(err)}
    `;
  }
  static async _freezeApp() {
    await new Promise(() => {}); // 무한대기
  }
  static async runAsync(opt) {
    try {
      opt.log(`최신버전 확인 중...`);
      // 서버의 버전 및 다운로드링크 가져오기
      const autoUpdateServiceClient = opt.serviceClient.getService("SdAutoUpdateService");
      const serverVersionInfo = await autoUpdateServiceClient.getLastVersion("android");
      if (!serverVersionInfo) {
        // throw new Error("서버에서 최신버전 정보를 가져오지 못했습니다.");
        // eslint-disable-next-line no-console
        console.log("서버에서 최신버전 정보를 가져오지 못했습니다.");
        return;
      }
      opt.log(`권한 확인 중...`);
      await this._checkPermissionAsync(
        opt.log,
        opt.serviceClient.hostUrl + serverVersionInfo.downloadPath,
      );
      // 최신버전이면 반환
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
      const storagePath = await FileSystem.getStoragePathAsync("appCache");
      const apkFilePath = path.join(storagePath, `latest.apk`);
      await FileSystem.writeFileAsync(apkFilePath, buffer);
      await this._installApkAsync(opt.log, apkFilePath);
      await this._freezeApp();
    } catch (err) {
      opt.log(this._getErrorMessage(err));
      await this._freezeApp();
    }
  }
  static async runByExternalStorageAsync(opt) {
    try {
      opt.log(`권한 확인 중...`);
      await this._checkPermissionAsync(opt.log);
      opt.log(`최신버전 확인 중...`);
      // 버전 가져오기
      const externalPath = await FileSystem.getStoragePathAsync("external");
      const fileInfos = await FileSystem.readdirAsync(path.join(externalPath, opt.dirPath));
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
      );
      // 최신버전이면 반환
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
//# sourceMappingURL=AutoUpdate.js.map
