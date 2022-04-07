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
  public static forRoot(): ModuleWithProviders<SdAngularMobileModule> {
    return {
      ngModule: SdAngularMobileModule,
      providers: [
        { provide: EVENT_MANAGER_PLUGINS, useClass: SdAndroidBackbuttonEventPlugin, multi: true }
      ]
    };
  }
}
