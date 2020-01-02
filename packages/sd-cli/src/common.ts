export interface ISdProjectConfig {
  packages: { [key: string]: TSdPackageConfig };
}

export interface ISdLibraryPackageConfig {
  type?: "library";
}

export interface ISdServerPackageConfig {
  type?: "server";
  env?: { [key: string]: string };
  configs?: { [key: string]: any };
  publish?: ISdSimplysmPublishConfig;
}

export interface ISdWebPackageConfig {
  type?: "web";
  env?: { [key: string]: string };
  configs?: { [key: string]: any };
  publish?: ISdSimplysmPublishConfig;
  server?: string;
}

export type TSdPackageConfig = ISdLibraryPackageConfig | ISdServerPackageConfig | ISdWebPackageConfig;

export interface ISdSimplysmPublishConfig {
  type?: "simplysm";
  host?: string;
  port?: number;
  path: string;
  ssl?: boolean;
  origin?: string;
}

export interface ISdNpmConfig {
  name: string;
  version: string;
  workspaces?: string[];
  dependencies?: { [key: string]: string };
  devDependencies?: { [key: string]: string };
  peerDependencies?: { [key: string]: string };
}
