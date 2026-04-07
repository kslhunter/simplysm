import { computed, inject, Injectable } from "@angular/core";
import type { Signal } from "@angular/core";
import type { TSdAppStructureItem, ISdFlatMenu } from "./sd-app-structure.types";
import { SdAppStructureUtils } from "./sd-app-structure.utils";

export function usePermsSignal<K extends string>(viewCodes: string[], keys: K[]): Signal<K[]> {
  const sdAppStructure = inject(SdAppStructureProvider);
  return computed(() => sdAppStructure.getPermsByFullCode(viewCodes, keys));
}

// 권한은 모듈만 체크하고
// 메뉴는 모듈/권한 모두 체크함
@Injectable({ providedIn: "root" })
export abstract class SdAppStructureProvider<TModule = unknown> {
  abstract items: TSdAppStructureItem<TModule>[];
  abstract usableModules: Signal<TModule[] | undefined>;
  abstract permRecord: Signal<Record<string, boolean> | undefined>;

  usableMenus = computed(() =>
    SdAppStructureUtils.getMenus(this.items, [], this.usableModules(), this.permRecord()),
  );
  usableFlatMenus = computed<ISdFlatMenu<TModule>[]>(() =>
    SdAppStructureUtils.getFlatMenus(this.items, this.usableModules(), this.permRecord()),
  );

  getPermissionsByStructure(items: TSdAppStructureItem<TModule>[], codeChain: string[] = []) {
    return SdAppStructureUtils.getPermissions(items, codeChain, this.usableModules());
  }

  getTitleByFullCode(fullCode: string) {
    return SdAppStructureUtils.getTitleByFullCode(this.items, fullCode);
  }

  getItemChainByFullCode(fullCode: string) {
    return SdAppStructureUtils.getItemChainByFullCode(this.items, fullCode);
  }

  getPermsByFullCode<K extends string>(fullCodes: string[], permKeys: K[]): K[] {
    return SdAppStructureUtils.getPermsByFullCode(
      this.items,
      fullCodes,
      permKeys,
      this.permRecord(),
    );
  }
}
