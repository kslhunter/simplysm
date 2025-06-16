import { inject, Injectable, Signal } from "@angular/core";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { $computed } from "../utils/bindings/$computed";

export function usePermsSignal<K extends string>(viewCodes: string[], keys: K[]): Signal<K[]> {
  const sdAppStructure = inject(SdAppStructureProvider);
  return $computed(() => sdAppStructure.getPermsByFullCode(viewCodes, keys));
}

// 권한은 모듈만 체크하고
// 메뉴는 모듈/권한 모두 체크함
@Injectable({ providedIn: "root" })
export abstract class SdAppStructureProvider<TModule = unknown> {
  abstract items: TSdAppStructureItem<TModule>[];
  abstract usableModules: Signal<TModule[] | undefined>;
  abstract permRecord: Signal<Record<string, boolean> | undefined>;

  usableMenus = $computed(() =>
    SdAppStructureUtils.getMenus(this.items, [], this.usableModules(), this.permRecord()),
  );
  usableFlatMenus = $computed<ISdFlatMenu<TModule>[]>(() =>
    SdAppStructureUtils.getFlatMenus(this.items, this.usableModules(), this.permRecord()),
  );

  getPermissionsByStructure(items: TSdAppStructureItem<TModule>[], codeChain: string[] = []) {
    return SdAppStructureUtils.getPermissions(items, codeChain, this.usableModules());
  }

  getTitleByFullCode(fullCode: string) {
    return SdAppStructureUtils.getTitleByFullCode(this.items, fullCode);
  }

  getPermsByFullCode<K extends string>(fullCodes: string[], permKeys: K[]): K[] {
    return SdAppStructureUtils.getPermsByFullCode(
      this.items,
      fullCodes,
      permKeys,
      this.permRecord(),
    );
  }
}

export abstract class SdAppStructureUtils {
  //---------- Info

  static getTitleByFullCode<TModule>(items: TSdAppStructureItem<TModule>[], fullCode: string) {
    const itemChain = this.#getItemChainByFullCode(items, fullCode);
    const parent = itemChain
      .slice(0, -1)
      .map((item) => item.title)
      .join(" > ");
    const current = itemChain.last()!.title;
    return (parent ? `[${parent}] ` : "") + current;
  }

  static getPermsByFullCode<TModule, K extends string>(
    items: TSdAppStructureItem<TModule>[],
    fullCodes: string[],
    permKeys: K[],
    permRecord: Record<string, boolean> | undefined,
  ): K[] {
    const result = [] as K[];
    for (const permKey of permKeys) {
      // 해당 권한이 설정되어있거나
      if (fullCodes.some((fullCode) => permRecord?.[fullCode + "." + permKey])) {
        result.push(permKey);
      }
      // 권한이라는것이 아얘 존재하지 않거나
      else if (
        fullCodes.every((fullCode) => {
          const item = this.#getItemChainByFullCode(items, fullCode).last();
          return !item || !("perms" in item);
        })
      ) {
        result.push(permKey);
      }
    }

    return result;
  }

