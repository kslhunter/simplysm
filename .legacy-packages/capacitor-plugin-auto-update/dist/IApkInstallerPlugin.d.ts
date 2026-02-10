export interface IVersionInfo {
  versionName: string;
  versionCode: string;
}
export interface IApkInstallerPlugin {
  install(options: { uri: string }): Promise<void>;
  hasPermission(): Promise<{
    granted: boolean;
  }>;
  requestPermission(): Promise<void>;
  hasPermissionManifest(): Promise<{
    declared: boolean;
  }>;
  getVersionInfo(): Promise<IVersionInfo>;
}
