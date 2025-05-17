/* eslint-disable @typescript-eslint/no-restricted-imports */

import { resource, ResourceOptions, ResourceRef, ResourceStatus } from "@angular/core";
import { $effect } from "./$effect";

export function $resource<T, R>(options: ResourceOptions<T, R> & {
  saver?: (param: T | undefined) => void | PromiseLike<void>
}): ResourceRef<T | undefined> {
  const sig = resource(options);

  if (options.saver) {
    $effect(async () => {
      if (
        sig.status() !== ResourceStatus.Local
        || sig.status() !== ResourceStatus.Resolved
      ) return;

      await options.saver!(sig.value());
    });
  }

  return sig;
}