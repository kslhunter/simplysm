export interface ISdProjectConfig {
  packages: Record<string, TSdPackageConfig | undefined>;
  localUpdates?: Record<string, string>;
}

export type TSdPackageConfig =
  ISdLibraryPackageConfig |
  ISdClientPackageConfig |
  ISdServerPackageConfig |
  ISdNonePackageConfig;

export interface ISdLibraryPackageConfig {
  type: "library";
  targets?: ("node" | "browser" | "angular")[];
  autoIndex?: ISdAutoIndexConfig | boolean;
  publish?: "npm";
}

export interface ISdClientPackageConfig {
  type: "client";
  env?: Record<string, string>;
  server?: string;
  resolveFallback?: Record<string, string>;
  configs?: Record<string, any>;
  publish?: TSdPublishConfig;
}


export interface ISdServerPackageConfig {
  type: "server";
  env?: Record<string, string>;
  externalDependencies?: string[];
  configs?: Record<string, any>;
  pm2?: Record<string, any> | boolean;
  iis?: boolean | { serverExeFilePath?: string };
  publish?: TSdPublishConfig;
}

export interface ISdNonePackageConfig {
  type: "none";
}

export interface ISdAutoIndexConfig {
  polyfills?: string[];
}

export interface INpmConfig {
  name: string;
  version: string;
  workspaces?: string[];
  es2020?: string;
  browser?: string;
  module?: string;
  main?: string;
  scripts?: Record<string, string>;

  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export interface ITsconfig {
  compilerOptions?: {
    module?: "commonjs" | "es2020";
    target?: "es2015" | "es2020";
    lib?: ("dom" | "es2015" | "es2020")[];
    outDir?: string;
    declarationDir?: string;
    declaration?: boolean;
    declarationMap?: boolean;
    baseUrl?: string;
    paths?: Record<string, string[]>;
    generateTrace?: string;
  };
  angularCompilerOptions?: {
    enableI18nLegacyMessageIdFormat?: boolean;
    strictInjectionParameters?: boolean;
    strictInputAccessModifiers?: boolean;
    strictTemplates?: boolean;
    strictInputTypes?: boolean;
    strictOutputEventTypes?: boolean;
    enableIvy?: boolean;
    compilationMode?: "partial" | "full";
    disableTypeScriptVersionCheck?: boolean;
  };
  files?: string[];
  include?: string[];
}

export interface ISdPackageBuildResult {
  filePath: string | undefined;
  severity: "error" | "warning";
  message: string;
}

export type TSdPublishConfig =
  ISdSFtpPublishConfig |
  ISdLocalDirectoryPublishConfig |
  ISdFtpPublishConfig;

export interface ISdSFtpPublishConfig {
  type: "sftp";
  host: string;
  port?: number;
  path: string;
  username: string;
  password: string;
}

export interface ISdFtpPublishConfig {
  type: "ftp";
  host: string;
  port?: number;
  path: string;
  username: string;
  password: string;
}

export interface ISdLocalDirectoryPublishConfig {
  type: "local-directory";
  path: string;
}
