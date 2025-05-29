import { resource, ResourceOptions, ResourceRef } from "@angular/core";
import { $effect } from "./$effect";

export function $resource<T, R>(
  options: ResourceOptions<T, R> & {
    saver?: (param: T | undefined) => void | PromiseLike<void>;
  },
): ResourceRef<T | undefined> {
  const sig = resource(options);

  if (options.saver) {
    $effect(() => {
      if (sig.status() !== "local") return;

      const value = sig.value();

      queueMicrotask(async () => {
        await options.saver!(value);
      });
    });
  }

  return sig;
}
