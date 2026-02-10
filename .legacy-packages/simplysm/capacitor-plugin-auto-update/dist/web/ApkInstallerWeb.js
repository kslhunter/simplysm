import { WebPlugin } from "@capacitor/core";
export class ApkInstallerWeb extends WebPlugin {
  async install(_options) {
    alert("[ApkInstaller] 웹 환경에서는 APK 설치를 지원하지 않습니다.");
    await Promise.resolve();
  }
  async hasPermission() {
    // 웹에서는 권한 체크 스킵
    return await Promise.resolve({ granted: true });
  }
  async requestPermission() {
    // no-op
  }
  async hasPermissionManifest() {
    // 웹에서는 매니페스트 체크 스킵
    return await Promise.resolve({ declared: true });
  }
  async getVersionInfo() {
    return await Promise.resolve({
      versionName: process.env["SD_VERSION"] ?? "0.0.0",
      versionCode: "0",
    });
  }
}
//# sourceMappingURL=ApkInstallerWeb.js.map
