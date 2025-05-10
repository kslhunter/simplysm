import { inject, Injectable } from "@angular/core";
import { SdAngularConfigProvider } from "./sd-angular-config.provider";
import {
  ISdAppStructureItem,
  ISdFlatPage,
  ISdMenu,
  ISdPermission,
  SdAppStructureUtils,
} from "../utils/sd-app-structure.utils";
import { $signal } from "../utils/hooks/hooks";

@Injectable({ providedIn: "root" })
export class SdAppStructureProvider<T extends string> {
  private _items = inject(SdAngularConfigProvider).appStructure as ISdAppStructureItem<T>[];

  private _usableModules = $signal<T[]>();
  private _permRecord = $signal<Record<string, boolean | undefined>>();

  initialize(
    usableModules?: T[],
    permRecord?: Record<string, boolean | undefined>,
  ) {
    this._usableModules.set(usableModules ?? []);
    this._permRecord.set(permRecord ?? {});
  }

  getTitleByCode(pageCode: string) {
    return SdAppStructureUtils.getTitleByCode(this._items, pageCode);
  }

  /*getViewPerms<K extends string>(viewCodes: string[], keys: K[]): Record<K, boolean> {
    //check
    for (const viewCode of viewCodes) {
      let cursor: ISdAppStructureItem<T> | undefined;
      let cursorChildren = this.#items;
      for (const code of viewCode.split(".")) {
        cursor = cursorChildren.single((item) => item.code === code);
        cursorChildren = cursor?.children ?? [];
      }
      for (const key of keys) {
        if (key === "use" || key === "edit") {
          if (!cursor?.perms?.includes(key as "use" | "edit")) {
            throw new Error(`정의되지 않은 권한 (${viewCode}, ${keys})`);
          }
        }
        else {
          const subPerm = cursor?.subPerms?.single(item => item.code === key.split(".")[0]);
          if (!subPerm?.perms.includes(key.split(".")[1] as "use" | "edit")) {
            throw new Error(`정의되지 않은 권한 (${viewCode}, ${keys}})`);
          }
        }
      }
    }

    const result: Record<string, boolean> = {};
    for (const key of keys) {
      result[key] = viewCodes.some((viewCode) => Boolean(this.#permRecord()?.[viewCode
      + "."
      + key]));
    }

    return result;
  }*/

  getViewPerms<K extends string>(viewCodes: string[], keys: K[]): K[] {
    const result = [] as K[];
    for (const key of keys) {
      if (viewCodes.some((viewCode) => Boolean(this._permRecord()?.[viewCode + "." + key]))) {
        result.push(key);
      }
      else {
        if (
          viewCodes.every(viewCode => (
            SdAppStructureUtils.getFlatPages(this._items)
              .single(item => item.codeChain.join(".") === viewCode)
              ?.hasPerms !== true
          ))
        ) {
          result.push(key);
        }
      }
    }

    return result;
  }

  getFlatPages() {
    if (!this._usableModules() || !this._permRecord()) return [];

    return SdAppStructureUtils.getFlatPages(this._items).filter(
      (item) =>
        (!item.hasPerms || Boolean(this._permRecord()?.[item.codeChain.join(".") + ".use"])) &&
        this._isUsableModulePage(item),
    );
  }

  getMenus() {
    if (!this._usableModules() || !this._permRecord()) return [];

    return this._getDisplayMenus();
  }

  getPerms() {
    if (!this._usableModules() || !this._permRecord()) return [];

    return this._getPermsByModule(SdAppStructureUtils.getPermissions(this._items));
  }

  getExtPermRoot(params: {
    appStructure: ISdAppStructureItem<T>[];
    title: string;
    codes: string[];
  }): ISdPermission {
    return {
      children: this._getPermsByModule(SdAppStructureUtils.getPermissions(
        params.appStructure,
        params.codes,
      )),
      title: params.title,
      codes: params.codes,
    };
  }

  private _getPermsByModule(perms: ISdPermission<T>[]): ISdPermission<T>[] {
    const realPerms: ISdPermission<T>[] = [];
    for (const perm of perms) {
      if (perm.children) {
        if (this._isModulesEnabled(perm.modules)) {
          if (perm.children.length < 1) {
            realPerms.push(perm);
          }
          else {
            const permChildren = this._getPermsByModule(perm.children);
            if (permChildren.length > 0 || perm.perms) {
              realPerms.push({ ...perm, children: permChildren });
            }
          }
        }
      }
      else {
        if (this._isModulesEnabled(perm.modules)) {
          realPerms.push(perm);
        }
      }
    }
    return realPerms;
  }

  private _getDisplayMenus(menus?: ISdMenu<T>[]): ISdMenu<T>[] {
    const result: ISdMenu<T>[] = [];

    for (const menu of menus ?? SdAppStructureUtils.getMenus(this._items)) {
      if ("children" in menu) {
        if (this._isModulesEnabled(menu.modules)) {
          const children = this._getDisplayMenus(menu.children);
          if (children.length > 0) {
            result.push({ ...menu, children });
          }
        }
      }
      else {
        const code = menu.codeChain.join(".");
        if (
          (!menu.hasPerms || this._permRecord()![code + ".use"] === true)
          && this._isModulesEnabled(menu.modules)
        ) {
          result.push(menu);
        }
      }
    }

    return result;
  }

  private _isUsableModulePage(page: ISdFlatPage<T>): boolean {
    for (const modules of page.modulesChain) {
      if (!this._isModulesEnabled(modules)) {
        return false;
      }
    }

    return true;
  }

  private _isModulesEnabled(needModules: T[] | undefined): boolean {
    return needModules == null
      || needModules.length === 0
      || !needModules.every((needModule) => !this._usableModules()!.includes(needModule));
  }
}
