import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdAnchorModule } from "../anchor/sd-anchor.module";
import { SdGapModule } from "../gap/sd-gap.module";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { SdToastModule } from "../toast/sd-toast.module";
import { SdStatePresetControl } from "./sd-state-preset.control";

@NgModule({
  imports: [CommonModule, SdAnchorModule, SdGapModule, FontAwesomeModule, SdToastModule],
  declarations: [SdStatePresetControl],
  exports: [SdStatePresetControl],
  providers: []
})
export class SdStatePresetModule {
}
