export interface INpmConfig {
  name: string;
  version: string;
  main: string | undefined;
  workspaces?: string[];

  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export interface ITsConfig {
  compilerOptions?: {
    target?: "es5" | "es2017";
    lib?: ("dom" | "es2017")[];
    outDir?: string;
    declarationDir?: string;
    declaration?: boolean;
    baseUrl?: string;
    paths?: Record<string, string[]>;
  };
  files?: string[];
}

export interface ISdProjectConfig {
  packages: Record<string, TSdPackageConfig>;
  localUpdates?: Record<string, string>;
}

export type TSdPackageConfig =
  ISdLibraryPackageConfig
  | ISdClientPackageConfig
  | ISdServerPackageConfig
  | ISdNonePackageConfig
  | ISdTestPackageConfig;

export interface ISdLibraryPackageConfig {
  type: "library";
  targets?: ("node" | "browser")[];
  polyfills?: string[];
  publish?: "npm";
}

export interface ISdClientPackageConfig {
  type: "client";
  server: string;
  configs?: Record<string, any>;
  publish?: ISdFtpPublishConfig;
}

export interface ISdServerPackageConfig {
  type: "server";
  env?: Record<string, string>;
  configs?: Record<string, any>;
  publish?: ISdFtpPublishConfig;
}

export interface ISdNonePackageConfig {
  type: "none";
}

export interface ISdTestPackageConfig {
  type: "test";
}

export interface ISdPackageBuildResult {
  type: "compile" | "check" | "lint" | "metadata";
  filePath: string | undefined;
  severity: "error" | "warning";
  message: string;
}

export interface ISdFtpPublishConfig {
  type: "sftp";
  host: string;
  port?: number;
  path: string;
  username: string;
  password: string;
}