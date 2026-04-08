export type AppStructureItem<TModule = unknown> =
  | AppStructureGroupItem<TModule>
  | AppStructureLeafItem<TModule>;

export interface AppStructureGroupItem<TModule> {
  code: string;
  title: string;
  modules?: TModule[];
  requiredModules?: TModule[];
  icon?: string;
  children: AppStructureItem<TModule>[];
}

export interface AppStructureLeafItem<TModule> {
  code: string;
  title: string;
  modules?: TModule[];
  requiredModules?: TModule[];
  perms?: ("use" | "edit")[];
  subPerms?: AppStructureSubPermission<TModule>[];
  icon?: string;
  url?: string;
  isNotMenu?: boolean;
}

export interface AppStructureSubPermission<TModule> {
  code: string;
  title: string;
  modules?: TModule[];
  requiredModules?: TModule[];
  perms: ("use" | "edit")[];
}

export interface FlatPermission<TModule = unknown> {
  titleChain: string[];
  codeChain: string[];
  modulesChain: TModule[][];
}
