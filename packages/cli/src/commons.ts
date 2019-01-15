export type TPlatform = "library" | "web" | "cordova.android" | "cordova.browser" | "electron.windows";

export interface ISdConfigFileJson {
  common: ISdConfigFileJsonBuildConfig;
  development: ISdConfigFileJsonBuildConfig;
  production: ISdConfigFileJsonBuildConfig;
  publish: ISdConfigFileJsonPublishConfig;
}

export interface ISdConfigFileJsonBuildConfig {
  packages?: { [key: string]: ISdClientPackageConfig };
  port?: number;
  virtualHosts?: { [key: string]: string };
  options?: { [key: string]: any };
}

export interface ISdConfigFileJsonPublishConfig {
  packages?: { [key: string]: string };
}

export interface ISdPackageBuilderConfig {
  packages: { [key: string]: ISdClientPackageConfig };
  port?: number;
  virtualHosts?: { [key: string]: string };
  options?: { [key: string]: any };
}

export interface ISdClientPackageConfig {
  name?: string;
  platform: TPlatform;
}
