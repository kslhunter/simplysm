import { inject, Injectable } from "@angular/core";
import { SdAngularConfigProvider } from "./SdAngularConfigProvider";
import { ISdAppStructureItem, ISdMenu, SdAppStructureUtil } from "../utils/SdAppStructureUtil";

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

  getFlatPages() {
    return SdAppStructureUtil.getFlatPages(this.#items);
  }

  getMenus() {
    if (!this.#usableModules || !this.#permissionRecord) return [];

    return this.#getDisplayMenus();
  }

  getCurrentPerms<K extends string>(viewCodes: string[], keys: K[]) {
    const result: Record<string, boolean> = {};
    for (const key of keys) {
      result[key] = viewCodes.some((viewCode) => this.#permissionRecord![viewCode + "." + key]);
    }

    return result;
  }

  #getDisplayMenus(menus?: ISdMenu<T>[]): ISdMenu<T>[] {
    const result: ISdMenu<T>[] = [];

    for (const menu of menus ?? SdAppStructureUtil.getMenus(this.#items)) {
      if ("children" in menu) {
        if (this.#isUsableModuleMenu(menu)) {
          const children = this.#getDisplayMenus(menu.children);
          if (children.length > 0) {
            result.push({ ...menu, children });
          }
        }
      } else {
        const code = menu.codeChain.join(".");
        if ((!menu.hasPerms || this.#permissionRecord![code + ".use"] === true) && this.#isUsableModuleMenu(menu)) {
          result.push(menu);
        }
      }
    }

    return result;
  }

  #isUsableModuleMenu(menu: ISdMenu<T>): boolean {
    if (!menu.modules || menu.modules.length === 0) {
      return true;
    }

    for (const moduleName of menu.modules) {
      if (this.#usableModules!.includes(moduleName)) {
        return true;
      }
    }

    return false;
  }
}
