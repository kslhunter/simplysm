export interface IProjectConfig {
  packages: (ILibraryPackageConfig | IClientPackageConfig | IServerPackageConfig)[];
  tests?: ITestPackageConfig[];
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
  platforms?: ("web" | "desktop" | "android")[];
  devServer?: {
    host: string;
    port: number;
  };
  cordova?: ICordovaConfig;
  publish?: IPublishConfig;
  env?: { [key: string]: string };
  "env.development"?: { [key: string]: string };
  "env.production"?: { [key: string]: string };
}

export interface IServerPackageConfig {
  name: string;
  type: "server";
  publish?: IPublishConfig;
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

export interface ITestPackageConfig {
  name: string;
  packages: string[];
  jsdom?: {
    url?: string;
  };
  angular?: {
    url?: string;
  };
}

export interface ICordovaConfig {
  appId: string;
  name?: string;
  plugins?: string[];
  sign?: string;
  icon?: string;
}