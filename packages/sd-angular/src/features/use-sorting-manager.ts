import { WritableSignal } from "@angular/core";
import { ObjectUtils } from "@simplysm/sd-core-common";

export function useSortingManager(defs: WritableSignal<ISortingDef[]>) {
  function getIndexText(key: string) {
    if (defs().length < 2) {
      return undefined;
    }
    const index = defs().findIndex((item) => item.key === key);
    return index >= 0 ? (index + 1).toString() : undefined;
  }

  function getIsDesc(key: string) {
    return defs().single((item) => item.key === key)?.desc;
  }

  function toggle(key: string, multiple: boolean) {
    defs.update((v) => {
      let r = [...v];
      const ordItem = r.single((item) => item.key === key);
      if (ordItem) {
        if (ordItem.desc) {
          r.remove(ordItem);
        }
        else {
          ordItem.desc = !ordItem.desc;
        }
      }
      else {
        if (multiple) {
          r.push({ key, desc: false });
        }
        else {
          r = [{ key, desc: false }];
        }
      }

      return r;
    });
  }

  function sort<T>(items: T[]): T[] {
    let result = [...items];
    for (const sortDef of [...defs()].reverse()) {
      if (sortDef.desc) {
        result = result.orderByDesc((item) => ObjectUtils.getChainValue(
          item,
          sortDef.key,
        ));
      }
      else {
        result = result.orderBy((item) => {
          return ObjectUtils.getChainValue(item, sortDef.key);
        });
      }
    }
    return result;
  }

  return {
    sort,
    getIndexText,
    getIsDesc,
    toggle,
  };
}

export interface ISortingDef {
  key: string;
  desc: boolean;
}