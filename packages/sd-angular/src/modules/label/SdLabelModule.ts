import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdLabelControl} from "./SdLabelControl";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule
  ],
  exports: [
    SdLabelControl
  ],
  declarations: [
    SdLabelControl
  ]
})
export class SdLabelModule {
}
