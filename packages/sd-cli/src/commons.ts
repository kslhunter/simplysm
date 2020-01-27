export interface ISdLibraryPackageConfig {
  type?: "library";
  framework?: TSdFramework;
  publish?: "npm";
  polyfills?: string[];
}

export interface ISdServerPackageConfig {
  type?: "server";
  env?: { [key: string]: string };
  configs?: { [key: string]: any };
  publish?: ISdSimplysmPublishConfig;
}

export interface ISdWebPackageConfig {
  type?: "web";
  framework?: TSdFramework;
  env?: { [key: string]: string };
  configs?: { [key: string]: any };
  publish?: ISdSimplysmPublishConfig;
  serverPackage?: string;
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

export type TSdFramework = "angular" | "angular-jit";
