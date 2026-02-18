import type { EffectCleanupRegisterFn, EffectRef, Signal } from "@angular/core";
import { afterRenderEffect, untracked } from "@angular/core";

export function $afterRenderEffect(
  fn: (onCleanup: EffectCleanupRegisterFn) => Promise<void>,
): never;
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
    return afterRenderEffect(async (onCleanup) => {
      for (const sig of sigs) {
        sig();
      }

      await untracked(async () => {
        await fn(onCleanup);
      });
    });
  } else {
    return afterRenderEffect((onCleanup) => fn(onCleanup));
  }
}
