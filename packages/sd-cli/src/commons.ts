export interface INpmConfig {
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  repository?: {
    type: string;
    url: string;
    directory?: string;
  };
  type?: "module";
  workspaces?: string[];
  main?: string;
  types?: string;
  exports?: Record<string, {
    types?: string;
  }>;
  scripts?: Record<string, string>;

  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
}

export interface ITsconfig {
  compilerOptions?: {
    module?: string;
    lib?: string[];
    outDir?: string;
    baseUrl?: string;
    paths?: Record<string, string[]>;
    declaration?: boolean;
  };
  files?: string[];
  angularCompilerOptions?: Record<string, any>;
}

export interface ISdCliPackageBuildResult {
  filePath: string | undefined;
  line: number | undefined;
  char: number | undefined;
  code: string | undefined;
  severity: "error" | "warning";
  message: string;
}

export interface ISdCliConfig {
  packages: Record<string, TSdCliPackageConfig | undefined>;
  localUpdates?: Record<string, string>;
}

export type TSdCliPackageConfig = ISdCliLibPackageConfig | ISdCliServerPackageConfig | ISdCliClientPackageConfig;

export interface ISdCliLibPackageConfig {
  type: "library";
  autoIndex?: {
    polyfills?: string[];
  };
  publish?: "npm";
}

export interface ISdCliServerPackageConfig {
  type: "server";
  env?: Record<string, string>;
  configs?: Record<string, any>;
  pm2?: Record<string, any> | boolean;
  iis?: boolean | { serverExeFilePath?: string };
  externalNodeModules?: string[];
  publish?: TSdCliPublishConfig;
}

export interface ISdCliClientPackageConfig {
  type: "client";
  moduleFederation?: "host" | "remote";
  builder?: {
    web?: ISdCliClientBuilderWebConfig;
    cordova?: ISdCliClientBuilderCordovaConfig;
    electron?: ISdCliClientBuilderElectronConfig;
  };
  server: string | { port: number };
  env?: Record<string, string>;
  configs?: Record<string, any>;
  publish?: TSdCliPublishConfig;
}

export type TSdCliPublishConfig =
  ISdCliFtpPublishConfig
  | ISdCliLocalDirectoryPublishConfig
  | ISdCliGithubPublishConfig;

export interface ISdCliFtpPublishConfig {
  type: "ftp" | "ftps" | "sftp";
  host: string;
  port?: number;
  path: string;
  user: string;
  pass: string;
}

export interface ISdCliLocalDirectoryPublishConfig {
  type: "local-directory";
  path: string;
}

export interface ISdCliGithubPublishConfig {
  type: "github";
  apiKey: string;
  files: { from: string; to: string }[];
}

export interface ISdCliClientBuilderWebConfig {
  env?: Record<string, string>;
}

export interface ISdCliClientBuilderCordovaConfig {
  env?: Record<string, string>;
  appId: string;
  appName: string;
  plugins?: string[];
  icon?: string;
  debug?: boolean;
  target?: {
    browser?: {};
    android?: {
      bundle?: boolean;
      sign?: {
        keystore: string;
        storePassword: string;
        alias: string;
        password: string;
        keystoreType: string;
      };
    };
  };
}

export interface ISdCliClientBuilderElectronConfig {
  env?: Record<string, string>;
  externalNodeModules?: string[];
  appId: string;
  icon?: string;
  installerIcon?: string;
}
