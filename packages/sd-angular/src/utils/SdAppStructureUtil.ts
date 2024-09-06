import { ObjectUtil } from "@simplysm/sd-core-common";
import { IconProp } from "@fortawesome/fontawesome-svg-core";

export class SdAppStructureUtil {
  static getFlatPermissions<T extends string>(
    menus: ISdAppStructureItem<T>[],
    codes: string[] = [],
    modules: T[] = [],
  ): ISdFlatPermission<T>[] {
    const results: ISdFlatPermission<T>[] = [];
    for (const menu of menus) {
      const currCodes = codes.concat([menu.code]);

      if (menu.perms) {
        const currModules = modules.concat(menu.modules ?? []);
        for (const perm of menu.perms) {
          results.push({
            code: `${currCodes.join(".")}.${perm}`,
            modules: currModules,
          });
        }
      }

      if (menu.subPerms) {
        for (const subPerm of menu.subPerms) {
          const currModules = modules.concat(subPerm.modules ?? []);
          for (const perm of subPerm.perms) {
            results.push({
              code: `${currCodes.join(".")}.${subPerm.code}.${perm}`,
              modules: currModules,
            });
          }
        }
      }

      if (menu.children) {
        const currModules = modules.concat(menu.modules ?? []);
        results.push(...this.getFlatPermissions(menu.children, currCodes, currModules));
      }
    }

    return results;
  }

  static getMenus<T extends string>(menus: ISdAppStructureItem<T>[], codeChain: string[] = []): ISdMenu<T>[] {
    const resultMenus: ISdMenu<T>[] = [];
    for (const menu of menus) {
      if (menu.isNotMenu) {
        continue;
      }

      const currCodeChain = codeChain.concat([menu.code]);
      resultMenus.push({
        title: menu.title,
        icon: menu.icon,
        codeChain: currCodeChain,
        hasPerms: menu.perms !== undefined,
        modules: menu.modules,
        ...(menu.children
          ? {
              children: this.getMenus(menu.children, currCodeChain),
            }
          : {}),
      });
    }

    return resultMenus;
  }

  static getFlatPages<T extends string>(
    menus: ISdAppStructureItem<T>[],
    titleChain: string[] = [],
    codeChain: string[] = [],
    modulesChain: T[][] = [],
  ): ISdFlatPage<T>[] {
    const resultFlatMenus: ISdFlatPage<T>[] = [];
    for (const menu of menus) {
      if (menu.isNotPage) {
        continue;
      }

      const currTitleChain = titleChain.concat([menu.title]);
      const currCodeChain = codeChain.concat([menu.code]);
      const currModulesChain = menu.modules ? modulesChain.concat([menu.modules]) : modulesChain;

      if (menu.children) {
        const childrenFlatMenus = this.getFlatPages(menu.children, currTitleChain, currCodeChain, currModulesChain);
        resultFlatMenus.push(...childrenFlatMenus);
      } else {
        resultFlatMenus.push({
          titleChain: currTitleChain,
          codeChain: currCodeChain,
          modulesChain: currModulesChain,
          hasPerms: menu.perms !== undefined,
        });
      }
    }

    return resultFlatMenus;
  }

  static getTitleByCode(menus: ISdAppStructureItem[], code: string, withoutParent?: boolean): string {
    const codes = code.split(".");

    const result: string[] = [];
    let cursor: ISdAppStructureItem<string> | undefined;
    let cursorChildren = menus;
    for (const currCode of codes) {
      cursor = cursorChildren.single((item) => item.code === currCode);
      cursorChildren = cursor?.children ?? [];
      if (cursor) {
        result.push(cursor.title);
      }
    }

    const parent = result.slice(0, -1).join(" > ");
    const current = result.last()!;
    return withoutParent ? current : (parent ? `[${parent}] ` : "") + current;
  }

  static getPermissions<T extends string>(menus: ISdAppStructureItem<T>[], codes: string[] = []): ISdPermission<T>[] {
    const results: ISdPermission<T>[] = [];
    for (const menu of menus) {
      const currCodes = codes.concat([menu.code]);

      if (menu.perms || menu.subPerms) {
        results.push({
          title: menu.title,
          codes: currCodes,
          perms: menu.perms,
          modules: menu.modules,
          children: menu.subPerms?.map((item) => ({
            title: item.title,
            codes: currCodes.concat([item.code]),
            perms: item.perms,
            modules: item.modules,
          })),
        });
      }

      if (menu.children) {
        results.push({
          title: menu.title,
          codes: currCodes,
          modules: menu.modules,
          children: this.getPermissions(menu.children, codes.concat([menu.code])),
        });
      }
    }

    return results;
  }

  static getPermissionDisplayNameRecord(
    menus: ISdAppStructureItem[],
    codes: string[] = [],
    titles: string[] = [],
  ): Record<string, string> {
    let resultRecord: Record<string, string> = {};
    for (const menu of menus) {
      const currCodes = codes.concat([menu.code]);
      const currTitles = titles.concat([menu.title]);

      if (menu.perms !== undefined) {
        if (menu.perms.includes("use")) {
          resultRecord[currCodes.join(".") + ".use"] = currTitles.join(" > ") + " > 조회";
        }
        if (menu.perms.includes("edit")) {
          resultRecord[currCodes.join(".") + ".edit"] = currTitles.join(" > ") + " > 편집";
        }
      }

      if (menu.subPerms !== undefined) {
        for (const perm of menu.subPerms) {
          if (perm.perms.includes("use")) {
            resultRecord[currCodes.join(".") + "." + perm.code + ".use"] =
              currTitles.join(" > ") + " > " + perm.title + " > 조회";
          }
          if (perm.perms.includes("edit")) {
            resultRecord[currCodes.join(".") + "." + perm.code + ".edit"] =
              currTitles.join(" > ") + " > " + perm.title + " > 편집";
          }
        }
      }

      if (menu.children !== undefined) {
        resultRecord = ObjectUtil.merge(
          resultRecord,
          this.getPermissionDisplayNameRecord(menu.children, currCodes, currTitles),
        );
      }
    }

    return resultRecord;
  }
}

export interface ISdAppStructureItem<T extends string = string> {
  title: string;
  code: string;
  modules?: T[];
  perms?: ("use" | "edit")[];
  subPerms?: ISdAppStructureItemPermission<T>[];
  icon?: IconProp;
  isNotMenu?: boolean;
  isNotPage?: boolean;
  children?: ISdAppStructureItem<T>[];
}

// export interface ISdAppStructureItemPartial {
//   title?: string;
//   code: string;
//   modules?: string[];
//   perms?: ("use" | "edit")[];
//   subPerms?: ISdAppStructureItemPermission[];
//   icon?: IconProp;
//   isNotMenu?: boolean;
//   isNotPage?: boolean;
//   children?: ISdAppStructureItemPartial[];
// }

export interface ISdAppStructureItemPermission<T extends string = string> {
  title: string;
  code: string;
  modules?: T[];
  perms: ("use" | "edit")[];
}

export interface ISdFlatPermission<T extends string = string> {
  code: string;
  modules: T[];
}

export interface ISdMenu<T extends string = string> {
  title: string;
  codeChain: string[];
  hasPerms: boolean;
  icon?: IconProp;
  modules?: T[];
  children?: ISdMenu<T>[];
}

export interface ISdFlatPage<T extends string = string> {
  titleChain: string[];
  codeChain: string[];
  modulesChain: T[][];
  hasPerms: boolean;
}

export interface ISdPermission<T extends string = string> {
  title: string;
  codes: string[];
  modules?: T[];
  perms?: ("use" | "edit")[];
  children?: ISdPermission<T>[];
}
