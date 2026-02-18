import { type Accessor, createMemo, createRoot } from "solid-js";
import type { Component } from "solid-js";
import type { IconProps } from "@tabler/icons-solidjs";
import type { SidebarMenuItem } from "../components/layout/sidebar/SidebarMenu";

// ── 입력 타입 ──

export interface AppStructureGroupItem<TModule> {
  code: string;
  title: string;
  icon?: Component<IconProps>;
  modules?: TModule[];
  requiredModules?: TModule[];
  children: AppStructureItem<TModule>[];
}

export interface AppStructureLeafItem<TModule> {
  code: string;
  title: string;
  icon?: Component<IconProps>;
  modules?: TModule[];
  requiredModules?: TModule[];
  component?: Component;
  perms?: ("use" | "edit")[];
  subPerms?: AppStructureSubPerm<TModule>[];
  isNotMenu?: boolean;
}

export type AppStructureItem<TModule> = AppStructureGroupItem<TModule> | AppStructureLeafItem<TModule>;

export interface AppStructureSubPerm<TModule> {
  code: string;
  title: string;
  modules?: TModule[];
  requiredModules?: TModule[];
  perms: ("use" | "edit")[];
}

// ── 출력 타입 ──

export interface AppRoute {
  path: string;
  component: Component;
}

export interface AppFlatMenu {
  titleChain: string[];
  href: string;
}

export interface AppStructure<TModule> {
  items: AppStructureItem<TModule>[];
  routes: AppRoute[];
  usableMenus: Accessor<SidebarMenuItem[]>;
  usableFlatMenus: Accessor<AppFlatMenu[]>;
  permRecord: Accessor<Record<string, boolean>>;
  getTitleChainByHref(href: string): string[];
}

// ── 내부 헬퍼 ──

function isGroupItem<TModule>(item: AppStructureItem<TModule>): item is AppStructureGroupItem<TModule> {
  return "children" in item;
}

function checkModules<TModule>(
  modules: TModule[] | undefined,
  requiredModules: TModule[] | undefined,
  usableModules: TModule[] | undefined,
): boolean {
  if (usableModules === undefined) return true;

  if (modules !== undefined && modules.length > 0) {
    if (!modules.some((m) => usableModules.includes(m))) return false;
  }

  if (requiredModules !== undefined && requiredModules.length > 0) {
    if (!requiredModules.every((m) => usableModules.includes(m))) return false;
  }

  return true;
}

function collectRoutes<TModule>(items: AppStructureItem<TModule>[], parentCodes: string[], routes: AppRoute[]): void {
  for (const item of items) {
    const codes = [...parentCodes, item.code];

    if (isGroupItem(item)) {
      collectRoutes(item.children, codes, routes);
    } else if (item.component !== undefined) {
      routes.push({
        path: "/" + codes.join("/"),
        component: item.component,
      });
    }
  }
}

function extractRoutes<TModule>(items: AppStructureItem<TModule>[]): AppRoute[] {
  const routes: AppRoute[] = [];
  for (const top of items) {
    if (isGroupItem(top)) {
      collectRoutes(top.children, [], routes);
    }
  }
  return routes;
}

function buildMenus<TModule>(
  items: AppStructureItem<TModule>[],
  basePath: string,
  usableModules: TModule[] | undefined,
  permRecord: Record<string, boolean>,
): SidebarMenuItem[] {
  const result: SidebarMenuItem[] = [];

  for (const item of items) {
    if (!checkModules(item.modules, item.requiredModules, usableModules)) continue;

    const href = basePath + "/" + item.code;

    if (isGroupItem(item)) {
      const children = buildMenus(item.children, href, usableModules, permRecord);
      if (children.length > 0) {
        result.push({ title: item.title, icon: item.icon, children });
      }
    } else {
      if (item.isNotMenu) continue;
      if (item.perms?.includes("use") && !permRecord[href + "/use"]) continue;

      result.push({ title: item.title, href, icon: item.icon });
    }
  }

  return result;
}

function flattenMenus(menus: SidebarMenuItem[], titleChain: string[] = []): AppFlatMenu[] {
  const result: AppFlatMenu[] = [];

  for (const menu of menus) {
    const chain = [...titleChain, menu.title];

    if (menu.children !== undefined) {
      result.push(...flattenMenus(menu.children, chain));
    } else if (menu.href !== undefined) {
      result.push({ titleChain: chain, href: menu.href });
    }
  }

  return result;
}

function findItemChainByCodes<TModule>(
  items: AppStructureItem<TModule>[],
  codes: string[],
): AppStructureItem<TModule>[] {
  const result: AppStructureItem<TModule>[] = [];

  let currentItems = items;
  for (const code of codes) {
    const found = currentItems.find((item) => item.code === code);
    if (found === undefined) break;
    result.push(found);
    currentItems = isGroupItem(found) ? found.children : [];
  }

  return result;
}

// ── 메인 함수 ──

export function createAppStructure<TModule>(opts: {
  items: AppStructureItem<TModule>[];
  usableModules?: Accessor<TModule[] | undefined>;
  permRecord?: Accessor<Record<string, boolean>>;
}): AppStructure<TModule> {
  const permRecord = () => opts.permRecord?.() ?? {};

  const routes = extractRoutes(opts.items);

  const memos = createRoot(() => {
    const usableMenus = createMemo(() => {
      const menus: SidebarMenuItem[] = [];
      for (const top of opts.items) {
        if (isGroupItem(top)) {
          menus.push(...buildMenus(top.children, "/" + top.code, opts.usableModules?.(), permRecord()));
        }
      }
      return menus;
    });

    const usableFlatMenus = createMemo(() => flattenMenus(usableMenus()));

    return { usableMenus, usableFlatMenus };
  });

  return {
    items: opts.items,
    routes,
    usableMenus: memos.usableMenus,
    usableFlatMenus: memos.usableFlatMenus,
    permRecord,
    getTitleChainByHref(href: string): string[] {
      const codes = href.split("/").filter(Boolean);
      return findItemChainByCodes(opts.items, codes).map((item) => item.title);
    },
  };
}
