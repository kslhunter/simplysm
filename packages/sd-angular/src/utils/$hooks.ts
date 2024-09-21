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
  WritableSignal,
} from "@angular/core";
import {
  producerIncrementEpoch,
  producerNotifyConsumers,
  runPostSignalSetFn,
  SIGNAL,
} from "@angular/core/primitives/signals";
import { ActivatedRoute } from "@angular/router";

export function afterInit(fn: () => void) {
  const injector = inject(Injector);
  (injector["_lView"][1].preOrderHooks ??= []).push(injector["_tNode"].index, -injector["_tNode"].directiveStart, () =>
    fn(),
  );
}

export function beforeDestroy(fn: () => void) {
  const injector = inject(Injector);
  (injector["_lView"][1].destroyHooks ??= []).push(injector["_tNode"].directiveStart, () => fn());
}

export function canDeactivate(fn: () => boolean) {
  const activatedRoute = inject(ActivatedRoute);

  (activatedRoute.routeConfig!.canDeactivate ??= []).push(() => fn());
}

/*export function effectBy(signals: Signal<any>[], fn: () => void) {
  effect(() => {
    for (const sig of signals) {
      sig();
    }

    untracked(() => {
      fn();
    });
  });
}*/

/*export function computedBy<R>(signals: Signal<any>[], fn: () => R | Promise<R>, opt: { initialValue: R }): Signal<R> {
  const newSignal = signal<R>(opt.initialValue);

  effect(() => {
    for (const sig of signals) {
      sig();
    }

    void untracked(async () => {
      newSignal.set(await fn());
    });
  });

  return newSignal;
}*/

/*type Signal<T> = (() => T) & {
  readonly [SIGNAL]: unknown;
};*/

// type TSignalWrap<T extends Signal<any>> = T;

export function $signal<T>(): WritableSignal<T | undefined> & { mark(): void };
export function $signal<T>(initialValue: T): WritableSignal<T> & { mark(): void };
export function $signal<T>(initialValue?: T): WritableSignal<T | undefined> & { mark(): void } {
  const sig = signal(initialValue);
  sig["mark"] = () => {
    const node = sig[SIGNAL] as any;
    node.version++;
    producerIncrementEpoch();
    producerNotifyConsumers(node);
    runPostSignalSetFn();
  };
  return sig as any;
  /*const sig = signal(initialValue);
  Object.defineProperty(sig, "value", {
    get() {
      return sig();
    },
    configurable: false,
    enumerable: true
  });
  return sig as any;*/
}

export function $effect(fn: (onCleanup: EffectCleanupRegisterFn) => void): EffectRef;
export function $effect<T extends never>(fn: (onCleanup: EffectCleanupRegisterFn) => Promise<void>): T;
export function $effect(signals: Signal<any>[], fn: (onCleanup: EffectCleanupRegisterFn) => void): EffectRef;
export function $effect(
  arg1: ((onCleanup: EffectCleanupRegisterFn) => void) | Signal<any>[],
  arg2?: (onCleanup: EffectCleanupRegisterFn) => void,
): EffectRef {
  const sigs = (arg2 ? arg1 : undefined) as Signal<any>[] | undefined;
  const fn = (arg2 ? arg2 : arg1) as (onCleanup: EffectCleanupRegisterFn) => void;

  if (sigs) {
    return effect(
      (onCleanup) => {
        for (const sig of sigs) {
          sig();
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

export function $computed<R>(fn: () => R): Signal<R>;
export function $computed<R>(signals: Signal<any>[], fn: () => R): Signal<R>;
export function $computed<R>(fn: () => Promise<R>): Signal<R | undefined>;
export function $computed<R>(fn: () => Promise<R>, opt: { initialValue?: R }): Signal<R>;
export function $computed<R>(signals: Signal<any>[], fn: () => Promise<R>): Signal<R | undefined>;
export function $computed<R>(signals: Signal<any>[], fn: () => Promise<R>, opt: { initialValue?: R }): Signal<R>;
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
  } else {
    /*const sig = computed(() => fn());
    Object.defineProperty(sig, "value", {
      get() {
        return sig();
      },
      configurable: false,
      enumerable: true
    });
    return sig as any;*/
    return computed(() => fn());
  }
}

// https://github.com/angular/angular/blob/main/packages/core/primitives/signals/src/signal.ts#L105
/*export function mark(sig: WritableSignal<any>) {
  const node = sig[SIGNAL] as any;
  node.version++;
  producerIncrementEpoch();
  producerNotifyConsumers(node);
  runPostSignalSetFn();
}*/

// type InjectedSignals<T> = {
//   [P in keyof T as T[P] extends Signal<any> ? P : never]: T[P] extends Signal<infer U> ? U : never;
// }
//
// export function injectSignals<T extends Type<any>>(type: T, component: InstanceType<T>): InjectedSignals<InstanceType<T>> {
//   const result = {} as any;
//   for (const key of Object.keys(component)) {
//     if (
//       typeof component[key] === "function" && (
//         (component[key].toString() as string).startsWith("[Signal: ") ||
//         (component[key].toString() as string).startsWith("[Input Signal: ") ||
//         (component[key].toString() as string).startsWith("[Model Signal: ") ||
//         (component[key].toString() as string).startsWith("[Computed: ")
//       )
//     ) {
//       Object.defineProperty(result, key, {
//         get() {
//           return component[key]();
//         },
//         enumerable: true,
//         configurable: false
//       });
//     }
//   }
//
//   return result;
//   // const reflect = reflectComponentType(component.constructor as Type<T>);
//
//   // const result = {} as any;
//   // for (const inp of reflect!.inputs) {
//   //   Object.defineProperty(result, inp.propName, {
//   //     get() {
//   //       return component[inp.propName]();
//   //     },
//   //     enumerable: true,
//   //     configurable: false
//   //   });
//   // }
//   //
//   // return result;
// }

/*
export function getter<F extends (...args: any[]) => any>(fn: F): F {
  const injector = inject(Injector);
  const sigCaches: {
    args: any[];
    sig: Signal<any>;
  }[] = [];

  return ((...args) => {
    // JSON을 써야할듯.... 같은 object인데 내부 값이 바뀐것도 감지할 필요가 있음..
    const sigCache = sigCaches.single((item) => {
      if (args.length !== item.args.length) return false;

      for (let i = 0; i < args.length; i++) {
        if (args[i] !== item.args[i]) {
          return false;
        }
      }
      return true;
    });

    if (sigCache) {
      return sigCache.sig();
    }

    return runInInjectionContext(injector, () => {
      const newSigCache = {
        args: args,
        sig: computed(() => fn(...args)),
      };
      sigCaches.push();
      return newSigCache.sig();
    });
  }) as F;
}
*/
