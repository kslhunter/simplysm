import type { WritableSignal } from "@angular/core";

export function $set<T>(sig: WritableSignal<Set<T>>) {
  return {
    deletes(...values: T[]) {
      sig.update(v => {
        const r = new Set(v);
        for (const value of values) {
          r.delete(value);
        }
        return r;
      });
    },
    delete(value: T) {
      sig.update(v => {
        const r = new Set(v);
        r.delete(value);
        return r;
      });
    },
    add(value: T) {
      sig.update(v => {
        const r = new Set(v);
        r.add(value);
        return r;
      });
    },
    adds(...values: T[]) {
      sig.update(v => {
        const r = new Set(v);
        r.adds(...values);
        return r;
      });
    },
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