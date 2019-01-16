import {CompilerOptions} from "typescript";

type SdConfigFileJsonPackageConfigOfType<T> = T & {
  extends?: string[];
  development?: T;
  production?: T;
};
export type SdConfigFileJsonPackageConfigTypes = SdConfigFileJsonPackageConfigOfType<SdPackageConfigTypes>;

export type SdPackageConfigTypes =
  ISdServerPackageConfig |
  ISdLibraryPackageConfig |
  ISdWebPackageConfigForEnv |
  ISdCordovaAndroidPackageConfigForEnv |
  ISdCordovaBrowserPackageConfigForEnv |
  ISdElectronPackageConfigForEnv;

export interface ISdConfigFileJson {
  packages: { [key: string]: SdConfigFileJsonPackageConfigTypes };
  extends?: { [key: string]: SdConfigFileJsonPackageConfigTypes };
}

export interface ISdServerPackageConfig {
  type?: "server";
  publish?: ISdProtocolPublishConfig | ISdNpmPublishConfig;
  env?: { [key: string]: any };
}

export interface ISdLibraryPackageConfig {
  type?: "dom" | "node";
  publish?: ISdNpmPublishConfig;
}

export interface ISdWebPackageConfigForEnv {
  type?: "web";
  publish?: ISdProtocolPublishConfig;
  env?: { [key: string]: any };
}

export interface ISdCordovaAndroidPackageConfigForEnv {
  type?: "cordova.android";
  publish?: ISdProtocolPublishConfig;
  env?: { [key: string]: any };
}

export interface ISdCordovaBrowserPackageConfigForEnv {
  type?: "cordova.browser";
  publish?: ISdProtocolPublishConfig;
  env?: { [key: string]: any };
}

export interface ISdElectronPackageConfigForEnv {
  type?: "electron.windows";
  publish?: ISdProtocolPublishConfig;
  env?: { [key: string]: any };
}

export interface ISdProtocolPublishConfig {
  protocol?: "ftp" | "WebDAV";
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  rootPath?: string;
}

export interface ISdNpmPublishConfig {
  protocol?: "npm";
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
