export interface ISdProjectConfig {
  packages: Record<string, TSdPackageConfig | undefined>;
  types: Record<string, TSdPackageConfig | undefined>;
  localUpdates?: Record<string, string>;
  postPublish?: TSdPostPublishConfig[];
}

export type TSdProjectConfigFn = (isDev: boolean, opts?: string[]) => ISdProjectConfig;

export type TSdPackageConfig = ISdLibPackageConfig | ISdServerPackageConfig | ISdClientPackageConfig;

export interface ISdLibPackageConfig {
  type: "library";
  publish?: "npm";
  polyfills?: string[];
  noGenIndex?: boolean;
}

export interface ISdServerPackageConfig {
  type: "server";
  externals?: string[];
  publish?: ISdLocalDirectoryPublishConfig | ISdFtpPublishConfig;
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
  };
}

export interface ISdClientPackageConfig {
  type: "client";
  server?: string | { port: number };
  publish?: ISdLocalDirectoryPublishConfig | ISdFtpPublishConfig;
  env?: Record<string, string>;
  configs?: Record<string, any>;
  noLazyRoute?: boolean;
  forceProductionMode?: boolean;

  builder?: {
    web?: ISdClientBuilderWebConfig;
    electron?: ISdClientBuilderElectronConfig;
    cordova?: ISdClientBuilderCordovaConfig;
  };
}

export interface ISdLocalDirectoryPublishConfig {
  type: "local-directory";
  path: string;
}

export interface ISdFtpPublishConfig {
  type: "ftp" | "ftps" | "sftp";
  host: string;
  port?: number;
  path?: string;
  user?: string;
  pass?: string;
}

export interface ISdClientBuilderElectronConfig {
  appId: string;
  installerIcon?: string;
  postInstallScript?: string;
  // devServerHost?: string;
  // devServerPort?: number;
  reinstallDependencies?: string[];
  env?: Record<string, string>;
}

export interface ISdClientBuilderWebConfig {
  // devServerHost?: string;
  // devServerPort?: number;
  env?: Record<string, string>;
}

export interface ISdClientBuilderCordovaConfig {
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
      sdkVersion?: number;
      permissions?: {
        name: string;
        maxSdkVersion?: number;
      }[];
    };
  };
  env?: Record<string, string>;
  browserslist?: string[];
}

export type TSdPostPublishConfig = ISdPostPublishScriptConfig;

export interface ISdPostPublishScriptConfig {
  type: "script";
  script: string;
}
