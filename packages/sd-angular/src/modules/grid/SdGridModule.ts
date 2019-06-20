import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdGridControl} from "./SdGridControl";
import {SdGridItemControl} from "./SdGridItemControl";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule
  ],
  exports: [
    SdGridControl,
    SdGridItemControl
  ],
  declarations: [
    SdGridControl,
    SdGridItemControl
  ]
})
export class SdGridModule {
}
