import {CompilerOptions} from "typescript";

type SdConfigFileJsonPackageConfigOfType<T> = T & {
  extends?: string[];
  development?: T;
  production?: T;
};
export type SdConfigFileJsonPackageConfigTypes = SdConfigFileJsonPackageConfigOfType<ISdPackageConfig>;


export interface ISdConfigFileJson {
  packages: { [key: string]: SdConfigFileJsonPackageConfigTypes };
  extends?: { [key: string]: SdConfigFileJsonPackageConfigTypes };
  localUpdates?: { [key: string]: string };
}

export interface ISdProjectConfig {
  packages: { [key: string]: ISdPackageConfig };
  localUpdates?: { [key: string]: string };
}

export interface ISdPackageConfig {
  type?: "none" | "dom" | "node" | "all" | "server" | "web" | "cordova.android" | "cordova.browser" | "electron.windows";
  publish?: ISdPublishConfig;
  env?: { [key: string]: any };
  vhost?: string;
  server?: string;
  port?: number;
  configs?: { [key: string]: { [key: string]: string } };
}

export interface ISdPublishConfig {
  protocol?: "npm" | /*"ftp" | "WebDAV" | */"simplysm";
  host?: string;
  port?: number;
  // username?: string;
  // password?: string;
  // path?: string;
}


export interface ITsConfig {
  extends?: string;
  compilerOptions?: CompilerOptions & { paths?: { [key: string]: string[] } };
  files?: string[];
}

export interface INpmConfig {
  name: string;
  version: string;
  types?: string;
  main?: string;
  dependencies?: { [key: string]: string };
  devDependencies?: { [key: string]: string };
  peerDependencies?: { [key: string]: string };
}
