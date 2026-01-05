import type { WritableSignal } from "@angular/core";
import { ObjectUtils } from "@simplysm/sd-core-common";
import { $computed } from "../bindings/$computed";

export class SdSortingManager {
  constructor(private readonly _options: { sorts: WritableSignal<ISdSortingDef[]> }) {
  }

  defMap = $computed(() => {
    return this._options.sorts().toMap(item => item.key, item => {
      if (this._options.sorts().length < 2) {
        return { indexText: undefined, desc: item.desc };
      }

      const index = this._options.sorts().findIndex(item1 => item1.key === item.key);
      const indexText = index >= 0 ? (index + 1).toString() : undefined;
      return {
        indexText,
        desc: item.desc,
      };
    });
  });

  toggle(key: string, multiple: boolean) {
    this._options.sorts.update((v) => {
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

  sort<T>(items: T[]): T[] {
    let result = [...items];
    for (const sortDef of [...this._options.sorts()].reverse()) {
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
}

export interface ISdSortingDef {
  key: string;
  desc: boolean;
}
