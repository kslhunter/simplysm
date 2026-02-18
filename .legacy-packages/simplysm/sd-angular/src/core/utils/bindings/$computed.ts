import type { Signal } from "@angular/core";
import { computed, effect, signal, untracked } from "@angular/core";

// export function $computed<R>(fn: () => Promise<R>): Signal<R | undefined>;
// export function $computed<R>(fn: () => Promise<R>, opt: { initialValue?: R }): Signal<R>;
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

    effect(() => {
      for (const sig of signals) {
        sig();
      }

      void untracked(async () => {
        resultSig.set(await fn());
      });
    });

    return resultSig;
  } else {
    return computed(() => fn());
  }
}
