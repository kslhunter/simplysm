import type { Component } from "solid-js";
import { type Accessor, createMemo, createRoot } from "solid-js";
import type { IconProps } from "@tabler/icons-solidjs";

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

export type AppStructureItem<TModule> =
  | AppStructureGroupItem<TModule>
  | AppStructureLeafItem<TModule>;

export interface AppStructureSubPerm<TModule> {
  code: string;
  title: string;
  modules?: TModule[];
  requiredModules?: TModule[];
  perms: ("use" | "edit")[];
}

// ── 출력 타입 ──

export interface AppMenu {
  title: string;
  href?: string;
  icon?: Component<IconProps>;
  children?: AppMenu[];
}

export interface AppPerm<TModule = string> {
  title: string;
  href?: string;
  modules?: TModule[];
  perms?: string[];
  children?: AppPerm<TModule>[];
}

export interface AppFlatPerm<TModule = string> {
  titleChain: string[];
  code: string;
  modulesChain: TModule[][];
}

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
  usableRoutes: Accessor<AppRoute[]>;
  usableMenus: Accessor<AppMenu[]>;
  usableFlatMenus: Accessor<AppFlatMenu[]>;
  usablePerms: Accessor<AppPerm<TModule>[]>;
  flatPerms: AppFlatPerm<TModule>[];
  getTitleChainByHref(href: string): string[];
}

// ── 내부 헬퍼 ──

function isGroupItem<TModule>(
  item: AppStructureItem<TModule>,
): item is AppStructureGroupItem<TModule> {
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

// ── Routes ──

function buildUsableRoutes<TModule>(
  items: AppStructureItem<TModule>[],
  routeBasePath: string,
  permBasePath: string,
  usableModules?: TModule[],
  permRecord?: Record<string, boolean>,
): AppRoute[] {
  const result: AppRoute[] = [];

  for (const item of items) {
    if (!checkModules(item.modules, item.requiredModules, usableModules)) continue;

    const routePath = routeBasePath + "/" + item.code;
    const permPath = permBasePath + "/" + item.code;

    if (isGroupItem(item)) {
      result.push(
        ...buildUsableRoutes(item.children, routePath, permPath, usableModules, permRecord),
      );
    } else if (item.component !== undefined) {
      if (permRecord !== undefined && item.perms?.includes("use") && !permRecord[permPath + "/use"])
        continue;
      result.push({ path: routePath, component: item.component });
    }
  }

  return result;
}

// ── Menus ──

function buildMenus<TModule>(
  items: AppStructureItem<TModule>[],
  basePath: string,
  usableModules: TModule[] | undefined,
  permRecord: Record<string, boolean> | undefined,
): AppMenu[] {
  const result: AppMenu[] = [];

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
      if (item.perms?.includes("use") && !permRecord?.[href + "/use"]) continue;

      result.push({ title: item.title, href, icon: item.icon });
    }
  }

  return result;
}

function flattenMenus(menus: AppMenu[], titleChain: string[] = []): AppFlatMenu[] {
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

// ── Perms ──

function buildPerms<TModule>(
  items: AppStructureItem<TModule>[],
  basePath: string,
  usableModules: TModule[] | undefined,
): AppPerm<TModule>[] {
  const result: AppPerm<TModule>[] = [];

  for (const item of items) {
    if (!checkModules(item.modules, item.requiredModules, usableModules)) continue;

    const href = basePath + "/" + item.code;

    if (isGroupItem(item)) {
      const children = buildPerms(item.children, href, usableModules);
      result.push({
        title: item.title,
        modules: item.modules,
        children,
      });
    } else {
      result.push({
        title: item.title,
        href,
        modules: item.modules,
        perms: item.perms,
        children: item.subPerms
          ?.filter((sp) => checkModules(sp.modules, sp.requiredModules, usableModules))
          .map((sp) => ({
            title: sp.title,
            href: href + "/" + sp.code,
            modules: sp.modules,
            perms: sp.perms as string[],
          })),
      });
    }
  }

  return result;
}

function collectFlatPerms<TModule>(items: AppStructureItem<TModule>[]): AppFlatPerm<TModule>[] {
  const results: AppFlatPerm<TModule>[] = [];

  interface QueueItem {
    item: AppStructureItem<TModule>;
    titleChain: string[];
    codePath: string;
    modulesChain: TModule[][];
  }

  const queue: QueueItem[] = items.map((item) => ({
    item,
    titleChain: [],
    codePath: "",
    modulesChain: [],
  }));

  while (queue.length > 0) {
    const { item, titleChain, codePath, modulesChain } = queue.shift()!;

    const currTitleChain = [...titleChain, item.title];
    const currCodePath = codePath + "/" + item.code;
    const currModulesChain: TModule[][] = item.modules
      ? [...modulesChain, item.modules]
      : modulesChain;

    if (isGroupItem(item)) {
      for (const child of item.children) {
        queue.push({
          item: child,
          titleChain: currTitleChain,
          codePath: currCodePath,
          modulesChain: currModulesChain,
        });
      }
    } else {
      if (item.perms) {
        for (const perm of item.perms) {
          results.push({
            titleChain: currTitleChain,
            code: currCodePath + "/" + perm,
            modulesChain: currModulesChain,
          });
        }
      }

      if (item.subPerms) {
        for (const subPerm of item.subPerms) {
          const subModulesChain: TModule[][] = subPerm.modules
            ? [...currModulesChain, subPerm.modules]
            : currModulesChain;

          for (const perm of subPerm.perms) {
            results.push({
              titleChain: currTitleChain,
              code: currCodePath + "/" + subPerm.code + "/" + perm,
              modulesChain: subModulesChain,
            });
          }
        }
      }
    }
  }

  return results;
}

// ── Info ──

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
  permRecord?: Accessor<Record<string, boolean> | undefined>;
}): AppStructure<TModule> {
  const flatPerms = collectFlatPerms(opts.items);

  const memos = createRoot(() => {
    const usableRoutes = createMemo(() => {
      const routes: AppRoute[] = [];
      for (const top of opts.items) {
        if (isGroupItem(top)) {
          routes.push(
            ...buildUsableRoutes(
              top.children,
              "",
              "/" + top.code,
              opts.usableModules?.(),
              opts.permRecord?.(),
            ),
          );
        }
      }
      return routes;
    });

    const usableMenus = createMemo(() => {
      const menus: AppMenu[] = [];
      for (const top of opts.items) {
        if (isGroupItem(top)) {
          menus.push(
            ...buildMenus(
              top.children,
              "/" + top.code,
              opts.usableModules?.(),
              opts.permRecord?.(),
            ),
          );
        }
      }
      return menus;
    });

    const usableFlatMenus = createMemo(() => flattenMenus(usableMenus()));

    const usablePerms = createMemo(() => buildPerms(opts.items, "", opts.usableModules?.()));

    return { usableRoutes, usableMenus, usableFlatMenus, usablePerms };
  });

  return {
    items: opts.items,
    usableRoutes: memos.usableRoutes,
    usableMenus: memos.usableMenus,
    usableFlatMenus: memos.usableFlatMenus,
    usablePerms: memos.usablePerms,
    flatPerms,
    getTitleChainByHref(href: string): string[] {
      const codes = href.split("/").filter(Boolean);
      return findItemChainByCodes(opts.items, codes).map((item) => item.title);
    },
  };
}
