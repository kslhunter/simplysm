import type { AppStructureItem } from "@simplysm/service-common";
import {
  getFlatPermissions,
  isUsableModules,
  isUsableModulesChain,
} from "@simplysm/service-common";
import type { SdMenu, SdFlatMenu, SdPermission } from "./sd-app-structure.types";

export abstract class SdAppStructureUtils {
  //---------- Info

  static getTitleByFullCode<TModule>(items: AppStructureItem<TModule>[], fullCode: string): string {
    const title = this.findTitleByFullCode(items, fullCode);
    if (title == null) {
      throw new Error(`Item not found for fullCode: ${fullCode}`);
    }
    return title;
  }

  /** 항목을 못 찾으면 throw 대신 undefined 반환 (결측 보존). */
  static findTitleByFullCode<TModule>(
    items: AppStructureItem<TModule>[],
    fullCode: string,
  ): string | undefined {
    const itemChain = this.getItemChainByFullCode(items, fullCode);
    if (itemChain.length === 0) {
      return undefined;
    }
    const parent = itemChain
      .slice(0, -1)
      .map((item) => item.title)
      .join(" > ");
    const current = itemChain.last()!.title;
    return (parent ? `[${parent}] ` : "") + current;
  }

  static getPermsByFullCode<TModule, K extends string>(
    items: AppStructureItem<TModule>[],
    fullCodes: string[],
    permKeys: K[],
    permRecord: Record<string, boolean> | undefined,
  ): K[] {
    if (permRecord == null) return [] as K[];

    const result = [] as K[];
    for (const permKey of permKeys) {
      // 해당 권한이 설정되어있거나
      if (fullCodes.some((fullCode) => permRecord[fullCode + "." + permKey])) {
        result.push(permKey);
      }
      // 권한이라는것이 아얘 존재하지 않거나
      else if (
        fullCodes.every((fullCode) => {
          const item = this.getItemChainByFullCode(items, fullCode).last();
          return item != null && !("perms" in item);
        })
      ) {
        result.push(permKey);
      }
    }

    return result;
  }

  static getItemChainByFullCode<TModule>(
    items: AppStructureItem<TModule>[],
    fullCode: string,
  ): AppStructureItem<TModule>[] {
    const codeChain = fullCode.split(".");

    const result: AppStructureItem<TModule>[] = [];

    let cursorChildren = items;
    for (const currCode of codeChain) {
      const cursor = cursorChildren.single((item) => item.code === currCode);
      if (cursor == null) return [];
      cursorChildren = "children" in cursor ? cursor.children : [];
      result.push(cursor);
    }

    return result;
  }

  //---------- Menus

  static getMenus<TModule>(
    items: AppStructureItem<TModule>[],
    codeChain: string[],
    usableModules: TModule[] | undefined,
    permRecord: Record<string, boolean> | undefined,
  ): SdMenu[] {
    const resultMenus: SdMenu[] = [];

    for (const item of items) {
      if ("isNotMenu" in item && item.isNotMenu) continue;

      const currCodeChain = [...codeChain, item.code];

      // 모듈 활성화 여부 확인
      if (!isUsableModules(item.modules, item.requiredModules, usableModules)) continue;

      // 그룹 메뉴
      if ("children" in item) {
        const children = this.getMenus(item.children, currCodeChain, usableModules, permRecord);

        // 자식 중 표시 가능한 게 있으면 그룹 메뉴 포함
        if (children.length > 0) {
          resultMenus.push({
            title: item.title,
            icon: item.icon,
            codeChain: currCodeChain,
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
          url: item.url,
        });
      }
    }

    return resultMenus;
  }

  static getFlatMenus<TModule>(
    items: AppStructureItem<TModule>[],
    usableModules: TModule[] | undefined,
    permRecord: Record<string, boolean> | undefined,
  ): SdFlatMenu<TModule>[] {
    const resultFlatMenus: SdFlatMenu<TModule>[] = [];

    type QueueItem = {
      item: AppStructureItem<TModule>;
      titleChain: string[];
      codeChain: string[];
      modulesChain: TModule[][];
      requiredModulesChain: TModule[][];
    };

    const queue: QueueItem[] = items.map((item) => ({
      item,
      titleChain: [],
      codeChain: [],
      modulesChain: [],
      requiredModulesChain: [],
    }));

    while (queue.length > 0) {
      const { item, titleChain, codeChain, modulesChain, requiredModulesChain } = queue.shift()!;

      if ("isNotMenu" in item && item.isNotMenu) continue;

      const currTitleChain = [...titleChain, item.title];
      const currCodeChain = [...codeChain, item.code];
      const currModulesChain = item.modules ? [...modulesChain, item.modules] : modulesChain;
      const currRequiredModulesChain = item.requiredModules
        ? [...requiredModulesChain, item.requiredModules]
        : requiredModulesChain;

      if (!isUsableModulesChain(currModulesChain, currRequiredModulesChain, usableModules))
        continue;

      if ("children" in item) {
        for (const child of item.children) {
          queue.push({
            item: child,
            titleChain: currTitleChain,
            codeChain: currCodeChain,
            modulesChain: currModulesChain,
            requiredModulesChain: currRequiredModulesChain,
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
    items: AppStructureItem<TModule>[],
    codeChain: string[],
    usableModules: TModule[] | undefined,
  ): SdPermission<TModule>[] {
    const results: SdPermission<TModule>[] = [];
    for (const item of items) {
      const currCodeChain = [...codeChain, item.code];

      // 모듈 활성화 여부 확인
      if (!isUsableModules(item.modules, item.requiredModules, usableModules)) continue;

      // 그룹
      if ("children" in item) {
        const children = this.getPermissions(item.children, currCodeChain, usableModules);

        results.push({
          title: item.title,
          codeChain: currCodeChain,
          modules: item.modules,
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
    items: AppStructureItem<TModule>[],
    usableModules: TModule[] | undefined,
  ) {
    return getFlatPermissions(items, usableModules);
  }
}
