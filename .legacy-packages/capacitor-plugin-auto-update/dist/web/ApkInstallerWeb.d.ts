import { WebPlugin } from "@capacitor/core";
import type { IApkInstallerPlugin, IVersionInfo } from "../IApkInstallerPlugin";
export declare class ApkInstallerWeb extends WebPlugin implements IApkInstallerPlugin {
  install(_options: { uri: string }): Promise<void>;
  hasPermission(): Promise<{
    granted: boolean;
  }>;
  requestPermission(): Promise<void>;
  hasPermissionManifest(): Promise<{
    declared: boolean;
  }>;
  getVersionInfo(): Promise<IVersionInfo>;
}
