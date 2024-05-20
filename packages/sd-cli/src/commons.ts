export interface INpmConfig {
  name: string;
  description?: string;
  version: string;
  workspaces?: string[];

  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, {
    optional?: boolean
  }>;

  resolutions?: Record<string, string>;

  scripts?: Record<string, string>;
}

export interface ITsConfig {
  files?: string[],
  compilerOptions: { lib: string[] };
  angularCompilerOptions?: {};
}

export interface ISdCliBuildClusterReqMessage {
  cmd: "watch" | "build";
  projConf: ISdCliConfig;
  pkgPath: string;
  // builderKey?: "web" | "electron";
  execArgs?: string[];
}

export interface ISdCliBuildClusterResMessage {
  req: ISdCliBuildClusterReqMessage;
  type: "change" | "complete" | "ready";
  result?: ISdCliBuilderResult;
}

export interface ISdCliBuilderResult {
  affectedFilePaths: string[];
  buildResults: ISdCliPackageBuildResult[];
}

export interface ISdCliPackageBuildResult {
  filePath: string | undefined;
  line: number | undefined;
  char: number | undefined;
  code: string | undefined;
  severity: "error" | "warning" | "suggestion" | "message";
  message: string;
  type: "build" | "lint" | "style" | "check" | undefined;
}

export interface ISdCliConfig {
  packages: Record<string, TSdCliPackageConfig | undefined>;
  localUpdates?: Record<string, string>;
  postPublish?: TSdCliPostPublishConfig[];
}

export type TSdCliConfigFn = (isDev: boolean, opts?: string[]) => ISdCliConfig;

export type TSdCliPackageConfig = ISdCliLibPackageConfig | ISdCliServerPackageConfig | ISdCliClientPackageConfig;

export interface ISdCliLibPackageConfig {
  type: "library";
  publish?: "npm";
  polyfills?: string[];
  noGenIndex?: boolean;
}

export interface ISdCliServerPackageConfig {
  type: "server";
  externals?: string[];
  publish?: ISdCliLocalDirectoryPublishConfig | ISdCliFtpPublishConfig;
  configs?: Record<string, any>;
  env?: Record<string, string>;
  pm2?: {
    name?: string;
    ignoreWatchPaths?: string[];
    noInterpreter?: boolean;
    noStartScript?: boolean;
  };
  iis?: {
    nodeExeFilePath?: string;
  }
}

export interface ISdCliClientPackageConfig {
  type: "client";
  server?: string | { port: number };
  publish?: ISdCliLocalDirectoryPublishConfig | ISdCliFtpPublishConfig;
  env?: Record<string, string>;
  configs?: Record<string, any>;

  builder?: {
    web?: ISdCliClientBuilderWebConfig;
    electron?: ISdCliClientBuilderElectronConfig;
    cordova?: ISdCliClientBuilderCordovaConfig;
  }
}

export interface ISdCliLocalDirectoryPublishConfig {
  type: "local-directory";
  path: string;
}

export interface ISdCliFtpPublishConfig {
  type: "ftp" | "ftps" | "sftp";
  host: string;
  port?: number;
  path?: string;
  user?: string;
  pass?: string;
}

export interface ISdCliClientBuilderElectronConfig {
  appId: string;
  installerIcon?: string;
  postInstallScript?: string;
  // devServerHost?: string;
  // devServerPort?: number;
  reinstallDependencies?: string[];
  env?: Record<string, string>;
}

export interface ISdCliClientBuilderWebConfig {
  // devServerHost?: string;
  // devServerPort?: number;
  env?: Record<string, string>;
}

export interface ISdCliClientBuilderCordovaConfig {
  appId: string;
  appName: string;
  plugins?: string[];
  icon?: string;
  debug?: boolean;
  platform?: {
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
    }
  }
  env?: Record<string, string>;
}

export type TSdCliPostPublishConfig = ISdCliPostPublishScriptConfig;

export interface ISdCliPostPublishScriptConfig {
  type: "script";
  script: string;
}