  static #getItemChainByFullCode<TModule>(
    items: TSdAppStructureItem<TModule>[],
    fullCode: string,
  ): TSdAppStructureItem<TModule>[] {
    const codeChain = fullCode.split(".");

    const result: TSdAppStructureItem<TModule>[] = [];

    let cursor: TSdAppStructureItem<TModule> | undefined;
    let cursorChildren = items;
    for (const currCode of codeChain) {
      cursor = cursorChildren.single((item) => item.code === currCode);
      cursorChildren = cursor != null && "children" in cursor ? cursor.children : [];
      if (cursor) {
        result.push(cursor);
      }
    }

    return result;
  }

  //---------- Menus

  static getMenus<TModule>(
    items: TSdAppStructureItem<TModule>[],
    codeChain: string[],
    usableModules: TModule[] | undefined,
    permRecord: Record<string, boolean> | undefined,
  ): ISdMenu<TModule>[] {
    const resultMenus: ISdMenu<TModule>[] = [];

    for (const item of items) {
      if ("isNotMenu" in item && item.isNotMenu) continue;

      const currCodeChain = [...codeChain, item.code];

      // 모듈 활성화 여부 확인
      if ("modules" in item && !this.#isUsableModules(item.modules, usableModules)) continue;

      // 그룹 메뉴
      if ("children" in item) {
        const children = this.getMenus(item.children, currCodeChain, usableModules, permRecord);

        // 자식 중 표시 가능한 게 있으면 그룹 메뉴 포함
        if (children.length > 0) {
          resultMenus.push({
            title: item.title,
            icon: "icon" in item ? item.icon : undefined,
            codeChain: currCodeChain,
            modules: "modules" in item ? item.modules : undefined,
            children,
          });
        }
      }
      // Leaf 메뉴
      else {
        const code = currCodeChain.join(".");

        if (item.perms != null && !permRecord?.[code + ".use"]) continue;

        resultMenus.push({
          title: item.title,
          icon: item.icon,
          codeChain: currCodeChain,
          modules: item.modules,
          children: undefined,
        });
      }
    }

    return resultMenus;
  }

  static getFlatMenus<TModule>(
    items: TSdAppStructureItem<TModule>[],
    usableModules: TModule[] | undefined,
    permRecord: Record<string, boolean> | undefined,
  ): ISdFlatMenu<TModule>[] {
    const resultFlatMenus: ISdFlatMenu<TModule>[] = [];

    type QueueItem = {
      item: TSdAppStructureItem<TModule>;
      titleChain: string[];
      codeChain: string[];
      modulesChain: TModule[][];
    };

    const queue: QueueItem[] = items.map((item) => ({
      item,
      titleChain: [],
      codeChain: [],
      modulesChain: [],
    }));

    while (queue.length > 0) {
      const { item, titleChain, codeChain, modulesChain } = queue.shift()!;

      if ("isNotMenu" in item && item.isNotMenu) continue;

      const currTitleChain = [...titleChain, item.title];
      const currCodeChain = [...codeChain, item.code];
      const currModulesChain =
        "modules" in item ? [...modulesChain, item.modules ?? []] : modulesChain;

      if (!this.#isUsableModulesChain(currModulesChain, usableModules)) continue;

      if ("children" in item) {
        for (const child of item.children) {
          queue.push({
            item: child,
            titleChain: currTitleChain,
            codeChain: currCodeChain,
            modulesChain: currModulesChain,
          });
        }
      } else if (item.perms == null || Boolean(permRecord?.[currCodeChain.join(".") + ".use"])) {
        resultFlatMenus.push({
          titleChain: currTitleChain,
          codeChain: currCodeChain,
          modulesChain: currModulesChain,
        });
      }
    }

    return resultFlatMenus;
  }

  //---------- Perms

  static getPermissions<TModule>(
    items: TSdAppStructureItem<TModule>[],
    codeChain: string[],
    usableModules: TModule[] | undefined,
  ): ISdPermission<TModule>[] {
    const results: ISdPermission<TModule>[] = [];
    for (const item of items) {
      const currCodeChain = [...codeChain, item.code];

      // 모듈 활성화 여부 확인
      if ("modules" in item && !this.#isUsableModules(item.modules, usableModules)) continue;

      // 그룹
      if ("children" in item) {
        const children = this.getPermissions(item.children, currCodeChain, usableModules);

        results.push({
          title: item.title,
          codeChain: currCodeChain,
          modules: "modules" in item ? item.modules : undefined,
          perms: undefined,
          children: children,
        });
      }
      // Leaf
      else {
        results.push({
          title: item.title,
          codeChain: currCodeChain,
          perms: item.perms,
          modules: item.modules,
          children: item.subPerms?.map((subPerm) => ({
            title: subPerm.title,
            codeChain: [...currCodeChain, subPerm.code],
            perms: subPerm.perms,
            modules: subPerm.modules,
            children: undefined,
          })),
        });
      }
    }

    return results;
  }

  static getFlatPermissions<TModule>(
    items: TSdAppStructureItem<TModule>[],
    usableModules: TModule[] | undefined,
  ) {
    const results: ISdFlatPermission<TModule>[] = [];

    type QueueItem = {
      item: TSdAppStructureItem<TModule>;
      titleChain: string[];
      codeChain: string[];
      modulesChain: TModule[][];
    };

    const queue: QueueItem[] = items.map((item) => ({
      item,
      titleChain: [],
      codeChain: [],
      modulesChain: [],
    }));

    while (queue.length > 0) {
      const { item, titleChain, codeChain, modulesChain } = queue.shift()!;

      const currTitleChain = [...titleChain, item.title];
      const currCodeChain = [...codeChain, item.code];
      const currModulesChain =
        "modules" in item ? [...modulesChain, item.modules ?? []] : modulesChain;

      if (!this.#isUsableModulesChain(currModulesChain, usableModules)) continue;

      // 1. 자식 enqueue
      if ("children" in item) {
        for (const child of item.children) {
          queue.push({
            item: child,
            titleChain: currTitleChain,
            codeChain: currCodeChain,
            modulesChain: currModulesChain,
          });
        }
      }

      // 1. 직접 perms 처리
      if ("perms" in item) {
        for (const perm of item.perms ?? []) {
          results.push({
            titleChain: currTitleChain,
            codeChain: [...currCodeChain, perm],
            modulesChain: currModulesChain,
          });
        }
      }

      // 2. subPerms 처리
      if ("subPerms" in item) {
        for (const subPerm of item.subPerms ?? []) {
          for (const perm of subPerm.perms) {
            results.push({
              titleChain: currTitleChain,
              codeChain: [...currCodeChain, subPerm.code, perm],
              modulesChain: [...currModulesChain, subPerm.modules ?? []],
            });
          }
        }
      }
    }

    return results;
  }

  //-- Modules (private)

  static #isUsableModulesChain<TModule>(
    modulesChain: TModule[][],
    usableModules: TModule[] | undefined,
  ) {
    for (const modules of modulesChain) {
      if (!this.#isUsableModules(modules, usableModules)) {
        return false;
      }
    }

    return true;
  }

  static #isUsableModules<TModule>(
    modules: TModule[] | undefined,
    usableModules: TModule[] | undefined,
  ): boolean {
    return (
      modules == null ||
      modules.length === 0 ||
      !modules.every((module) => !usableModules?.includes(module))
    );
  }
}

export type TSdAppStructureItem<TModule = unknown> =
  | ISdAppStructureGroupItem<TModule>
  | ISdAppStructureLeafItem<TModule>;

interface ISdAppStructureGroupItem<TModule> {
  code: string;
  title: string;
  modules?: TModule[];
  icon?: IconDefinition;
  children: TSdAppStructureItem<TModule>[];
}

interface ISdAppStructureLeafItem<TModule> {
  code: string;
  title: string;
  modules?: TModule[];
  perms?: ("use" | "edit")[];
  subPerms?: ISdAppStructureSubPermission<TModule>[];
  icon?: IconDefinition;
  isNotMenu?: boolean;
}

interface ISdAppStructureSubPermission<TModule> {
  code: string;
  title: string;
  modules?: TModule[];
  perms: ("use" | "edit")[];
}

export interface ISdMenu<TModule = unknown> {
  title: string;
  codeChain: string[];
  icon: IconDefinition | undefined;
  modules: TModule[] | undefined;
  children: ISdMenu<TModule>[] | undefined;
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
