import type { CreateEffectOptions, EffectCleanupRegisterFn, EffectRef } from "@angular/core";
import { effect, untracked } from "@angular/core";

// export function $effect(
//   fn: (onCleanup: EffectCleanupRegisterFn) => Promise<void>,
//   options?: CreateEffectOptions,
// ): never;
export function $effect(
  fn: (onCleanup: EffectCleanupRegisterFn) => void,
  options?: CreateEffectOptions,
): EffectRef;
export function $effect(
  conditions: (() => unknown)[],
  fn: (onCleanup: EffectCleanupRegisterFn) => void | Promise<void>,
  options?: CreateEffectOptions,
): EffectRef;
export function $effect(
  arg1: ((onCleanup: EffectCleanupRegisterFn) => void) | (() => unknown)[],
  arg2?: ((onCleanup: EffectCleanupRegisterFn) => void | Promise<void>) | CreateEffectOptions,
  arg3?: CreateEffectOptions,
): EffectRef {
  const conditions = arg1 instanceof Array ? arg1 : undefined;
  const fn = (typeof arg1 === "function" ? arg1 : arg2) as (
    onCleanup: EffectCleanupRegisterFn,
  ) => void | Promise<void>;
  const options = (typeof arg1 === "function" ? arg2 : arg3) as CreateEffectOptions;

  if (conditions) {
    return effect(async (onCleanup) => {
      for (const sig of conditions) {
        sig();
      }

      await untracked(async () => {
        await fn(onCleanup);
      });
    }, options);
  } else {
    return effect((onCleanup) => fn(onCleanup), options);
  }
}
