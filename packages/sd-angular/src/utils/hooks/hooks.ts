import {
  afterRenderEffect,
  computed,
  effect,
  EffectCleanupRegisterFn,
  EffectRef,
  InputSignal,
  InputSignalWithTransform,
  OutputEmitterRef,
  Signal,
  signal,
  untracked,
  WritableSignal,
} from "@angular/core";
import {
  producerIncrementEpoch,
  producerNotifyConsumers,
  producerUpdatesAllowed,
  runPostSignalSetFn,
  SIGNAL,
} from "@angular/core/primitives/signals";
import { ObjectUtils, TArrayDiffs2Result } from "@simplysm/sd-core-common";

export interface SdWritableSignal<T> extends WritableSignal<T> {
  $mark(): void;
}

export function $signal<T>(): SdWritableSignal<T | undefined>;
export function $signal<T>(initialValue: T): SdWritableSignal<T>;
export function $signal<T>(initialValue?: T): SdWritableSignal<T | undefined> {
  const sig = signal(initialValue) as SdWritableSignal<T | undefined>;
  sig.$mark = () => $mark(sig);
  return sig;
}

export function $effect(fn: (onCleanup: EffectCleanupRegisterFn) => Promise<void>): never;
export function $effect(fn: (onCleanup: EffectCleanupRegisterFn) => void): EffectRef;
export function $effect(
  signals: Signal<any>[],
  fn: (onCleanup: EffectCleanupRegisterFn) => void | Promise<void>,
): EffectRef;
export function $effect(
  arg1: ((onCleanup: EffectCleanupRegisterFn) => void) | Signal<any>[],
  arg2?: (onCleanup: EffectCleanupRegisterFn) => void,
): EffectRef {
  const sigs = (arg2 ? arg1 : undefined) as Signal<any>[] | undefined;
  const fn = (arg2 ?? arg1) as (onCleanup: EffectCleanupRegisterFn) => void | Promise<void>;

  if (sigs) {
    return effect(
      async (onCleanup) => {
        for (const sig of sigs) {
          sig();
        }

        await untracked(async () => {
          await fn(onCleanup);
        });
      },
    );
  }
  else {
    return effect((onCleanup) => fn(onCleanup));
  }
}


export function $afterRenderEffect(fn: (onCleanup: EffectCleanupRegisterFn) => Promise<void>): never;
export function $afterRenderEffect(fn: (onCleanup: EffectCleanupRegisterFn) => void): EffectRef;
export function $afterRenderEffect(
  signals: Signal<any>[],
  fn: (onCleanup: EffectCleanupRegisterFn) => void | Promise<void>,
): EffectRef;
export function $afterRenderEffect(
  arg1: ((onCleanup: EffectCleanupRegisterFn) => void) | Signal<any>[],
  arg2?: (onCleanup: EffectCleanupRegisterFn) => void,
): EffectRef {
  const sigs = (arg2 ? arg1 : undefined) as Signal<any>[] | undefined;
  const fn = (arg2 ?? arg1) as (onCleanup: EffectCleanupRegisterFn) => void | Promise<void>;

  if (sigs) {
    return afterRenderEffect(
      async (onCleanup) => {
        for (const sig of sigs) {
          sig();
        }

        await untracked(async () => {
          await fn(onCleanup);
        });
      },
    );
  }
  else {
    return afterRenderEffect((onCleanup) => fn(onCleanup));
  }
}

