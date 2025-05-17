import { inject, ResourceRef, Signal } from "@angular/core";
import { SdSystemConfigProvider } from "../../providers/sd-system-config.provider";
import { $resource } from "../bindings/$resource";
import { injectElementRef } from "../injections/inject-element-ref";

export function useSystemConfigManager<T>(options: {
  key: Signal<string>
}): {
  config: ResourceRef<T | undefined>
} {
  const sdSystemConfig = inject(SdSystemConfigProvider);
  const elRef = injectElementRef();

  const elTag = elRef.nativeElement.tagName.toLowerCase();

  const config = $resource({
    request: () => options.key(),
    loader: async ({ request }) => (
      await sdSystemConfig.getAsync(`${elTag}.${request}`)
    ),
    saver: (value) => {
      const key = options.key();

      queueMicrotask(async () => {
        await sdSystemConfig.setAsync(`${elTag}.${key}`, value);
      });
    },
  });

  /*$effect(() => {
    if (config.status() !== ResourceStatus.Local) return;

    const key = options.key();
    const value = config.value();

    queueMicrotask(async () => {
      await sdSystemConfig.setAsync(`${elTag}.${key}`, value);
    });
  });*/

  return { config };
}