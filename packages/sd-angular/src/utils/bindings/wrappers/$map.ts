import { WritableSignal } from "@angular/core";

export function $map<K, T>(sig: WritableSignal<Map<K, T>>) {
  return {
    set(key: K, value: T) {
      sig.update((m) => new Map(m).set(key, value));
    },
    update(key: K, value: (val: T | undefined) => T) {
      sig.update((m) => new Map(m).set(key, value(m.get(key))));
    },
  };
}
