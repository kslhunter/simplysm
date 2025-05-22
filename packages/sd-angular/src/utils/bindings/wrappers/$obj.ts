import { Signal, WritableSignal } from "@angular/core";
import { ObjectUtils } from "@simplysm/sd-core-common";

const ORIGIN_SNAPSHOT = Symbol();

export function $obj<T extends object>(sig: Signal<T> | WritableSignal<T>) {
  return {
    snapshot() {
      sig[ORIGIN_SNAPSHOT] = ObjectUtils.clone(sig());
    },
    changed() {
      const orgData = sig[ORIGIN_SNAPSHOT];
      return !ObjectUtils.equal(orgData, sig());
    },
    get origin(): T {
      return sig[ORIGIN_SNAPSHOT] ?? ObjectUtils.clone(sig());
    },
    updateField<K extends keyof T>(key: K, val: T[K]) {
      if (!("update" in sig)) throw new Error("Readonly signal does not support remove.");

      if (sig()[key] === val) return;

      sig.update(v => ({
        ...v,
        [key]: val,
      }));
    },
    deleteField<K extends keyof T>(key: K) {
      if (!("update" in sig)) throw new Error("Readonly signal does not support remove.");

      if (!(key in sig())) return;

      sig.update(v => {
        const r = { ...v };
        delete v[key];
        return r;
      });
    },
  };
}