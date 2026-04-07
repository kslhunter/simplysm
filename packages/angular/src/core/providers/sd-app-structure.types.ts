export type TSdAppStructureItem<TModule = unknown> =
  | ISdAppStructureGroupItem<TModule>
  | ISdAppStructureLeafItem<TModule>;

export interface ISdAppStructureGroupItem<TModule> {
  code: string;
  title: string;
  modules?: TModule[];
  requiredModules?: TModule[];
  icon?: string;
  children: TSdAppStructureItem<TModule>[];
}

export interface ISdAppStructureLeafItem<TModule> {
  code: string;
  title: string;
  modules?: TModule[];
  requiredModules?: TModule[];
  perms?: ("use" | "edit")[];
  subPerms?: ISdAppStructureSubPermission<TModule>[];
  icon?: string;
  url?: string;
  isNotMenu?: boolean;
}

export interface ISdAppStructureSubPermission<TModule> {
  code: string;
  title: string;
  modules?: TModule[];
  requiredModules?: TModule[];
  perms: ("use" | "edit")[];
}

export interface ISdMenu {
  title: string;
  codeChain: string[];
  url?: string;
  icon?: string;
  children?: ISdMenu[];
}

export interface ISdFlatMenu<TModule = unknown> {
  titleChain: string[];
  codeChain: string[];
  modulesChain: TModule[][];
}

export interface ISdPermission<TModule = unknown> {
  title: string;
  codeChain: string[];
  modules: TModule[] | undefined;
  perms: ("use" | "edit")[] | undefined;
  children: ISdPermission<TModule>[] | undefined;
}

export interface ISdFlatPermission<TModule = unknown> {
  titleChain: string[];
  codeChain: string[];
  modulesChain: TModule[][];
}
