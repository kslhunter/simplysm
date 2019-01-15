import {CompilerOptions} from "typescript";

export type SdPackageType = "node" | "dom" | "web" | "cordova.android" | "cordova.browser" | "electron.windows";

export interface ISdConfigFileJson {
  common: ISdConfigFileJsonBuildConfig;
  development: ISdConfigFileJsonBuildConfig;
  production: ISdConfigFileJsonBuildConfig;
  publish: ISdConfigFileJsonPublishConfig;
}

export interface ISdConfigFileJsonBuildConfig {
  packages?: { [key: string]: ISdConfigFileJsonClientPackageConfig | SdPackageType };
  port?: number;
  virtualHosts?: { [key: string]: string };
  options?: { [key: string]: any };
}

export interface ISdConfigFileJsonClientPackageConfig {
  name?: string;
  type: SdPackageType;
}

export interface ISdConfigFileJsonPublishConfig {
  packages?: { [key: string]: string };
  targets?: { [key: string]: ISdClientPackagePublishConfig };
}

export interface ISdClientPackagePublishConfig {
  protocol: "WebDAV" | "ftp";
  host: string;
  port?: number;
  username: string;
  password: string;
  path: string;
}

export interface ISdPackageBuilderConfig {
  packages: { [key: string]: ISdClientPackageConfig };
  port?: number;
  virtualHosts?: { [key: string]: string };
  options?: { [key: string]: any };
}

export interface ISdClientPackageConfig {
  name?: string;
  type: SdPackageType;
  publish?: ISdClientPackagePublishConfig | "npm";
}

export interface ITsConfig {
  extends?: string;
  compilerOptions?: CompilerOptions & { paths?: { [key: string]: string[] } };
  files?: string[];
}

export interface INpmConfig {
  name: string;
  version: string;
  dependencies?: { [key: string]: string }[];
  devDependencies?: { [key: string]: string }[];
  peerDependencies?: { [key: string]: string }[];
}
