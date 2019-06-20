import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdTextfieldControl} from "./SdTextfieldControl";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule
  ],
  exports: [
    SdTextfieldControl
  ],
  declarations: [
    SdTextfieldControl
  ]
})
export class SdTextfieldModule {
}
