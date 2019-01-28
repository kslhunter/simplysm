export interface IProjectConfig {
  packages: (ILibraryPackageConfig | IClientPackageConfig | IServerPackageConfig)[];
  localDependencies?: { [key: string]: string };
  env?: { [key: string]: string };
  "env.development"?: { [key: string]: string };
  "env.production"?: { [key: string]: string };
}

export interface ILibraryPackageConfig {
  name: string;
  type: "library";
  publish?: boolean;
}

export interface IClientPackageConfig {
  name: string;
  type: "client";
  favicon?: string;
  platforms?: ("web" | "desktop" | "android")[];
  devServer?: {
    host?: string | string[];
    port: number;
  };
  cordova?: ICordovaConfig;
  publish?: IPublishConfig | false;
  env?: { [key: string]: string };
  "env.development"?: { [key: string]: string };
  "env.production"?: { [key: string]: string };
}

export interface IServerPackageConfig {
  name: string;
  type: "server";
  publish?: IPublishConfig | false;
  env?: { [key: string]: string };
  "env.development"?: { [key: string]: string };
  "env.production"?: { [key: string]: string };
}

export interface IPublishConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  path: string;
}

export interface ICordovaConfig {
  appId: string;
  name?: string;
  plugins?: string[];
  sign?: string;
  icon?: string;
}
