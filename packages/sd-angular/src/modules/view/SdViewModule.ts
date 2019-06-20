import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdViewControl} from "./SdViewControl";
import {SdViewItemControl} from "./SdViewItemControl";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule
  ],
  exports: [
    SdViewControl,
    SdViewItemControl
  ],
  declarations: [
    SdViewControl,
    SdViewItemControl
  ]
})
export class SdViewModule {
}
