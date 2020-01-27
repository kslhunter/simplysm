import {ErrorHandler, NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdAngularGlobalErrorHandler} from "./providers/SdAngularGlobalErrorHandler";
import {controls} from "./definitions";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    ...controls
  ],
  exports: [
    ...controls
  ],
  providers: [
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
