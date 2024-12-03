import {
  computed,
  effect,
  EffectCleanupRegisterFn,
  EffectRef,
  inject,
  InputSignal,
  InputSignalWithTransform,
  OutputEmitterRef,
  reflectComponentType,
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
import { ActivatedRoute, CanDeactivateFn, Route } from "@angular/router";
import { ObjectUtil } from "@simplysm/sd-core-common";
import { injectElementRef } from "./injectElementRef";

const initializedRouteConfigSet = new Set<Route>();

export function canDeactivate(fn: () => boolean) {
  const activatedRoute = inject(ActivatedRoute);
  const elRef = injectElementRef();
  // const injector = inject(Injector);

  if (!activatedRoute.routeConfig) return;
  if (
    reflectComponentType(activatedRoute.component as any)?.selector !==
    elRef.nativeElement.tagName.toLowerCase()
  ) {
    return;
  }

  if (!initializedRouteConfigSet.has(activatedRoute.routeConfig)) {
    initializedRouteConfigSet.add(activatedRoute.routeConfig);

    const canDeactivateFn: CanDeactivateFn<{ __sdCanDeactivate__(): boolean }> = (component) => {
      return fn();
      // return component.__sdCanDeactivate__();
    };
    activatedRoute.routeConfig.canDeactivate = [canDeactivateFn];
  }

  // requestAnimationFrame(() => {
  //   const comp = injector["_lView"][8];
  //   comp["__sdCanDeactivate__"] = fn;
  // });
}

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
  const fn = (arg2 ? arg2 : arg1) as (onCleanup: EffectCleanupRegisterFn) => void | Promise<void>;

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
      { allowSignalWrites: true },
    );
  }
  else {
    return effect(
      (onCleanup) => fn(onCleanup),
      { allowSignalWrites: true },
    );
  }
}

export function $computed<R>(fn: () => Promise<R>): Signal<R | undefined>;
export function $computed<R>(fn: () => Promise<R>, opt: { initialValue?: R }): Signal<R>;
export function $computed<R>(signals: Signal<any>[], fn: () => Promise<R>): Signal<R | undefined>;
export function $computed<R>(signals: Signal<any>[], fn: () => Promise<R>, opt: { initialValue?: R }): Signal<R>;
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
      { allowSignalWrites: true },
    );

    return resultSig;
  }
  else {
    return computed(() => fn());
  }
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

export function $arr<T>(sig: WritableSignal<T[]>) { // 다
  return {
    insert(i: number, item: T) {
      sig.update((v) => {
        const r = [...v];
        r.insert(i, item);
        return r;
      });
    },
    remove(itemOrFn: T | ((item: T, i: number) => boolean)) {
      sig.update((v) => {
        const r = [...v];
        r.remove(itemOrFn as any);
        return r;
      });
    },
    snapshot(keyPropName: keyof T) {
      sig[ORIGIN_SNAPSHOT] = {
        keyPropName,
        snapshot: ObjectUtil.clone(sig()).toMap((item) => item[keyPropName]),
      };
    },
    changed(item: T) {
      if (sig[ORIGIN_SNAPSHOT] == null) return false;
      const orgItemMap = sig[ORIGIN_SNAPSHOT].snapshot as Map<any, any>;
      const keyPropName = sig[ORIGIN_SNAPSHOT].keyPropName as keyof T;

      if (item[keyPropName] == null) return true;

      const orgItem = orgItemMap.get(item[keyPropName]);
      return !ObjectUtil.equal(orgItem, item);
    },
    diffs() {
      if (sig[ORIGIN_SNAPSHOT] == null) return [];
      const orgItemMap = sig[ORIGIN_SNAPSHOT].snapshot as Map<any, any>;
      const keyPropName = sig[ORIGIN_SNAPSHOT].keyPropName as keyof T;

      return sig().oneWayDiffs(orgItemMap, keyPropName);
    },
  };
}

export function $obj<T>(sig: WritableSignal<T>) {
  return {
    snapshot() {
      sig[ORIGIN_SNAPSHOT] = ObjectUtil.clone(sig());
    },
    changed() {
      const orgData = sig[ORIGIN_SNAPSHOT];
      return !ObjectUtil.equal(orgData, sig());
    },
    get origin(): T {
      return sig[ORIGIN_SNAPSHOT];
    },
  };
}

export function $set<T>(sig: WritableSignal<Set<T>>) {
  return {
    toggle(value: T, addOrDel?: "add" | "del") {
      sig.update((v) => new Set(v).toggle(value, addOrDel));
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
