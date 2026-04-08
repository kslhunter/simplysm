export type {
  AppStructureItem,
  AppStructureGroupItem,
  AppStructureLeafItem,
  AppStructureSubPermission,
  FlatPermission,
} from "@simplysm/service-common";

export interface SdMenu {
  title: string;
  codeChain: string[];
  url?: string;
  icon?: string;
  children?: SdMenu[];
}

export interface SdFlatMenu<TModule = unknown> {
  titleChain: string[];
  codeChain: string[];
  modulesChain: TModule[][];
}

export interface SdPermission<TModule = unknown> {
  title: string;
  codeChain: string[];
  modules: TModule[] | undefined;
  perms: ("use" | "edit")[] | undefined;
  children: SdPermission<TModule>[] | undefined;
}
