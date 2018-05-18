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
}

export interface IServerPackageConfig {
  name: string;
  type: "server";
}