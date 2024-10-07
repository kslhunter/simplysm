export interface INpmConfig {
  name: string;
  description?: string;
  version: string;
  workspaces?: string[];

  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<
    string,
    {
      optional?: boolean;
    }
  >;

  resolutions?: Record<string, string>;

  scripts?: Record<string, string>;
}

export interface ITsConfig {
  files?: string[];
  compilerOptions: { lib: string[] };
  angularCompilerOptions?: {};
}
