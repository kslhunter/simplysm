import type { Signal, WritableSignal } from "@angular/core";
import { ObjectUtils } from "@simplysm/sd-core-common";

const ORIGIN_SNAPSHOT = Symbol();

export function $obj<T extends object | undefined>(sig: Signal<T> | WritableSignal<T>) {
  const mySig = sig as (Signal<T> | WritableSignal<T>) & {
    [ORIGIN_SNAPSHOT]?: T;
  };

  return {
    snapshot() {
      mySig[ORIGIN_SNAPSHOT] = ObjectUtils.clone(mySig());
    },
    changed() {
      const orgData = mySig[ORIGIN_SNAPSHOT];
      return orgData != null && !ObjectUtils.equal(orgData, mySig());
    },
    get origin(): T | undefined {
      return mySig[ORIGIN_SNAPSHOT];
    },
    updateField<K extends keyof T>(key: K, val: T[K]) {
      if (!("update" in sig)) throw new Error("Readonly signal does not support remove.");

      if (sig() && sig()![key] === val) return;

      sig.update((v) => ({
        ...v,
        [key]: val,
      }));
    },
    deleteField<K extends keyof T>(key: K) {
      if (!("update" in sig)) throw new Error("Readonly signal does not support remove.");

      if (sig() && !(key in sig()!)) return;

      sig.update((v) => {
        const r = { ...v } as any;
        delete r[key];
        return r;
      });
    },
  };
}
