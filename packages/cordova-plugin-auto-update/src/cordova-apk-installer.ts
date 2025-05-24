export abstract class CordovaApkInstaller {
  static async hasPermissionManifest(): Promise<boolean> {
    return await new Promise((resolve) => {
      cordova.exec(
        (result: string) => resolve(result === "true"),
        () => resolve(false),
        "CordovaApkInstaller",
        "hasPermissionManifest",
        [],
      );
    });
  }

  static async hasPermission(): Promise<boolean> {
    return await new Promise((resolve) => {
      cordova.exec(
        (result: string) => resolve(result === "true"),
        () => resolve(false),
        "CordovaApkInstaller",
        "hasPermission",
        [],
      );
    });
  }

  static async requestPermission(): Promise<void> {
    return await new Promise((resolve, reject) => {
      cordova.exec(resolve, reject, "CordovaApkInstaller", "requestPermission", []);
    });
  }

  static async install(apkUri: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      cordova.exec(resolve, reject, "CordovaApkInstaller", "install", [apkUri]);
    });
  }

  static async getVersionInfo(): Promise<{
    versionName: string;
    versionCode: string;
  }> {
    return await new Promise((resolve, reject) => {
      cordova.exec(resolve, reject, "CordovaFileSystem", "getVersionInfo", []);
    });
  }
}
