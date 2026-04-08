import { computed, inject, Injectable, signal } from "@angular/core";
import type { Signal } from "@angular/core";
import type { AppStructureService } from "@simplysm/service-common";
import type { AppStructureItem, SdFlatMenu } from "./sd-app-structure.types";
import { SdAppStructureUtils } from "./sd-app-structure.utils";
import { SdServiceClientFactoryProvider } from "./sd-service-client-factory.provider";
import { SdAngularConfigProvider } from "./sd-angular-config.provider";

export function injectPermsSignal<K extends string>(viewCodes: string[], keys: K[]): Signal<K[]> {
  const sdAppStructure = inject(SdAppStructureProvider);
  return computed(() => sdAppStructure.getPermsByFullCode(viewCodes, keys));
}

// 권한은 모듈만 체크하고
// 메뉴는 모듈/권한 모두 체크함
@Injectable({ providedIn: "root" })
export class SdAppStructureProvider<TModule = unknown> {
  private readonly _clientFactory = inject(SdServiceClientFactoryProvider);
  private readonly _config = inject(SdAngularConfigProvider);

  readonly usableModules = signal<TModule[] | undefined>(undefined);
  readonly permRecord = signal<Record<string, boolean> | undefined>(undefined);
  readonly items = signal<AppStructureItem<TModule>[]>([]);

  async initialize(serviceKey: string): Promise<void> {
    const client = this._clientFactory.get(serviceKey);
    const svc = client.getService<AppStructureService>("AppStructure");
    const itemsMap = await svc.getItems();
    this.items.set(
      (itemsMap[this._config.clientName] ?? []) as AppStructureItem<TModule>[],
    );
  }

  usableMenus = computed(() =>
    SdAppStructureUtils.getMenus(this.items(), [], this.usableModules(), this.permRecord()),
  );
  usableFlatMenus = computed<SdFlatMenu<TModule>[]>(() =>
    SdAppStructureUtils.getFlatMenus(this.items(), this.usableModules(), this.permRecord()),
  );

  getPermissionsByStructure(items: AppStructureItem<TModule>[], codeChain: string[] = []) {
    return SdAppStructureUtils.getPermissions(items, codeChain, this.usableModules());
  }

  getTitleByFullCode(fullCode: string) {
    return SdAppStructureUtils.getTitleByFullCode(this.items(), fullCode);
  }

  getItemChainByFullCode(fullCode: string) {
    return SdAppStructureUtils.getItemChainByFullCode(this.items(), fullCode);
  }

  getPermsByFullCode<K extends string>(fullCodes: string[], permKeys: K[]): K[] {
    return SdAppStructureUtils.getPermsByFullCode(
      this.items(),
      fullCodes,
      permKeys,
      this.permRecord(),
    );
  }
}
