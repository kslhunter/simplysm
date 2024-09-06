import { inject, InjectionToken, ModuleWithProviders, NgModule, Type } from "@angular/core";
import { ROUTES } from "@angular/router";
import { SdLazyPageLoaderProvider } from "./providers/SdLazyPageLoaderProvider";

export interface LazyComponent {
  code: string;
  loadChildren: () => Promise<Type<any>>;
}

export const LAZY_PAGES_TOKEN = new InjectionToken<LazyComponent[]>("LAZY_PAGES_TOKEN");

@NgModule({
  imports: [],
  providers: [],
})
export class SdLazyPageLoaderModule {
  #lazyPageLoader = inject(SdLazyPageLoaderProvider);
  #lazyPagesList = inject(LAZY_PAGES_TOKEN, { optional: true });

  constructor() {
    if (this.#lazyPagesList) {
      for (const lazyPage of this.#lazyPagesList) {
        this.#lazyPageLoader.add(lazyPage);
      }
    }
  }

  static forRoot(lazyPages: LazyComponent[]): ModuleWithProviders<SdLazyPageLoaderModule> {
    return {
      ngModule: SdLazyPageLoaderModule,
      providers: [
        { provide: LAZY_PAGES_TOKEN, multi: true, useValue: lazyPages },
        { provide: ROUTES, multi: true, useValue: lazyPages },
      ],
    };
  }
}
