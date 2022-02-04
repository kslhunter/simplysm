export interface INpmConfig {
  name: string;
  version: string;
  workspaces?: string[];
  es2020?: string;
  browser?: string;
  module?: string;
  main?: string;
  exports?: Record<string, {
    types?: string;
  }>;
  scripts?: Record<string, string>;

  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export interface ITsconfig {
  compilerOptions?: {
    outDir?: string;
    baseUrl?: string;
    paths?: Record<string, string[]>;
  };
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

export type TSdCliPackageConfig = ISdCliLibPackageConfig | ISdCliNgLibPackageConfig | ISdCliServerPackageConfig;

export interface ISdCliLibPackageConfig {
  type: "library";
  publish?: "npm";
}

export interface ISdCliNgLibPackageConfig {
  type: "angular";
}

export interface ISdCliServerPackageConfig {
  type: "server";
}
