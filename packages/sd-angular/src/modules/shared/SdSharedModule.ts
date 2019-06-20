import {ErrorHandler, ModuleWithProviders, NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {EVENT_MANAGER_PLUGINS} from "@angular/platform-browser";
import {LinkActionDirective} from "./LinkActionDirective";
import {ResizeEventPlugin} from "./ResizeEventPlugin";
import {GlobalErrorHandler} from "./GlobalErrorHandler";

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
        {provide: EVENT_MANAGER_PLUGINS, useClass: ResizeEventPlugin, multi: true},
        {provide: ErrorHandler, useClass: GlobalErrorHandler}
      ]
    };
  }
}
