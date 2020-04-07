export interface ISdProjectConfig {
  packages: { [packageName: string]: TSdPackageConfig | undefined };
  localUpdates: { [p: string]: string } | undefined;
}

export interface ISdLibraryPackageConfig {
  type: "library";
  targets: ("node" | "browser")[];
  polyfills?: string[];
  publish?: "npm";
}

export interface ISdServerPackageConfig {
  type: "server";
  configs?: { [key: string]: any };
  env?: { [key: string]: string };
}

export interface ISdWebPackageConfig {
  type: "web";
  server: string;
  configs?: { [key: string]: any };
}

export type TSdPackageConfig =
  ISdLibraryPackageConfig |
  ISdServerPackageConfig |
  ISdWebPackageConfig |
  { type: "none" };

export interface ISdPackageInfo {
  rootPath: string;
  npmConfig: INpmConfig;
  npmConfigPath: string;

  tsConfig?: {
    filePath: string;
    config: ITsConfig;
  };

  tsConfigForBuild?: {
    node?: {
      filePath: string;
      config?: ITsConfig;
    };
    browser?: {
      filePath: string;
      config?: ITsConfig;
    };
  };

  config?: TSdPackageConfig;
}

export interface INpmConfig {
  name: string;
  version: string;
  main: string | undefined;
  workspaces?: string[];

  dependencies?: { [key: string]: string | undefined };
  devDependencies?: { [key: string]: string | undefined };
  peerDependencies?: { [key: string]: string | undefined };
}

export interface ITsConfig {
  compilerOptions: {
    target?: "es5" | "es2017";
    outDir?: string;
    declaration?: boolean;
    baseUrl?: string;
    paths?: { [key: string]: string[] | undefined };
  };
  files?: string[];
}