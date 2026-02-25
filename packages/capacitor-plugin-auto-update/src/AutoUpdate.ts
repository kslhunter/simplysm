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
            <a
              class="_button"
              href="intent://${targetHref.replace(/^https?:\/\//, "")}#Intent;scheme=http;end"
            >
              Download
            </a>
          `
        : "";

    throw new Error(html`
      You need to re-download and install the APK file(${code}). ${downloadHtml}
    `);
  }

  private static async _checkPermission(log: (messageHtml: string) => void, targetHref?: string) {
    if (!navigator.userAgent.toLowerCase().includes("android")) {
      throw new Error("Only Android is supported.");
    }

    try {
      if (!(await ApkInstaller.hasPermissionManifest())) {
        this._throwAboutReinstall(1, targetHref);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[AutoUpdate] hasPermissionManifest check failed:", err);
      this._throwAboutReinstall(2, targetHref);
    }

    const hasPerm = await ApkInstaller.hasPermission();
    if (!hasPerm) {
      log(html`
        Installation permission must be enabled.
        <style>
          button { ${this._BUTTON_CSS} }
          button:active { ${this._BUTTON_ACTIVE_CSS} }
        </style>
        <button onclick="location.reload()">Retry</button>
      `);
      await ApkInstaller.requestPermission();
      // Wait up to 5 minutes (300 seconds) - time for user to grant permission in settings
      await waitUntil(
        async () => {
          return ApkInstaller.hasPermission();
        },
        1000,
        300,
      );
    }
  }

  private static async _installApk(
    log: (messageHtml: string) => void,
    apkFilePath: string,
  ): Promise<void> {
    log(html`
      Please install the latest version and restart.
      <style>
        button { ${this._BUTTON_CSS} }
        button:active { ${this._BUTTON_ACTIVE_CSS} }
      </style>
      <button onclick="location.reload()">Retry</button>
    `);
    const apkFileUri = await FileSystem.getFileUri(apkFilePath);
    await ApkInstaller.install(apkFileUri);
  }

  private static _getErrorMessage(err: unknown) {
    return html`
      Error occurred during update:
      <br />
      ${err instanceof Error ? err.message : String(err)}
    `;
  }

  private static async _freezeApp() {
    await new Promise(() => {}); // Wait indefinitely
  }

  static async run(opt: { log: (messageHtml: string) => void; serviceClient: ServiceClient }) {
    try {
      opt.log(`Checking latest version...`);

      // Get version and download link from server
      const autoUpdateServiceClient =
        opt.serviceClient.getService<AutoUpdateService>("AutoUpdateService");

      const serverVersionInfo = await autoUpdateServiceClient.getLastVersion("android");
      if (!serverVersionInfo) {
        // eslint-disable-next-line no-console
        console.log("Failed to get latest version information from server.");
        return;
      }

      opt.log(`Checking permission...`);
      await this._checkPermission(
        opt.log,
        opt.serviceClient.hostUrl + serverVersionInfo.downloadPath,
      );

      // Get current app version
      const currentVersionInfo = await ApkInstaller.getVersionInfo();

      // Return if already latest or server version is lower
      if (
        semver.valid(currentVersionInfo.versionName) === null ||
        semver.valid(serverVersionInfo.version) === null
      ) {
        // eslint-disable-next-line no-console
        console.log("Invalid semver version, skipping update check");
        return;
      }
      if (!semver.gt(serverVersionInfo.version, currentVersionInfo.versionName)) {
        return;
      }

      opt.log(`Downloading latest version file...`);
      const buffer = await fetchUrlBytes(
        opt.serviceClient.hostUrl + serverVersionInfo.downloadPath,
        {
          onProgress: (progress) => {
            const progressText = ((progress.receivedLength * 100) / progress.contentLength).toFixed(
              2,
            );
            opt.log(`Downloading latest version file...(${progressText}%)`);
          },
        },
      );
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
      opt.log(`Checking permission...`);
      await this._checkPermission(opt.log);

      opt.log(`Checking latest version...`);

      // Get versions
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

      // Return if no version files are saved
      if (versions.length === 0) return;

      const latestVersion = semver.maxSatisfying(
        versions.map((item) => item.version),
        "*",
      );

      // Return if no valid semver versions
      if (latestVersion == null) {
        // eslint-disable-next-line no-console
        console.log("No valid semver version files found.");
        return;
      }

      // Get current app version
      const currentVersionInfo = await ApkInstaller.getVersionInfo();

      // Return if already latest or external storage version is lower
      if (
        semver.valid(currentVersionInfo.versionName) === null ||
        semver.valid(latestVersion) === null
      ) {
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
