/* eslint-disable @typescript-eslint/no-restricted-imports */

import { effect, EffectCleanupRegisterFn, EffectRef, Signal, untracked } from "@angular/core";

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