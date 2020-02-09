import {ErrorHandler, ModuleWithProviders, NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdAngularGlobalErrorHandler} from "./commons/SdAngularGlobalErrorHandler";
import {EVENT_MANAGER_PLUGINS} from "@angular/platform-browser";
import {SdResizeEventPlugin} from "./commons/SdResizeEventPlugin";
import {SdMutationEventPlugin} from "./commons/SdMutationEventPlugin";
import {SdBusyContainerProvider} from "./providers/SdBusyContainerProvider";
import {SdLocalStorageProvider} from "./providers/SdLocalStorageProvider";
import {SdNavigateWindowProvider} from "./providers/SdNavigateWindowProvider";
import {SdSystemConfigProvider} from "./providers/SdSystemConfigProvider";

@NgModule({
  imports: [
    CommonModule
  ],
  providers: [
    SdBusyContainerProvider,
    SdLocalStorageProvider,
    SdNavigateWindowProvider,
    SdSystemConfigProvider,
    {provide: EVENT_MANAGER_PLUGINS, useClass: SdResizeEventPlugin, multi: true},
    {provide: EVENT_MANAGER_PLUGINS, useClass: SdMutationEventPlugin, multi: true},
    {provide: ErrorHandler, useClass: SdAngularGlobalErrorHandler}
  ]
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
        SdBusyContainerProvider
      ]
    };
  }
}
