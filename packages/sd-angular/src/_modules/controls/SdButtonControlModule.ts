import {NgModule} from "@angular/core";
import {../../controls/SdButtonControl} from "../../controls/SdButtonControl";
import {CommonModule} from "@angular/common";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    SdButtonControl
  ],
  exports: [
    SdButtonControl
  ],
  entryComponents: []
})
export class SdButtonControlModule {
}