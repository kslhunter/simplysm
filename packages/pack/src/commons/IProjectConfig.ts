export interface IProjectConfig {
  packages: (ILibraryPackageConfig | IClientPackageConfig | IServerPackageConfig)[];
  localDependencies?: { [key: string]: string };
}

export interface ILibraryPackageConfig {
  name: string;
  type: "library";
}

export interface IClientPackageConfig {
  name: string;
  type: "client";
  platforms?: ("web" | "desktop")[];
  devServer?: {
    host: string;
    port: number;
  };
  publish?: IPublishConfig;
  env?: { [key: string]: string };
}

export interface IServerPackageConfig {
  name: string;
  type: "server";
  publish?: IPublishConfig;
  env?: { [key: string]: string };
}

export interface IPublishConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  path: string;
}