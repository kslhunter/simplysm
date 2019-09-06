import {ErrorHandler, ModuleWithProviders, NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {EVENT_MANAGER_PLUGINS} from "@angular/platform-browser";
import {LinkActionDirective} from "./LinkActionDirective";
import {ResizeEventPlugin} from "./ResizeEventPlugin";
import {SdLocalStorageProvider} from "./SdLocalStorageProvider";
import {GlobalErrorHandler} from "./GlobalErrorHandler";
import {SdConfigProvider} from "./SdConfigProvider";
import {SdLogProvider} from "./SdLogProvider";

@NgModule({
  imports: [
    CommonModule
  ],
  exports: [
    LinkActionDirective
  ],
  declarations: [
    LinkActionDirective
  ]
})
export class SdSharedModule {
  public static forRoot(): ModuleWithProviders<SdSharedModule> {
    return {
      ngModule: SdSharedModule,
      providers: [
        SdLogProvider,
        SdLocalStorageProvider,
        SdConfigProvider,
        {provide: ErrorHandler, useClass: GlobalErrorHandler},
        {provide: EVENT_MANAGER_PLUGINS, useClass: ResizeEventPlugin, multi: true}
      ]
    };
  }
}
