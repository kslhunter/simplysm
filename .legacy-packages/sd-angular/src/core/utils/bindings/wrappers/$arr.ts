import type { Signal, WritableSignal } from "@angular/core";
import type { TArrayDiffs2Result } from "@simplysm/sd-core-common";
import { ObjectUtils } from "@simplysm/sd-core-common";

const ORIGIN_SNAPSHOT = Symbol();

export function $arr<T>(sig: Signal<T[]> | WritableSignal<T[]>) {
  const mySig = sig as (Signal<T[]> | WritableSignal<T[]>) & {
    [ORIGIN_SNAPSHOT]?: {
      keyPropNameOrFn: keyof T | ((item: T) => any);
      snapshot: Map<any, T>;
    };
  };

  return {
    insert(i: number, item: T) {
      if (!("update" in mySig)) throw new Error("Readonly signal does not support insert.");

      mySig.update((v) => {
        const r = [...v];
        r.insert(i, item);
        return r;
      });
    },
    remove(itemOrFn: T | ((item: T, i: number) => boolean)) {
      if (!("update" in mySig)) throw new Error("Readonly signal does not support remove.");

      mySig.update((v) => {
        const r = [...v];
        r.remove(itemOrFn as any);
        return r;
      });
    },
    toggle(value: T) {
      if (!("update" in mySig)) throw new Error("Readonly signal does not support toggle.");

      mySig.update((v) => {
        if (v.includes(value)) {
          return v.filter((item) => item !== value);
        } else {
          return [...v, value];
        }
      });
    },
    snapshot(keyPropNameOrFn: keyof T | ((item: T) => any)) {
      mySig[ORIGIN_SNAPSHOT] = {
        keyPropNameOrFn,
        snapshot: ObjectUtils.clone(mySig()).toMap((item) =>
          typeof keyPropNameOrFn === "function" ? keyPropNameOrFn(item) : item[keyPropNameOrFn],
        ),
      };
    },
    changed(item: T) {
      if (mySig[ORIGIN_SNAPSHOT] == null) return false;
      const orgItemMap = mySig[ORIGIN_SNAPSHOT].snapshot as Map<any, any>;
      const keyPropNameOrFn = mySig[ORIGIN_SNAPSHOT].keyPropNameOrFn as
        | keyof T
        | ((item: T) => any);

      const keyValue =
        typeof keyPropNameOrFn === "function" ? keyPropNameOrFn(item) : item[keyPropNameOrFn];

      if (keyValue == null) return true;
      const orgItem = orgItemMap.get(keyValue);
      return !ObjectUtils.equal(orgItem, item);
    },
    diffs(options?: {
      includeSame?: boolean;
      excludes?: string[];
      includes?: string[];
    }): TArrayDiffs2Result<T>[] {
      if (mySig[ORIGIN_SNAPSHOT] == null) return [];
      const orgItemMap = mySig[ORIGIN_SNAPSHOT].snapshot as Map<any, any>;
      const keyPropNameOrFn = mySig[ORIGIN_SNAPSHOT].keyPropNameOrFn as
        | keyof T
        | ((item: T) => any);

      return mySig().oneWayDiffs(orgItemMap, keyPropNameOrFn, options);
    },
    get origin(): Map<any, T> {
      return mySig[ORIGIN_SNAPSHOT]?.snapshot ?? new Map<any, T>();
    },
  };
}