export function $computed<R>(fn: () => Promise<R>): Signal<R | undefined>;
export function $computed<R>(fn: () => Promise<R>, opt: { initialValue?: R }): Signal<R>;
export function $computed<R>(signals: Signal<any>[], fn: () => Promise<R>): Signal<R | undefined>;
export function $computed<R>(
  signals: Signal<any>[],
  fn: () => Promise<R>,
  opt: { initialValue?: R },
): Signal<R>;
export function $computed<R>(fn: () => R): Signal<R>;
export function $computed<R>(signals: Signal<any>[], fn: () => R): Signal<R>;
export function $computed(...args: any): Signal<any> {
  const signals: Signal<any>[] | undefined = args[0] instanceof Array ? args[0] : undefined;
  const fn: () => any | Promise<any> = args[0] instanceof Array ? args[1] : args[0];
  const opt: { initialValue?: any } | undefined = args[0] instanceof Array ? args[2] : args[1];

  if (signals) {
    const resultSig = signal<any>(opt?.initialValue);

    effect(
      () => {
        for (const sig of signals) {
          sig();
        }

        void untracked(async () => {
          resultSig.set(await fn());
        });
      },
    );

    return resultSig;
  }
  else {
    return computed(() => fn());
  }
}

export function $afterRenderComputed<R>(fn: () => R, opt: { initialValue: R }): Signal<R>;
export function $afterRenderComputed<R>(
  fn: () => R,
  opt?: { initialValue?: R },
): Signal<R | undefined>;
export function $afterRenderComputed<R>(
  fn: () => R,
  opt?: { initialValue?: R },
): Signal<R | undefined> {
  const resultSig = signal<R | undefined>(opt?.initialValue);

  afterRenderEffect(() => {
    resultSig.set(fn());
  });

  return resultSig;
}

export type TEffFn<FN extends Function> = FN & {
  signals: Signal<any>[];
};

export function effFn<FN extends Function>(signals: Signal<any>[], fn: FN): TEffFn<FN> {
  fn["signals"] = signals;
  return fn as TEffFn<FN>;
}

export function $model<T>(
  input: InputSignal<T> | InputSignalWithTransform<T, any>,
  output: OutputEmitterRef<T>,
): SdWritableSignal<T> {
  const sig = $signal<T>(input[SIGNAL]["value"]);
  const orgSet = sig.set;

  $effect(() => {
    orgSet(input());
  });

  sig.set = (v: T) => {
    if (output["listeners"]?.[0] != null) {
      output.emit(v);
    }
    else {
      orgSet(v);
    }
  };

  sig.update = (fn: (v: T) => T) => {
    const v = fn(sig[SIGNAL]!["value"]);
    if (output["listeners"]?.[0] != null) {
      output.emit(v);
    }
    else {
      orgSet(v);
    }
  };

  return sig;
}

export function $mark(sig: WritableSignal<any>) {
  if (!producerUpdatesAllowed()) {
    throw new Error();
  }

  const node = sig[SIGNAL] as any;
  node.version++;
  producerIncrementEpoch();
  producerNotifyConsumers(node);
  runPostSignalSetFn();
}

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
          return v.filter(item => item !== value);
        }
        else {
          return [...v, value];
        }

        return v;
      });
    },
    snapshot(keyPropName: keyof T) {
      sig[ORIGIN_SNAPSHOT] = {
        keyPropName,
        snapshot: ObjectUtils.clone(sig()).toMap((item) => item[keyPropName]),
      };
    },
    changed(item: T) {
      if (sig[ORIGIN_SNAPSHOT] == null) return false;
      const orgItemMap = sig[ORIGIN_SNAPSHOT].snapshot as Map<any, any>;
      const keyPropName = sig[ORIGIN_SNAPSHOT].keyPropName as keyof T;

      if (item[keyPropName] == null) return true;

      const orgItem = orgItemMap.get(item[keyPropName]);
      return !ObjectUtils.equal(orgItem, item);
    },
    diffs(): TArrayDiffs2Result<T>[] {
      if (sig[ORIGIN_SNAPSHOT] == null) return [];
      const orgItemMap = sig[ORIGIN_SNAPSHOT].snapshot as Map<any, any>;
      const keyPropName = sig[ORIGIN_SNAPSHOT].keyPropName as keyof T;

      return sig().oneWayDiffs(orgItemMap, keyPropName);
    },
    get origin(): Map<any, T> {
      return sig[ORIGIN_SNAPSHOT]?.snapshot ?? new Map<any, T>();
    },
  };
}

export function $obj<T extends Record<any, any>>(sig: Signal<T> | WritableSignal<T>) {
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
