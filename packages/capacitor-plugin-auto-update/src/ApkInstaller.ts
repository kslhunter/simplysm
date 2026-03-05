import { registerPlugin } from "@capacitor/core";
import type { ApkInstallerPlugin, VersionInfo } from "./ApkInstallerPlugin";

const apkInstallerPlugin = registerPlugin<ApkInstallerPlugin>("ApkInstaller", {
  web: async () => {
    const { ApkInstallerWeb } = await import("./web/ApkInstallerWeb");
    return new ApkInstallerWeb();
  },
});

/**
 * APK installation plugin
 * - Android: Executes APK install intent, manages REQUEST_INSTALL_PACKAGES permission
 * - Browser: Shows alert message and returns normally
 */
export abstract class ApkInstaller {
  /**
   * Check permissions (install permission granted + manifest declared)
   */
  static async checkPermissions(): Promise<{ granted: boolean; manifest: boolean }> {
    return apkInstallerPlugin.checkPermissions();
  }

  /**
   * Request REQUEST_INSTALL_PACKAGES permission (navigates to settings)
   */
  static async requestPermissions(): Promise<void> {
    await apkInstallerPlugin.requestPermissions();
  }

  /**
   * Install APK
   * @param apkUri content:// URI (FileProvider URI)
   */
  static async install(apkUri: string): Promise<void> {
    await apkInstallerPlugin.install({ uri: apkUri });
  }

  /**
   * Get app version info
   */
  static async getVersionInfo(): Promise<VersionInfo> {
    return apkInstallerPlugin.getVersionInfo();
  }
}
