import {NgModule} from "@angular/core";
import {SdToastControl} from "../../controls/SdToastControl";
import {CommonModule} from "@angular/common";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    SdToastControl
  ],
  exports: [
    SdToastControl
  ],
  entryComponents: []
})
export class SdToastControlModule {
}