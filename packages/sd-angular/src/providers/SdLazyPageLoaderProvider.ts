import {createNgModule, inject, Injectable, NgModuleRef, Type} from "@angular/core";
import {StringUtil} from "@simplysm/sd-core-common";
import {LazyComponent} from "../SdLazyPageLoaderModule";

@Injectable({providedIn: "root"})
export class SdLazyPageLoaderProvider {
  #moduleRef = inject(NgModuleRef);

  #toLoad = new Map<string, () => Promise<Type<any>>>();
  #loading = new Map<string, ILazyComponent>();

  add(lazyComponent: LazyComponent) {
    if (!this.#loading.has(lazyComponent.code)) {
      this.#toLoad.set(lazyComponent.code, lazyComponent.loadChildren);
    }
  }

  async loadAsync(code: string): Promise<ILazyComponent> {
    if (this.#loading.has(code)) {
      return this.#loading.get(code)!;
    }

    if (this.#toLoad.has(code)) {
      const moduleLoader = this.#toLoad.get(code)!;
      const moduleType = await moduleLoader();
      const moduleRef = createNgModule(moduleType, this.#moduleRef.injector);

      const pageName = StringUtil.toPascalCase(code.split(".").last()!) + "LazyPage";
      const component = moduleRef.instance[pageName];
      const result: ILazyComponent = {moduleFactory: moduleType, moduleRef, component};
      this.#loading.set(code, result);
      return result;
    }

    throw new Error(`모듈을 찾을 수 없습니다:${code}`);
  }

  getComponentCode(component: Type<any>): string | undefined {
    return Array.from(this.#loading.entries())
      .single((item) => item[1].component === component)
      ?.[0];
  }
}

export interface ILazyComponent {
  moduleFactory: any;
  moduleRef: NgModuleRef<any>;
  component: Type<any>;
}
