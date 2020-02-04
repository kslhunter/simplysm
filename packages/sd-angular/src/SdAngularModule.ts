import {ErrorHandler, NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdAngularGlobalErrorHandler} from "./commons/SdAngularGlobalErrorHandler";
import {controls, directives, entryComponents, pipes, providers} from "./module-definitions";
import {EVENT_MANAGER_PLUGINS} from "@angular/platform-browser";
import {SdResizeEventPlugin} from "./commons/SdResizeEventPlugin";
import {SdMutationEventPlugin} from "./commons/SdMutationEventPlugin";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    ...controls,
    ...entryComponents,
    ...directives,
    ...pipes
  ],
  exports: [
    ...controls,
    ...entryComponents,
    ...directives,
    ...pipes
  ],
  entryComponents: [
    ...entryComponents
  ],
  providers: [
    ...providers,
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
}
