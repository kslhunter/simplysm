import { Inject, InjectionToken, ModuleWithProviders, NgModule, Optional } from "@angular/core";
import { CommonModule } from "@angular/common";
import { LoadChildren, ROUTES } from "@angular/router";
import { SdLazyPageLoaderRootProvider } from "../../root-providers/SdLazyPageLoaderRootProvider";
import { SdToastModule } from "../toast/SdToastModule";
import { SdBusyContainerControlModule } from "../busy-container/SdBusyContainerControlModule";
import { SdLazyPageViewControl } from "./SdLazyPageViewControl";


export interface LazyPage {
  code: string;
  loadChildren: LoadChildren;
}

export const LAZY_PAGES_TOKEN = new InjectionToken<LazyPage[]>("LAZY_PAGES_TOKEN");

@NgModule({
  imports: [
    CommonModule,
    SdToastModule,
    SdBusyContainerControlModule
  ],
  declarations: [
    SdLazyPageViewControl
  ],
  exports: [
    SdLazyPageViewControl
  ],
  providers: []
})
export class SdLazyPageViewModule {
  public constructor(lazyPageLoader: SdLazyPageLoaderRootProvider,
                     @Optional() @Inject(LAZY_PAGES_TOKEN) lazyPagesList?: LazyPage[][]) {
    if (!window.navigator.userAgent.includes("Chrome")) {
      throw new Error("크롬 및 IE Edge 외의 브라우저는 지원 하지 않습니다.");
    }

    if (lazyPagesList) {
      for (const lazyPages of lazyPagesList) {
        for (const lazyPage of lazyPages) {
          lazyPageLoader.add(lazyPage);
        }
      }
    }
  }

  public static forRoot(lazyPages: LazyPage[]): ModuleWithProviders<SdLazyPageViewModule> {
    return {
      ngModule: SdLazyPageViewModule,
      providers: [
        { provide: LAZY_PAGES_TOKEN, multi: true, useValue: lazyPages },
        { provide: ROUTES, multi: true, useValue: lazyPages }
      ]
    };
  }
}
