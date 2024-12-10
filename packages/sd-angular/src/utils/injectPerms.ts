import { inject } from "@angular/core";
import { SdAppStructureProvider } from "../providers/sd-app-structure.provider";

/** @deprecated */
export function injectPerms<K extends string>(viewCodes: string[], keys: K[]): Record<K, boolean> {
  return inject(SdAppStructureProvider).getViewPerms(viewCodes, keys);
}

export function injectTitle(viewCode: string): string {
  return inject(SdAppStructureProvider).getTitleByCode(viewCode);
}