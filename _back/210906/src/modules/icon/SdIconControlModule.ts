import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdIconControl } from "./SdIconControl";
import { SdIconLayerCounterControl } from "./SdIconLayerCounterControl";
import { SdIconLayerTextControl } from "./SdIconLayerTextControl";
import { SdIconLayerControl } from "./SdIconLayerControl";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    SdIconControl,
    SdIconLayerControl,
    SdIconLayerCounterControl,
    SdIconLayerTextControl
  ],
  exports: [
    SdIconControl,
    SdIconLayerControl,
    SdIconLayerCounterControl,
    SdIconLayerTextControl
  ]
})
export class SdIconControlModule {
}
