import { Inject, InjectionToken, ModuleWithProviders, NgModule, Optional } from "@angular/core";
import { CommonModule } from "@angular/common";
import { LoadChildren, ROUTES } from "@angular/router";
import { SdLazyPageLoaderProvider } from "./root-providers/SdLazyPageLoaderProvider";

export interface LazyComponent {
  code: string;
  loadChildren: LoadChildren;
}

export const LAZY_PAGES_TOKEN = new InjectionToken<LazyComponent[]>("LAZY_PAGES_TOKEN");

@NgModule({
  imports: [
    CommonModule
  ],
  providers: []
})
export class SdLazyPageLoaderModule {
  public constructor(lazyPageLoader: SdLazyPageLoaderProvider,
                     @Optional() @Inject(LAZY_PAGES_TOKEN) lazyPagesList?: LazyComponent[][]) {
    if (!window.navigator.userAgent.includes("Chrome")) {
      throw new Error("크롬외의 브라우저는 지원 하지 않습니다.");
    }

    if (lazyPagesList) {
      for (const lazyPages of lazyPagesList) {
        for (const lazyPage of lazyPages) {
          lazyPageLoader.add(lazyPage);
        }
      }
    }
  }

  public static forRoot(lazyPages: LazyComponent[]): ModuleWithProviders<SdLazyPageLoaderModule> {
    return {
      ngModule: SdLazyPageLoaderModule,
      providers: [
        { provide: LAZY_PAGES_TOKEN, multi: true, useValue: lazyPages },
        { provide: ROUTES, multi: true, useValue: lazyPages }
      ]
    };
  }
}