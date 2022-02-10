export interface INpmConfig {
  name: string;
  version: string;
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
  iis?: { serverExeFilePath?: string } | boolean;
}

export interface ISdCliClientPackageConfig {
  type: "client";
  server: string;
  env?: Record<string, string>;
}
