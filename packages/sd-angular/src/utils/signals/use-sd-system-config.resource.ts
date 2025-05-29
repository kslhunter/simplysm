import { inject, Signal } from "@angular/core";
import { SdSystemConfigProvider } from "../../providers/sd-system-config.provider";
import { $resource } from "../bindings/$resource";
import { injectElementRef } from "../injections/inject-element-ref";

export function useSdSystemConfigResource<T>(options: { key: Signal<string | undefined> }) {
  const sdSystemConfig = inject(SdSystemConfigProvider);
  const elRef = injectElementRef();

  const elTag = elRef.nativeElement.tagName.toLowerCase();

  return $resource<T, { key?: string }>({
    params: () => ({
      key: options.key(),
    }),
    loader: async ({ params }) => {
      if (params.key == null) return undefined;
      return await sdSystemConfig.getAsync(`${elTag}.${params.key}`);
    },
    saver: (value) => {
      const key = options.key();
      if (key == null) return;

      queueMicrotask(async () => {
        await sdSystemConfig.setAsync(`${elTag}.${key}`, value);
      });
    },
  });
}
