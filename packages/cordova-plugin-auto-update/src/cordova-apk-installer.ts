export abstract class CordovaApkInstaller {
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

  static async requestPermission() {
    const canInstall = await this._ensureCanInstallApk();
    if (canInstall) return true;

    await this._openUnknownSourceSettings();
    return false;
  }

  static async installApkFromPath(apkPath: string) {
    const canInstall = await this._ensureCanInstallApk();
    if (!canInstall) {
      throw new Error("설치권한이 없습니다.");
    }

    await this._installApkFromPath(apkPath);
  }
}
