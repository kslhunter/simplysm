import { ElementRef, inject, type ResourceRef, resource, type Signal } from "@angular/core";
import { SdSystemConfigProvider } from "../providers/sd-system-config.provider";

export function useSdSystemConfigResource<T>(options: { key: Signal<string | undefined> }) {
  const sdSystemConfig = inject<SdSystemConfigProvider<Record<string, T>>>(SdSystemConfigProvider);
  const elRef = inject(ElementRef);

  const elTag = elRef.nativeElement.tagName.toLowerCase();

  const res: ResourceRef<T | undefined> = resource({
    params: () => options.key(),
    loader: async ({ params: key }) => {
      return (await sdSystemConfig.getAsync(`${elTag}.${key}`)) as T | undefined;
    },
  });

  return {
    value: res.value,
    isLoading: res.isLoading,
    status: res.status,
    hasValue: () => res.hasValue(),
    reload: () => res.reload(),
    set(value: T | undefined) {
      res.set(value);
      const key = options.key();
      if (key == null) return;
      queueMicrotask(async () => {
        await sdSystemConfig.setAsync(`${elTag}.${key}`, value as T);
      });
    },
    update(fn: (prev: T | undefined) => T | undefined) {
      const newValue = fn(res.value());
      this.set(newValue);
    },
  };
}
