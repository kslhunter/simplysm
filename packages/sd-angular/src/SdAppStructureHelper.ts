import { TSdIconName, TSdIconPrefix } from "./commons";
import { ObjectUtil } from "@simplysm/sd-core-common";

export class SdAppStructureHelper {
  public static getFlatPermissions(menus: ISdAppStructureItem[], codes: string[] = [], modules: string[] = []): ISdFlatPermission[] {
    const results: ISdFlatPermission[] = [];
    for (const menu of menus) {
      const currCodes = codes.concat([menu.code]);

      if (menu.perms) {
        const currModules = modules.concat(menu.modules ?? []);
        for (const perm of menu.perms) {
          results.push({
            code: `${currCodes.join(".")}.${perm}`,
            modules: currModules
          });
        }
      }

      if (menu.subPerms) {
        for (const subPerm of menu.subPerms) {
          const currModules = modules.concat(subPerm.modules ?? []);
          for (const perm of subPerm.perms) {
            results.push({
              code: `${currCodes.join(".")}.${subPerm.code}.${perm}`,
              modules: currModules
            });
          }
        }
      }

      if (menu.children) {
        const currModules = modules.concat(menu.modules ?? []);
        results.push(
          ...this.getFlatPermissions(menu.children, currCodes, currModules)
        );
      }
    }

    return results;
  }

  public static getMenus(menus: ISdAppStructureItem[], codeChain: string[] = []): ISdMenu[] {
    const resultMenus: ISdMenu[] = [];
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
        ...menu.children ? {
          children: this.getMenus(menu.children, currCodeChain)
        } : {}
      });
    }

    return resultMenus;
  }

  public static getFlatPages(menus: ISdAppStructureItem[], titleChain: string[] = [], codeChain: string[] = [], modulesChain: string[][] = []): ISdFlatMenu[] {
    const resultFlatMenus: ISdFlatMenu[] = [];
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
      }
      else {
        resultFlatMenus.push({
          titleChain: currTitleChain,
          codeChain: currCodeChain,
          modulesChain: currModulesChain,
          hasPerms: menu.perms !== undefined
        });
      }
    }

    return resultFlatMenus;
  }

  public static getTitleByCode(menus: ISdAppStructureItem[], code: string, withoutParent?: boolean): string {
    const codes = code.split(".");

    const result: string[] = [];
    let cursor: ISdAppStructureItem | undefined;
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
    return withoutParent ? current : ((parent ? `[${parent}] ` : "") + current);
  }

  public static getPermissions(menus: ISdAppStructureItem[], codes: string[] = []): ISdPermission[] {
    const results: ISdPermission[] = [];
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
            modules: item.modules
          }))
        });
      }

      if (menu.children) {
        results.push({
          title: menu.title,
          codes: currCodes,
          modules: menu.modules,
          children: this.getPermissions(menu.children, codes.concat([menu.code]))
        });
      }
    }

    return results;
  }

  public static getPermissionDisplayNameRecord(menus: ISdAppStructureItem[], codes: string[] = [], titles: string[] = []): Record<string, string> {
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
            resultRecord[currCodes.join(".") + "." + perm.code + ".use"] = currTitles.join(" > ") + " > " + perm.title + " > 조회";
          }
          if (perm.perms.includes("edit")) {
            resultRecord[currCodes.join(".") + "." + perm.code + ".edit"] = currTitles.join(" > ") + " > " + perm.title + " > 편집";
          }
        }
      }

      if (menu.children !== undefined) {
        resultRecord = ObjectUtil.merge(resultRecord, this.getPermissionDisplayNameRecord(menu.children, currCodes, currTitles));
      }
    }

    return resultRecord;
  }
}

export interface ISdAppStructureItem {
  title: string;
  code: string;
  modules?: string[];
  perms?: ("use" | "edit")[];
  subPerms?: ISdAppStructureItemPermission[];
  icon?: [TSdIconPrefix, TSdIconName];
  isNotMenu?: boolean;
  isNotPage?: boolean;
  children?: ISdAppStructureItem[];
}

export interface ISdAppStructureItemPermission {
  title: string;
  code: string;
  modules?: string[];
  perms: ("use" | "edit")[];
}

export interface ISdFlatPermission {
  code: string;
  modules: string[];
}

export interface ISdMenu {
  title: string;
  codeChain: string[];
  hasPerms: boolean;
  icon?: [TSdIconPrefix, TSdIconName];
  modules?: string[];
  children?: ISdMenu[];
}

export interface ISdFlatMenu {
  titleChain: string[];
  codeChain: string[];
  modulesChain: string[][];
  hasPerms: boolean;
}

export interface ISdPermission {
  title: string;
  codes: string[];
  modules?: string[];
  perms?: ("use" | "edit")[];
  children?: ISdPermission[];
}
