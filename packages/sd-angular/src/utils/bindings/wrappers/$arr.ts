import { Signal, WritableSignal } from "@angular/core";
import { ObjectUtils, TArrayDiffs2Result } from "@simplysm/sd-core-common";

const ORIGIN_SNAPSHOT = Symbol();

export function $arr<T>(sig: Signal<T[]> | WritableSignal<T[]>) {
  return {
    insert(i: number, item: T) {
      if (!("update" in sig)) throw new Error("Readonly signal does not support insert.");

      sig.update((v) => {
        const r = [...v];
        r.insert(i, item);
        return r;
      });
    },
    remove(itemOrFn: T | ((item: T, i: number) => boolean)) {
      if (!("update" in sig)) throw new Error("Readonly signal does not support remove.");

      sig.update((v) => {
        const r = [...v];
        r.remove(itemOrFn as any);
        return r;
      });
    },
    toggle(value: T) {
      if (!("update" in sig)) throw new Error("Readonly signal does not support toggle.");

      sig.update((v) => {
        if (v.includes(value)) {
          return v.filter((item) => item !== value);
        } else {
          return [...v, value];
        }

        return v;
      });
    },
    snapshot(keyPropNameOrFn: keyof T | ((item: T) => any)) {
      sig[ORIGIN_SNAPSHOT] = {
        keyPropNameOrFn,
        snapshot: ObjectUtils.clone(sig()).toMap((item) =>
          typeof keyPropNameOrFn === "function" ? keyPropNameOrFn(item) : item[keyPropNameOrFn],
        ),
      };
    },
    changed(item: T) {
      if (sig[ORIGIN_SNAPSHOT] == null) return false;
      const orgItemMap = sig[ORIGIN_SNAPSHOT].snapshot as Map<any, any>;
      const keyPropNameOrFn = sig[ORIGIN_SNAPSHOT].keyPropNameOrFn as keyof T | ((item: T) => any);

      const keyValue = typeof keyPropNameOrFn === "function" ? keyPropNameOrFn(item) : item[keyPropNameOrFn];

      if (keyValue == null) return true;
      const orgItem = orgItemMap.get(keyValue);
      return !ObjectUtils.equal(orgItem, item);
    },
    diffs(): TArrayDiffs2Result<T>[] {
      if (sig[ORIGIN_SNAPSHOT] == null) return [];
      const orgItemMap = sig[ORIGIN_SNAPSHOT].snapshot as Map<any, any>;
      const keyPropNameOrFn = sig[ORIGIN_SNAPSHOT].keyPropNameOrFn as keyof T | ((item: T) => any);

      return sig().oneWayDiffs(orgItemMap, keyPropNameOrFn);
    },
    get origin(): Map<any, T> {
      return sig[ORIGIN_SNAPSHOT]?.snapshot ?? new Map<any, T>();
    },
  };
}
