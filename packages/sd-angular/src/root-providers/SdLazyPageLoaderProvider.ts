import { createNgModule, Injectable, NgModuleRef, Type } from "@angular/core";
import { StringUtil } from "@simplysm/sd-core-common";
import { LazyComponent } from "../SdLazyPageLoaderModule";

@Injectable({ providedIn: "root" })
export class SdLazyPageLoaderProvider {
  private readonly _toLoad = new Map<string, () => Promise<Type<any>>>();
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
      const moduleType = await moduleLoader();
      const moduleRef = createNgModule(moduleType, this._moduleRef.injector);

      const pageName = StringUtil.toPascalCase(code.split(".").last()!) + "LazyPage";
      const component = moduleRef.instance[pageName];
      const result: ILazyComponent = { moduleFactory: moduleType, moduleRef, component };
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
  moduleFactory: any;
  moduleRef: NgModuleRef<any>;
  component: Type<any>;
}
