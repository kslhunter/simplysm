import {
  computed,
  effect,
  EffectCleanupRegisterFn,
  EffectRef,
  inject,
  Injector,
  Signal,
  signal,
  untracked,
} from "@angular/core";
import { ActivatedRoute, CanDeactivateFn, Route } from "@angular/router";

const initializedRouteConfigSet = new Set<Route>();

export function canDeactivate(fn: () => boolean) {
  const activatedRoute = inject(ActivatedRoute);
  const injector = inject(Injector);

  if (!initializedRouteConfigSet.has(activatedRoute.routeConfig!)) {
    initializedRouteConfigSet.add(activatedRoute.routeConfig!);

    const canDeactivateFn: CanDeactivateFn<{ __sdCanDeactivate__(): boolean }> = (component) => {
      return component.__sdCanDeactivate__();
    };
    activatedRoute.routeConfig!.canDeactivate = [canDeactivateFn];
  }

  requestAnimationFrame(() => {
    const comp = injector["_lView"][8];
    comp["__sdCanDeactivate__"] = fn;
  });
}

export function $effect(fn: (onCleanup: EffectCleanupRegisterFn) => Promise<void>): never;
export function $effect(fn: (onCleanup: EffectCleanupRegisterFn) => void): EffectRef;
export function $effect(
  signals: (Signal<any> | { value: any })[],
  fn: (onCleanup: EffectCleanupRegisterFn) => void,
): EffectRef;
export function $effect(
  arg1: ((onCleanup: EffectCleanupRegisterFn) => void) | (Signal<any> | { value: any })[],
  arg2?: (onCleanup: EffectCleanupRegisterFn) => void,
): EffectRef {
  const sigs = (arg2 ? arg1 : undefined) as (Signal<any> | { value: any })[] | undefined;
  const fn = (arg2 ? arg2 : arg1) as (onCleanup: EffectCleanupRegisterFn) => void;

  if (sigs) {
    return effect(
      (onCleanup) => {
        for (const sig of sigs) {
          if ("value" in sig) {
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            sig.value;
          } else {
            sig();
          }
        }

        untracked(() => {
          fn(onCleanup);
        });
      },
      { allowSignalWrites: true },
    );
  } else {
    return effect((onCleanup) => fn(onCleanup), { allowSignalWrites: true });
  }
}

export function $computed<R>(fn: () => Promise<R>): { readonly value: R | undefined };
export function $computed<R>(fn: () => Promise<R>, opt: { initialValue?: R }): { readonly value: R };
export function $computed<R>(signals: Signal<any>[], fn: () => Promise<R>): { readonly value: R | undefined };
export function $computed<R>(
  signals: Signal<any>[],
  fn: () => Promise<R>,
  opt: { initialValue?: R },
): { readonly value: R };
export function $computed<R>(fn: () => R): { readonly value: R };
export function $computed<R>(signals: Signal<any>[], fn: () => R): { readonly value: R };
export function $computed(...args: any): { readonly value: any } {
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

    return {
      get value() {
        return resultSig();
      },
    };
  } else {
    const resultSig = computed(() => fn());

    return {
      get value() {
        return resultSig();
      },
    };
  }
}

/*
export function $getter<F extends (...args: any[]) => any>(fn: F): F {
  const sigCache = new TreeMap<{ value: any }>();

  return ((...args) => {
    return sigCache.getOrCreate(
      args,
      $computed(() => fn(args)),
    ).value;
  }) as F;
}
*/
