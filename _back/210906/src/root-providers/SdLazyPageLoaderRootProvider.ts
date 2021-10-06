import { Injectable, NgModuleFactory, NgModuleRef, Type } from "@angular/core";
import { LazyPage } from "../modules/lazy-page-view/SdLazyPageViewModule";
import { LoadChildrenCallback } from "@angular/router";
import { StringUtil } from "@simplysm/sd-core-common";

@Injectable({ providedIn: "root" })
export class SdLazyPageLoaderRootProvider {
  private readonly _toLoad = new Map<string, LoadChildrenCallback>();
  private readonly _loading = new Map<string, ILazyPage>();

  public constructor(private readonly _moduleRef: NgModuleRef<any>) {
  }

  public add(lazyPage: LazyPage): void {
    if (!this._loading.has(lazyPage.code)) {
      this._toLoad.set(lazyPage.code, lazyPage.loadChildren as LoadChildrenCallback);
    }
  }

  public async loadAsync(code: string): Promise<ILazyPage> {
    if (this._loading.has(code)) {
      return this._loading.get(code)!;
    }

    if (this._toLoad.has(code)) {
      const moduleLoader = this._toLoad.get(code)!;
      const moduleFactory = await moduleLoader();
      const moduleRef = moduleFactory.create(this._moduleRef.injector);

      const pageName = StringUtil.toPascalCase(code.split(".").last()!) + "LazyPage";
      const component = moduleRef.instance[pageName];
      const result: ILazyPage = { moduleFactory, moduleRef, component };
      this._loading.set(code, result);
      return result;
    }

    throw new Error(`모듈을 찾을 수 없습니다:${code}`);
  }

  public getPageCode(component: Type<any>): string | undefined {
    return Array.from(this._loading.entries())
      .single((item) => item[1].component === component)
      ?.[0];
  }
}

export interface ILazyPage {
  moduleFactory: NgModuleFactory<any>;
  moduleRef: NgModuleRef<any>;
  component: Type<any>;
}
