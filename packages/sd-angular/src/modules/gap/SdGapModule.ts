import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdGapControl} from "./SdGapControl";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule
  ],
  exports: [
    SdGapControl
  ],
  declarations: [
    SdGapControl
  ]
})
export class SdGapModule {
}
