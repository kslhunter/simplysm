import { SdAppStructureProvider } from "@simplysm/sd-angular";
import { inject } from "@angular/core";

export function injectPerms<K extends string>(viewCodes: string[], keys: K[]): Record<K, boolean> {
  return inject(SdAppStructureProvider).getCurrentPerms(viewCodes, keys);
}
