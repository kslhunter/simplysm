import { registerPlugin } from "@capacitor/core";
import type { IApkInstallerPlugin, IVersionInfo } from "./IApkInstallerPlugin";

const ApkInstallerPlugin = registerPlugin<IApkInstallerPlugin>("ApkInstaller", {
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
   * Check if REQUEST_INSTALL_PACKAGES permission is declared in the manifest
   */
  static async hasPermissionManifest(): Promise<boolean> {
    const result = await ApkInstallerPlugin.hasPermissionManifest();
    return result.declared;
  }

  /**
   * Check if REQUEST_INSTALL_PACKAGES permission is granted
   */
  static async hasPermission(): Promise<boolean> {
    const result = await ApkInstallerPlugin.hasPermission();
    return result.granted;
  }

  /**
   * Request REQUEST_INSTALL_PACKAGES permission (navigates to settings)
   */
  static async requestPermission(): Promise<void> {
    await ApkInstallerPlugin.requestPermission();
  }

  /**
   * Install APK
   * @param apkUri content:// URI (FileProvider URI)
   */
  static async install(apkUri: string): Promise<void> {
    await ApkInstallerPlugin.install({ uri: apkUri });
  }

  /**
   * Get app version info
   */
  static async getVersionInfo(): Promise<IVersionInfo> {
    return ApkInstallerPlugin.getVersionInfo();
  }
}
