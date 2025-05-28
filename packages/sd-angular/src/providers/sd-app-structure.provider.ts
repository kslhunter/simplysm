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
export abstract class SdAppStructureProvider<TModule> {
  abstract items: TSdAppStructureItem<TModule>[];

  abstract usableModules: Signal<TModule[] | undefined>;
  abstract permRecord: Signal<Record<string, boolean> | undefined>;

  usablePerms = $computed(() => this._getPerms(this.items));
  usableMenus = $computed<ISdMenu<TModule>[]>(() => this._getMenus(this.items));

  usableFlatMenus = $computed<ISdFlatMenu<TModule>[]>(() => {
    const resultFlatMenus: ISdFlatMenu<TModule>[] = [];

    type QueueItem = {
      item: TSdAppStructureItem<TModule>;
      titleChain: string[];
      codeChain: string[];
      modulesChain: TModule[][];
    };

    const queue: QueueItem[] = this.items.map((item) => ({
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

      if (!this.isUsableModulesChain(currModulesChain, this.usableModules())) continue;

      if ("children" in item) {
        for (const child of item.children) {
          queue.push({
            item: child,
            titleChain: currTitleChain,
            codeChain: currCodeChain,
            modulesChain: currModulesChain,
          });
        }
      } else if (
        item.perms == null ||
        Boolean(this.permRecord()?.[currCodeChain.join(".") + ".use"])
      ) {
        resultFlatMenus.push({
          titleChain: currTitleChain,
          codeChain: currCodeChain,
          modulesChain: currModulesChain,
        });
      }
    }

    return resultFlatMenus;
  });
  usableFlatPerms = $computed<ISdFlatPermission<TModule>[]>(() =>
    this.getFlatPerms(this.items, this.usableModules()),
  );

  getTitleByFullCode(fullCode: string) {
    const itemChain = this._getItemChainByFullCode(fullCode);
    const parent = itemChain.slice(0, -1).map(item => item.title).join(" > ");
    const current = itemChain.last()!.title;
    return (parent ? `[${parent}] ` : "") + current;
  }

  getPermsByFullCode<K extends string>(fullCodes: string[], permKeys: K[]): K[] {
    const result = [] as K[];
    for (const permKey of permKeys) {
      // 해당 권한이 설정되어있거나
      if (fullCodes.some((fullCode) => this.permRecord()?.[fullCode + "." + permKey])) {
        result.push(permKey);
      }
      // 권한이라는것이 아얘 존재하지 않거나
      else if (
        fullCodes.every((fullCode) => {
          const item = this._getItemChainByFullCode(fullCode).last()!;
          return !("perms" in item);
        })
      ) {
        result.push(permKey);
      }
    }

    return result;
  }

  getFlatPerms(items: TSdAppStructureItem<TModule>[], usableModules: TModule[] | undefined) {
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

      if (!this.isUsableModulesChain(currModulesChain, usableModules)) continue;

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

  private _getPerms(
    items: TSdAppStructureItem<TModule>[],
    codeChain: string[] = [],
  ): ISdPermission<TModule>[] {
    const results: ISdPermission<TModule>[] = [];
    for (const item of items) {
      const currCodeChain = [...codeChain, item.code];

      // 모듈 활성화 여부 확인
      if ("modules" in item && !this._isUsableModules(item.modules, this.usableModules())) continue;

      // 그룹
      if ("children" in item) {
        const children = this._getPerms(item.children, currCodeChain);

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

  private _getItemChainByFullCode(fullCode: string): TSdAppStructureItem<TModule>[] {
    const codeChain = fullCode.split(".");

    const result: TSdAppStructureItem<TModule>[] = [];

    let cursor: TSdAppStructureItem<TModule> | undefined;
    let cursorChildren = this.items;
    for (const currCode of codeChain) {
      cursor = cursorChildren.single((item) => item.code === currCode);
      cursorChildren = cursor != null && "children" in cursor ? cursor.children : [];
      if (cursor) {
        result.push(cursor);
      }
    }

    return result;
  }

  private _getMenus(
    items: TSdAppStructureItem<TModule>[],
    codeChain: string[] = [],
  ): ISdMenu<TModule>[] {
    const resultMenus: ISdMenu<TModule>[] = [];

    for (const item of items) {
      if ("isNotMenu" in item && item.isNotMenu) continue;

      const currCodeChain = [...codeChain, item.code];

      // 모듈 활성화 여부 확인
      if ("modules" in item && !this._isUsableModules(item.modules, this.usableModules())) continue;

      // 그룹 메뉴
      if ("children" in item) {
        const children = this._getMenus(item.children, currCodeChain);

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

        if (item.perms != null && !this.permRecord()?.[code + ".use"]) continue;

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

  isUsableModulesChain(modulesChain: TModule[][], usableModules: TModule[] | undefined) {
    for (const modules of modulesChain) {
      if (!this._isUsableModules(modules, usableModules)) {
        return false;
      }
    }

    return true;
  }

  // 하나라도 일치하면 화면 사용가능 (각 화면의 modules 관계는 OR)
  private _isUsableModules(
    modules: TModule[] | undefined,
    usableModules: TModule[] | undefined,
  ): boolean {
    return (
      modules == null ||
      modules.length === 0 ||
      !modules.every((module) => !usableModules?.includes(module))
    );
  }

  /*getOtherStructurePermsRoot(params: {
    appStructure: TSdAppStructureItem<TModule>[];
    title: string;
    codeChain: string[];
  }): ISdPermission<TModule> {
    return {
      title: params.title,
      codeChain: params.codeChain,
      modules: undefined,
      perms: undefined,
      children: this._getPerms(params.appStructure, params.codeChain),
    };
  }*/
}

export type TSdAppStructureItem<TModule> =
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

export interface ISdMenu<TModule> {
  title: string;
  codeChain: string[];
  icon: IconDefinition | undefined;
  modules: TModule[] | undefined;
  children: ISdMenu<TModule>[] | undefined;
}

export interface ISdFlatMenu<TModule> {
  titleChain: string[];
  codeChain: string[];
  modulesChain: TModule[][];
}

export interface ISdPermission<TModule> {
  title: string;
  codeChain: string[];
  modules: TModule[] | undefined;
  perms: ("use" | "edit")[] | undefined;
  children: ISdPermission<TModule>[] | undefined;
}

export interface ISdFlatPermission<TModule> {
  titleChain: string[];
  codeChain: string[];
  modulesChain: TModule[][];
}
