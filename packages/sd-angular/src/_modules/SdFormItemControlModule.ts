import {NgModule} from "@angular/core";
import {SdFormItemControl} from "../controls/SdFormItemControl";
import {SdFormControlModule} from "./SdFormControlModule";

@NgModule({
  imports: [
    SdFormControlModule
  ],
  declarations: [
    SdFormItemControl
  ],
  exports: [
    SdFormItemControl
  ],
  entryComponents: []
})
export class SdFormItemControlModule {
}