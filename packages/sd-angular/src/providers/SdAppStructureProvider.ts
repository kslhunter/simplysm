import { inject, Injectable } from "@angular/core";
import { SdAngularConfigProvider } from "./SdAngularConfigProvider";
import {
  ISdAppStructureItem,
  ISdFlatPage,
  ISdMenu,
  ISdPermission,
  SdAppStructureUtil,
} from "../utils/SdAppStructureUtil";

@Injectable({ providedIn: "root" })
export class SdAppStructureProvider<T extends string> {
  #items = inject(SdAngularConfigProvider).appStructure as ISdAppStructureItem<T>[];

  #usableModules?: T[];
  #permissionRecord?: Record<string, boolean | undefined>;

  initialize(usableModules?: T[], permissionRecord?: Record<string, boolean | undefined>) {
    this.#usableModules = usableModules ?? [];
    this.#permissionRecord = permissionRecord ?? {};
  }

  getTitleByCode(pageCode: string) {
    return SdAppStructureUtil.getTitleByCode(this.#items, pageCode);
  }

  getViewPerms<K extends string>(viewCodes: string[], keys: K[]) {
    const result: Record<string, boolean> = {};
    for (const key of keys) {
      result[key] = viewCodes.some((viewCode) => Boolean(this.#permissionRecord?.[viewCode + "." + key]));
    }

    return result;
  }

  getModules(keys: T[]) {
    const result: Record<string, boolean> = {};
    for (const key of keys) {
      result[key] = Boolean(this.#usableModules?.includes(key));
    }

    return result;
  }

  getFlatPages() {
    if (!this.#usableModules || !this.#permissionRecord) return [];

    return SdAppStructureUtil.getFlatPages(this.#items).filter(
      (item) =>
        (!item.hasPerms || Boolean(this.#permissionRecord?.[item.codeChain.join(".") + ".use"])) &&
        this.#isUsableModulePage(item),
    );
  }

  getMenus() {
    if (!this.#usableModules || !this.#permissionRecord) return [];

    return this.#getDisplayMenus();
  }

  getPerms() {
    if (!this.#usableModules || !this.#permissionRecord) return [];

    return this.#getPermsByModule(SdAppStructureUtil.getPermissions(this.#items));
  }

  getExtPermRoot(params: {
    appStructure: ISdAppStructureItem<T>[];
    title: string;
    codes: string[];
  }): ISdPermission {
    return {
      children: this.#getPermsByModule(SdAppStructureUtil.getPermissions(params.appStructure, params.codes)),
      title: params.title,
      codes: params.codes,
    };
  }

  #getPermsByModule(perms: ISdPermission<T>[]): ISdPermission<T>[] {
    const realPerms: ISdPermission<T>[] = [];
    for (const perm of perms) {
      if (perm.children) {
        if (this.#isModulesEnabled(perm.modules)) {
          if (perm.children.length < 1) {
            realPerms.push(perm);
          }
          else {
            const permChildren = this.#getPermsByModule(perm.children);
            if (permChildren.length > 0 || perm.perms) {
              realPerms.push({ ...perm, children: permChildren });
            }
          }
        }
      }
      else {
        if (this.#isModulesEnabled(perm.modules)) {
          realPerms.push(perm);
        }
      }
    }
    return realPerms;
  }

  #getDisplayMenus(menus?: ISdMenu<T>[]): ISdMenu<T>[] {
    const result: ISdMenu<T>[] = [];

    for (const menu of menus ?? SdAppStructureUtil.getMenus(this.#items)) {
      if ("children" in menu) {
        if (this.#isModulesEnabled(menu.modules)) {
          const children = this.#getDisplayMenus(menu.children);
          if (children.length > 0) {
            result.push({ ...menu, children });
          }
        }
      }
      else {
        const code = menu.codeChain.join(".");
        if ((!menu.hasPerms || this.#permissionRecord![code + ".use"] === true)
          && this.#isModulesEnabled(menu.modules)) {
          result.push(menu);
        }
      }
    }

    return result;
  }

  #isUsableModulePage(page: ISdFlatPage<T>): boolean {
    for (const modules of page.modulesChain) {
      if (!this.#isModulesEnabled(modules)) {
        return false;
      }
    }

    return true;
  }

  #isModulesEnabled(needModules: T[] | undefined): boolean {
    return needModules == null
      || needModules.length === 0
      || !needModules.every((needModule) => !this.#usableModules!.includes(needModule));
  }
}
