import {ErrorHandler, ModuleWithProviders, NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {EVENT_MANAGER_PLUGINS} from "@angular/platform-browser";
import {SdResizeEventPlugin} from "./plugins/SdResizeEventPlugin";
import {SdMutationEventPlugin} from "./plugins/SdMutationEventPlugin";
import {SdAngularGlobalErrorHandler} from "./plugins/SdAngularGlobalErrorHandler";
import {SdSaveEventPlugin} from "./plugins/SdSaveEventPlugin";
import {SdModalProviderModule} from "./_modules/providers/SdModalProviderModule";
import {SdDataRefreshEventPlugin} from "./plugins/SdDataRefreshEventPlugin";

@NgModule({
  imports: [
    CommonModule,
    SdModalProviderModule
  ],
  providers: []
})
export class SdAngularModule {
  public constructor() {
    if (!window.navigator.userAgent.includes("Chrome")) {
      throw new Error("크롬외의 브라우저는 지원 하지 않습니다.");
    }
  }

  public static forRoot(): ModuleWithProviders<SdAngularModule> {
    return {
      ngModule: SdAngularModule,
      providers: [
        {provide: EVENT_MANAGER_PLUGINS, useClass: SdSaveEventPlugin, multi: true},
        {provide: EVENT_MANAGER_PLUGINS, useClass: SdDataRefreshEventPlugin, multi: true},
        {provide: EVENT_MANAGER_PLUGINS, useClass: SdResizeEventPlugin, multi: true},
        {provide: EVENT_MANAGER_PLUGINS, useClass: SdMutationEventPlugin, multi: true},
        {provide: ErrorHandler, useClass: SdAngularGlobalErrorHandler}
      ]
    };
  }
}
