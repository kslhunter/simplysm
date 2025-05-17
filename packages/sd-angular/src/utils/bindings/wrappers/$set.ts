import { WritableSignal } from "@angular/core";

export function $set<T>(sig: WritableSignal<Set<T>>) {
  return {
    toggle(value: T, addOrDel?: "add" | "del") {
      sig.update((v) => {
        if (addOrDel === "add") {
          if (!v.has(value)) {
            const r = new Set(v);
            r.add(value);
            return r;
          }
        }
        else if (addOrDel === "del") {
          if (v.has(value)) {
            const r = new Set(v);
            r.delete(value);
            return r;
          }
        }
        else if (v.has(value)) {
          const r = new Set(v);
          r.delete(value);
          return r;
        }
        else {
          const r = new Set(v);
          r.add(value);
          return r;
        }

        return v;
      });
    },
  };
}