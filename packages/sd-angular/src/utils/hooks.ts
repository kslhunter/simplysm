import { effect, inject, Injector, signal, Signal, untracked, WritableSignal } from "@angular/core";
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

  activatedRoute.routeConfig!.canDeactivate = [() => fn()];
}

export function effectBy(signals: Signal<any>[], fn: () => void) {
  effect(() => {
    for (const sig of signals) {
      sig();
    }

    untracked(() => {
      fn();
    });
  });
}

export function computedBy<R>(signals: Signal<any>[], fn: () => R | Promise<R>, opt: { initialValue: R }): Signal<R> {
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
}

// https://github.com/angular/angular/blob/main/packages/core/primitives/signals/src/signal.ts#L105
export function mark(sig: WritableSignal<any>) {
  const node = sig[SIGNAL] as any;
  node.version++;
  producerIncrementEpoch();
  producerNotifyConsumers(node);
  runPostSignalSetFn();
}

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
