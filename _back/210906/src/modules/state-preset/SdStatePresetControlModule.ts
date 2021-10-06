import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdStatePresetControl } from "./SdStatePresetControl";
import { SdIconControlModule } from "../icon/SdIconControlModule";
import { SdAnchorControlModule } from "../anchor/SdAnchorControlModule";
import { SdGapControlModule } from "../gap/SdGapControlModule";
import { SdToastModule } from "../toast/SdToastModule";

@NgModule({
  imports: [
    CommonModule,
    SdToastModule,
    SdIconControlModule,
    SdAnchorControlModule,
    SdGapControlModule
  ],
  declarations: [
    SdStatePresetControl
  ],
  exports: [
    SdStatePresetControl
  ]
})
export class SdStatePresetControlModule {
}
