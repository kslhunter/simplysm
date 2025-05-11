import { effect, inject, InputSignal, resource, ResourceRef, ResourceStatus } from "@angular/core";
import { SdSystemConfigProvider } from "../providers/sd-system-config.provider";
import { injectElementRef } from "../utils/dom/element-ref.injector";

export function useSdSystemConfig<T>(keySignal: InputSignal<string>): ResourceRef<T | undefined> {
  const sdSystemConfig = inject(SdSystemConfigProvider);
  const elRef = injectElementRef();

  const elTag = elRef.nativeElement.tagName.toLowerCase();

  const config = resource({
    request: () => keySignal(),
    loader: async ({ request }) => (
      await sdSystemConfig.getAsync(`${elTag}.${request}`)
    ),
  });

  effect(() => {
    if (config.status() !== ResourceStatus.Local) return;

    const key = keySignal();
    const value = config.value();

    queueMicrotask(async () => {
      await sdSystemConfig.setAsync(`${elTag}.${key}`, value);
    });
  });

  return config;
}