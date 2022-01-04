import { ModuleWithProviders, NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { SdAndroidBackbuttonEventPlugin } from "./plugins/SdAndroidBackbuttonEventPlugin";

@NgModule({
  imports: [
    CommonModule
  ],
  providers: []
})
export class SdAngularMobileModule {
  public constructor() {
    if (!window.navigator.userAgent.includes("Chrome")) {
      throw new Error("크롬 및 IE Edge 외의 브라우저는 지원 하지 않습니다.");
    }

    // document.addEventListener("touchstart", (event: Event) => {
    //   if (!event.target) return;
    //   const el = event.target as HTMLElement;
    //   const parents = el.getParents();
    //   for (const parent of parents) {
    //     parent.classList.add("touch");
    //   }
    // }, true);
    // document.addEventListener("touchend", (event: Event) => {
    //   if (!event.target) return;
    //   const el = event.target as HTMLElement;
    //   const parents = el.getParents();
    //   for (const parent of parents) {
    //     parent.classList.remove("touch");
    //   }
    // }, true);
  }

  public static forRoot(): ModuleWithProviders<SdAngularMobileModule> {
    return {
      ngModule: SdAngularMobileModule,
      providers: [
        { provide: EVENT_MANAGER_PLUGINS, useClass: SdAndroidBackbuttonEventPlugin, multi: true }
      ]
    };
  }
}
