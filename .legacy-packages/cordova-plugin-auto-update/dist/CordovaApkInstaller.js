export class CordovaApkInstaller {
    static async hasPermissionManifest() {
        return await new Promise((resolve) => {
            cordova.exec((result) => resolve(result === "true"), () => resolve(false), "CordovaApkInstaller", "hasPermissionManifest", []);
        });
    }
    static async hasPermission() {
        return await new Promise((resolve) => {
            cordova.exec((result) => resolve(result === "true"), () => resolve(false), "CordovaApkInstaller", "hasPermission", []);
        });
    }
    static async requestPermission() {
        return await new Promise((resolve, reject) => {
            cordova.exec(resolve, reject, "CordovaApkInstaller", "requestPermission", []);
        });
    }
    static async install(apkUri) {
        await new Promise((resolve, reject) => {
            cordova.exec(resolve, reject, "CordovaApkInstaller", "install", [apkUri]);
        });
    }
    static async getVersionInfo() {
        return await new Promise((resolve, reject) => {
            cordova.exec(resolve, reject, "CordovaApkInstaller", "getVersionInfo", []);
        });
    }
}
//# sourceMappingURL=CordovaApkInstaller.js.map