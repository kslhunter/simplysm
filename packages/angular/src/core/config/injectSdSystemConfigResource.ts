import { ElementRef, ErrorHandler, inject, type ResourceRef, resource, type Signal } from "@angular/core";
import { SdSystemConfigProvider } from "./sd-system-config.provider";

export function injectSdSystemConfigResource<T>(options: { key: Signal<string | undefined> }) {
  const sdSystemConfig = inject<SdSystemConfigProvider<Record<string, T>>>(SdSystemConfigProvider);
  const elRef = inject(ElementRef);
  const errorHandler = inject(ErrorHandler);

  const elTag = elRef.nativeElement.tagName.toLowerCase();

  const res: ResourceRef<T | undefined> = resource({
    params: () => options.key(),
    loader: async ({ params: key }) => {
      return sdSystemConfig.getAsync(`${elTag}.${key}`);
    },
  });

  function set(value: T | undefined) {
    res.set(value);
    const key = options.key();
    if (key == null) return;
    queueMicrotask(() => {
      sdSystemConfig.setAsync(`${elTag}.${key}`, value).catch((err) => {
        errorHandler.handleError(err);
      });
    });
  }

  return {
    value: res.value,
    isLoading: res.isLoading,
    status: res.status,
    hasValue: () => res.hasValue(),
    reload: () => res.reload(),
    set,
    update(fn: (prev: T | undefined) => T | undefined) {
      const newValue = fn(res.value());
      set(newValue);
    },
  };
}
