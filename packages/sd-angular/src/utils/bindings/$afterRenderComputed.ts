
import { Signal } from "@angular/core";
import { $signal } from "@simplysm/sd-angular";
import { $afterRenderEffect } from "@simplysm/sd-angular";

export function $afterRenderComputed<R>(fn: () => R, opt: { initialValue: R }): Signal<R>;
export function $afterRenderComputed<R>(
  fn: () => R,
  opt?: { initialValue?: R },
): Signal<R | undefined>;
export function $afterRenderComputed<R>(
  fn: () => R,
  opt?: { initialValue?: R },
): Signal<R | undefined> {
  const resultSig = $signal<R | undefined>(opt?.initialValue);

  $afterRenderEffect(() => {
    resultSig.set(fn());
  });

  return resultSig;
}