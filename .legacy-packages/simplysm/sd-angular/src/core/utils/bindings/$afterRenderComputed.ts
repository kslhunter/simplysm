import type { Signal } from "@angular/core";
import { afterRenderEffect, signal } from "@angular/core";

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
