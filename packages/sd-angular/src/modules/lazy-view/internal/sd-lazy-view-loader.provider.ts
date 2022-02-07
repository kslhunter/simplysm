import { Injectable, NgModuleFactory, NgModuleRef, Type } from "@angular/core";
import { LoadChildrenCallback } from "@angular/router";
import { StringUtil } from "@simplysm/sd-core/common";
import { LazyComponent } from "./sd-lazy-view-loader.module";

@Injectable({ providedIn: "root" })
export class SdLazyViewLoaderProvider {
  private readonly _toLoad = new Map<string, LoadChildrenCallback>();
  private readonly _loading = new Map<string, ILazyComponent>();

  public constructor(private readonly _moduleRef: NgModuleRef<any>) {
  }

  public add(lazyComponent: LazyComponent): void {
    if (!this._loading.has(lazyComponent.code)) {
      this._toLoad.set(lazyComponent.code, lazyComponent.loadChildren);
    }
  }

  public async loadAsync(code: string): Promise<ILazyComponent> {
    if (this._loading.has(code)) {
      return this._loading.get(code)!;
    }

    if (this._toLoad.has(code)) {
      const moduleLoader = this._toLoad.get(code)!;
      const moduleFactory = await moduleLoader();
      const moduleRef = moduleFactory.create(this._moduleRef.injector);

      const pageName = StringUtil.toPascalCase(code.split(".").last()!) + "LazyPage";
      const component = moduleRef.instance[pageName];
      const result: ILazyComponent = { moduleFactory, moduleRef, component };
      this._loading.set(code, result);
      return result;
    }

    throw new Error(`모듈을 찾을 수 없습니다:${code}`);
  }

  public getComponentCode(component: Type<any>): string | undefined {
    return Array.from(this._loading.entries())
      .single((item) => item[1].component === component)
      ?.[0];
  }
}

export interface ILazyComponent {
  moduleFactory: NgModuleFactory<any>;
  moduleRef: NgModuleRef<any>;
  component: Type<any>;
}
