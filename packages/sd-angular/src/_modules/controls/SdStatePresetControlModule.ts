import { SdStatePresetControl } from "../../controls/SdStatePresetControl";
import { SdToastProviderModule } from "../providers/SdToastProviderModule";
import { SdAnchorControlModule } from "./SdAnchorControlModule";
import { SdGapControlModule } from "./SdGapControlModule";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";

@NgModule({
  imports: [CommonModule, FontAwesomeModule, SdAnchorControlModule, SdGapControlModule, SdToastProviderModule],
  declarations: [SdStatePresetControl],
  exports: [SdStatePresetControl],
  providers: []
})
export class SdStatePresetControlModule {
}