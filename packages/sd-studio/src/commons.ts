export interface INpmConfig {
  name: string;
  version: string;
  main: string | undefined;
  types: string | undefined;
  workspaces?: string[];

  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export interface IDbLibPackage {
  rootPath: string;
  name: string;
}

export interface IServerPackage {
  rootPath: string;
  name: string;
}

export interface IClientPackage {
  rootPath: string;
  name: string;
  hasRouter: boolean;
}

export interface ICommonLibPackage {
  rootPath: string;
  name: string;
}

export interface IClientLibPackage {
  rootPath: string;
  name: string;
}

export const TXT_CHANGE_IGNORE_CONFIRM = "변경사항이 있습니다. 모든 변경사항을 무시하시겠습니까?";