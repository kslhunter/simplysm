import { Injectable } from "@angular/core";
import { ObjectUtil } from "@simplysm/sd-core-common";
import { IconDefinition } from "@fortawesome/fontawesome-common-types";

@Injectable({ providedIn: "root" })
export class SdAppStructureProvider {
  public items?: ISdAppStructureItem[];

  public get flatPermissions(): ISdFlatPermission[] {
    if (!this.items) throw new Error("SdAppStructureProvider.items가 설정되지 않았습니다.");
    return this._getFlatPermissions(this.items, [], []);
  }

  private _getFlatPermissions(paramMenus: ISdAppStructureItem[], codes: string[], modules: string[]): ISdFlatPermission[] {
    const results: ISdFlatPermission[] = [];
    for (const paramMenu of paramMenus) {
      const currCodes = codes.concat([paramMenu.code]);
      const currModules = modules.concat(paramMenu.modules ?? []);

      if (paramMenu.perms) {
        for (const perm of paramMenu.perms) {
          results.push({
            code: `${currCodes.join(".")}.${perm}`,
            modules: currModules
          });
        }
      }

      if (paramMenu.subPerms) {
        for (const subPerm of paramMenu.subPerms) {
          for (const perm of subPerm.perms) {
            results.push({
              code: `${currCodes.join(".")}.${subPerm.code}.${perm}`,
              modules: currModules
            });
          }
        }
      }

      if (paramMenu.children) {
        results.push(
          ...this._getFlatPermissions(paramMenu.children, currCodes, currModules)
        );
      }
    }

    return results;
  }

  public get menus(): ISdMenu[] {
    if (!this.items) throw new Error("SdAppStructureProvider.items가 설정되지 않았습니다.");
    return this._getMenus(this.items, []);
  }

  private _getMenus(paramMenus: ISdAppStructureItem[], codeChain: string[]): ISdMenu[] {
    const resultMenus: ISdMenu[] = [];
    for (const paramMenu of paramMenus) {
      if (paramMenu.isNotMenu) {
        continue;
      }

      const currCodeChain = codeChain.concat([paramMenu.code]);
      resultMenus.push({
        title: paramMenu.title,
        icon: paramMenu.icon,
        codeChain: currCodeChain,
        hasPerms: paramMenu.perms !== undefined,
        modules: paramMenu.modules,
        ...paramMenu.children ? {
          children: this._getMenus(paramMenu.children, currCodeChain)
        } : {}
      });
    }

    return resultMenus;
  }

  public get flatPages(): ISdFlatMenu[] {
    if (!this.items) throw new Error("SdAppStructureProvider.items가 설정되지 않았습니다.");
    return this._getFlatPages(this.items, [], [], []);
  }

  private _getFlatPages(paramMenus: ISdAppStructureItem[], titleChain: string[], codeChain: string[], modulesChain: string[][]): ISdFlatMenu[] {
    const resultFlatMenus: ISdFlatMenu[] = [];
    for (const paramMenu of paramMenus) {
      if (paramMenu.isNotPage) {
        continue;
      }

      const currTitleChain = titleChain.concat([paramMenu.title]);
      const currCodeChain = codeChain.concat([paramMenu.code]);
      const currModulesChain = paramMenu.modules ? modulesChain.concat([paramMenu.modules]) : modulesChain;

      if (paramMenu.children) {
        const childrenFlatMenus = this._getFlatPages(paramMenu.children, currTitleChain, currCodeChain, currModulesChain);
        resultFlatMenus.push(...childrenFlatMenus);
      }
      else {
        resultFlatMenus.push({
          titleChain: currTitleChain,
          codeChain: currCodeChain,
          modulesChain: currModulesChain,
          hasPerms: paramMenu.perms !== undefined
        });
      }
    }

    return resultFlatMenus;
  }

  public getTitleByCode(code: string): string {
    if (!this.items) throw new Error("SdAppStructureProvider.items가 설정되지 않았습니다.");

    const codes = code.split(".");

    const result: string[] = [];
    let cursor: ISdAppStructureItem | undefined;
    let cursorChildren = this.items;
    for (const currCode of codes) {
      cursor = cursorChildren.single((item) => item.code === currCode);
      cursorChildren = cursor?.children ?? [];
      if (cursor) {
        result.push(cursor.title);
      }
    }

    const parent = result.slice(0, -1).join(" > ");
    const current = result.last();
    return (parent ? `[${parent}] ` : "") + current;
  }

  public get permissions(): ISdPermission[] {
    if (!this.items) throw new Error("SdAppStructureProvider.items가 설정되지 않았습니다.");
    return this._getPermissions(this.items, []);
  }

  private _getPermissions(paramMenus: ISdAppStructureItem[], codes: string[]): ISdPermission[] {
    const results: ISdPermission[] = [];
    for (const paramMenu of paramMenus) {
      const currCodes = codes.concat([paramMenu.code]);

      if (paramMenu.perms || paramMenu.subPerms) {
        results.push({
          title: paramMenu.title,
          codes: currCodes,
          perms: paramMenu.perms,
          modules: paramMenu.modules,
          children: paramMenu.subPerms?.map((item) => ({
            title: item.title,
            codes: currCodes.concat([item.code]),
            perms: item.perms,
            modules: item.modules
          }))
        });
      }

      if (paramMenu.children) {
        results.push({
          title: paramMenu.title,
          codes: currCodes,
          modules: paramMenu.modules,
          children: this._getPermissions(paramMenu.children, codes.concat([paramMenu.code]))
        });
      }
    }

    return results;
  }

  public get permissionDisplayNameRecord(): Record<string, string> {
    if (!this.items) throw new Error("SdAppStructureProvider.items가 설정되지 않았습니다.");
    return this._getPermissionDisplayNameRecord(this.items, [], []);
  }

  private _getPermissionDisplayNameRecord(paramMenus: ISdAppStructureItem[], codes: string[], titles: string[]): Record<string, string> {
    let resultRecord: Record<string, string> = {};
    for (const paramMenu of paramMenus) {
      const currCodes = codes.concat([paramMenu.code]);
      const currTitles = titles.concat([paramMenu.title]);

      if (paramMenu.perms !== undefined) {
        if (paramMenu.perms.includes("use")) {
          resultRecord[currCodes.join(".") + ".use"] = currTitles.join(" > ") + " > 조회";
        }
        if (paramMenu.perms.includes("edit")) {
          resultRecord[currCodes.join(".") + ".edit"] = currTitles.join(" > ") + " > 편집";
        }
      }

      if (paramMenu.subPerms !== undefined) {
        for (const perm of paramMenu.subPerms) {
          if (perm.perms.includes("use")) {
            resultRecord[currCodes.join(".") + "." + perm.code + ".use"] = currTitles.join(" > ") + " > " + perm.title + " > 조회";
          }
          if (perm.perms.includes("edit")) {
            resultRecord[currCodes.join(".") + "." + perm.code + ".edit"] = currTitles.join(" > ") + " > " + perm.title + " > 편집";
          }
        }
      }

      if (paramMenu.children !== undefined) {
        resultRecord = ObjectUtil.merge(resultRecord, this._getPermissionDisplayNameRecord(paramMenu.children, currCodes, currTitles));
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
  icon?: IconDefinition;
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
  icon?: IconDefinition;
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
