import { inject, Injectable } from "@angular/core";
import { SdAngularConfigProvider } from "./SdAngularConfigProvider";
import {
  ISdAppStructureItem,
  ISdFlatPage,
  ISdMenu,
  ISdPermission,
  SdAppStructureUtil
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

  getFlatPages() {
    if (!this.#usableModules || !this.#permissionRecord) return [];

    return SdAppStructureUtil.getFlatPages(this.#items).filter(
      (item) =>
        (!item.hasPerms || Boolean(this.#permissionRecord?.[item.codeChain.join(".") + ".use"])) &&
        this.#isUsableModulePage(item)
    );
  }

  getMenus() {
    if (!this.#usableModules || !this.#permissionRecord) return [];

    return this.#getDisplayMenus();
  }

  getPermsByModule(modules: T[]) {
    if (!this.#usableModules || !this.#permissionRecord) return [];

    return this.#getPermsByModule(modules, SdAppStructureUtil.getPermissions(this.#items));
  }

  #getPermsByModule(modules: T[], perms: ISdPermission<T>[]): ISdPermission<T>[] {
    const realPerms: ISdPermission<T>[] = [];
    for (const perm of perms) {
      if (perm.children) {
        if (this.#isModulesEnabled(modules, perm.modules)) {
          if (perm.children.length < 1) {
            realPerms.push(perm);
          }
          else {
            const permChildren = this.#getPermsByModule(modules, perm.children);
            if (permChildren.length > 0 || perm.perms) {
              realPerms.push({ ...perm, children: permChildren });
            }
          }
        }
      }
      else {
        if (this.#isModulesEnabled(modules, perm.modules)) {
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
        if (this.#isModulesEnabled(this.#usableModules!, menu.modules)) {
          const children = this.#getDisplayMenus(menu.children);
          if (children.length > 0) {
            result.push({ ...menu, children });
          }
        }
      }
      else {
        const code = menu.codeChain.join(".");
        if ((!menu.hasPerms || this.#permissionRecord![code + ".use"] === true)
          && this.#isModulesEnabled(this.#usableModules!, menu.modules)) {
          result.push(menu);
        }
      }
    }

    return result;
  }

  #isUsableModulePage(page: ISdFlatPage<T>): boolean {
    for (const modules of page.modulesChain) {
      if (!this.#isModulesEnabled(this.#usableModules!, modules)) {
        return false;
      }
    }

    return true;
  }

  #isModulesEnabled(currentModules: T[], needModules: T[] | undefined): boolean {
    return needModules == null
      || needModules.length === 0
      || !needModules.every((needModule) => !currentModules.includes(needModule));
  }
}
