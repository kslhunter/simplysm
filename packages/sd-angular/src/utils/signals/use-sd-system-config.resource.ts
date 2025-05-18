import { inject, Signal } from "@angular/core";
import { SdSystemConfigProvider } from "../../providers/sd-system-config.provider";
import { $resource } from "../bindings/$resource";
import { injectElementRef } from "../injections/inject-element-ref";

export function useSdSystemConfigResource<T>(
  options: { key: Signal<string> },
) {
  const sdSystemConfig = inject(SdSystemConfigProvider);
  const elRef = injectElementRef();

  const elTag = elRef.nativeElement.tagName.toLowerCase();

  return $resource<T, string>({
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
}