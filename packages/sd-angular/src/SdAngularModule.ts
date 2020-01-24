import {ErrorHandler, NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdButtonControl} from "./controls/SdButtonControl";
import {SdAngularGlobalErrorHandler} from "./providers/SdAngularGlobalErrorHandler";
import {SdFormControl} from "./controls/SdFormControl";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    SdButtonControl,
    SdFormControl
  ],
  exports: [
    SdButtonControl,
    SdFormControl
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
