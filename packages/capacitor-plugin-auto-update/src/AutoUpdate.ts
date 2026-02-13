import { FileSystem } from "@simplysm/capacitor-plugin-file-system";
import { html, waitUntil, pathJoin, pathBasename, pathExtname } from "@simplysm/core-common";
import { fetchUrlBytes } from "@simplysm/core-browser";
import type { ServiceClient } from "@simplysm/service-client";
import type { AutoUpdateService } from "@simplysm/service-common";
import semver from "semver";
import { ApkInstaller } from "./ApkInstaller";

export abstract class AutoUpdate {
  private static readonly _BUTTON_CSS = `
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
  `;

  private static readonly _BUTTON_ACTIVE_CSS = `
    background: lightgrey;
  `;

  private static _throwAboutReinstall(code: number, targetHref?: string) {
    const downloadHtml =
      targetHref != null
        ? html`
            <style>
              ._button { ${this._BUTTON_CSS} }
              ._button:active { ${this._BUTTON_ACTIVE_CSS} }
            </style>
            <a class="_button" href="intent://${targetHref.replace(/^https?:\/\//, "")}#Intent;scheme=http;end">
              다운로드
            </a>
          `
        : "";

    throw new Error(html`
      APK파일을 다시 다운로드 받아, 설치해야 합니다(${code}). ${downloadHtml}
    `);
  }

  private static async _checkPermission(log: (messageHtml: string) => void, targetHref?: string) {
    if (!navigator.userAgent.toLowerCase().includes("android")) {
      throw new Error("안드로이드만 지원합니다.");
    }

    try {
      if (!(await ApkInstaller.hasPermissionManifest())) {
        this._throwAboutReinstall(1, targetHref);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[AutoUpdate] hasPermissionManifest 체크 실패:", err);
      this._throwAboutReinstall(2, targetHref);
    }

    const hasPerm = await ApkInstaller.hasPermission();
    if (!hasPerm) {
      log(html`
        설치권한이 설정되어야합니다.
        <style>
          button { ${this._BUTTON_CSS} }
          button:active { ${this._BUTTON_ACTIVE_CSS} }
        </style>
        <button onclick="location.reload()">재시도</button>
      `);
      await ApkInstaller.requestPermission();
      // 최대 5분(300초) 대기 - 사용자가 설정 화면에서 권한을 승인할 시간
      await waitUntil(
        async () => {
          return ApkInstaller.hasPermission();
        },
        1000,
        300,
      );
    }
  }

  private static async _installApk(log: (messageHtml: string) => void, apkFilePath: string): Promise<void> {
    log(html`
      최신버전을 설치한 후 재시작하세요.
      <style>
        button { ${this._BUTTON_CSS} }
        button:active { ${this._BUTTON_ACTIVE_CSS} }
      </style>
      <button onclick="location.reload()">재시도</button>
    `);
    const apkFileUri = await FileSystem.getFileUri(apkFilePath);
    await ApkInstaller.install(apkFileUri);
  }

  private static _getErrorMessage(err: unknown) {
    return html`
      업데이트 중 오류 발생:
      <br />
      ${err instanceof Error ? err.message : String(err)}
    `;
  }

  private static async _freezeApp() {
    await new Promise(() => {}); // 무한대기
  }

  static async run(opt: { log: (messageHtml: string) => void; serviceClient: ServiceClient }) {
    try {
      opt.log(`최신버전 확인 중...`);

      // 서버의 버전 및 다운로드링크 가져오기
      const autoUpdateServiceClient = opt.serviceClient.getService<AutoUpdateService>("AutoUpdateService");

      const serverVersionInfo = await autoUpdateServiceClient.getLastVersion("android");
      if (!serverVersionInfo) {
        // eslint-disable-next-line no-console
        console.log("서버에서 최신버전 정보를 가져오지 못했습니다.");
        return;
      }

      opt.log(`권한 확인 중...`);
      await this._checkPermission(opt.log, opt.serviceClient.hostUrl + serverVersionInfo.downloadPath);

      // 현재 앱 버전 가져오기
      const currentVersionInfo = await ApkInstaller.getVersionInfo();

      // 최신버전이거나 서버 버전이 낮으면 반환
      if (semver.valid(currentVersionInfo.versionName) === null || semver.valid(serverVersionInfo.version) === null) {
        // eslint-disable-next-line no-console
        console.log("Invalid semver version, skipping update check");
        return;
      }
      if (!semver.gt(serverVersionInfo.version, currentVersionInfo.versionName)) {
        return;
      }

      opt.log(`최신버전 파일 다운로드중...`);
      const buffer = await fetchUrlBytes(opt.serviceClient.hostUrl + serverVersionInfo.downloadPath, {
        onProgress: (progress) => {
          const progressText = ((progress.receivedLength * 100) / progress.contentLength).toFixed(2);
          opt.log(`최신버전 파일 다운로드중...(${progressText}%)`);
        },
      });
      const storagePath = await FileSystem.getStoragePath("appCache");
      const apkFilePath = pathJoin(storagePath, `latest.apk`);
      await FileSystem.writeFile(apkFilePath, buffer);

      await this._installApk(opt.log, apkFilePath);
      await this._freezeApp();
    } catch (err) {
      opt.log(this._getErrorMessage(err));
      await this._freezeApp();
    }
  }

  static async runByExternalStorage(opt: { log: (messageHtml: string) => void; dirPath: string }) {
    try {
      opt.log(`권한 확인 중...`);
      await this._checkPermission(opt.log);

      opt.log(`최신버전 확인 중...`);

      // 버전 가져오기
      const externalPath = await FileSystem.getStoragePath("external");
      const fileInfos = await FileSystem.readdir(pathJoin(externalPath, opt.dirPath));

      const versions = fileInfos
        .filter((fileInfo) => !fileInfo.isDirectory)
        .map((fileInfo) => ({
          fileName: fileInfo.name,
          version: pathBasename(fileInfo.name, pathExtname(fileInfo.name)),
          extName: pathExtname(fileInfo.name),
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

      // 유효한 semver 버전이 없으면 반환
      if (latestVersion == null) {
        // eslint-disable-next-line no-console
        console.log("유효한 semver 버전 파일이 없습니다.");
        return;
      }

      // 현재 앱 버전 가져오기
      const currentVersionInfo = await ApkInstaller.getVersionInfo();

      // 최신버전이거나 외부 저장소 버전이 낮으면 반환
      if (semver.valid(currentVersionInfo.versionName) === null || semver.valid(latestVersion) === null) {
        // eslint-disable-next-line no-console
        console.log("Invalid semver version, skipping update check");
        return;
      }
      if (!semver.gt(latestVersion, currentVersionInfo.versionName)) {
        return;
      }

      const apkFilePath = pathJoin(externalPath, opt.dirPath, latestVersion + ".apk");
      await this._installApk(opt.log, apkFilePath);
      await this._freezeApp();
    } catch (err) {
      opt.log(this._getErrorMessage(err));
      await this._freezeApp();
    }
  }
}
