import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdIconControl} from "./SdIconControl";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdIconLayerControl} from "./SdIconLayerControl";
import {SdIconLayerTextControl} from "./SdIconLayerTextControl";
import {SdIconLayerCounterControl} from "./SdIconLayerCounterControl";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule
  ],
  exports: [
    SdIconControl,
    SdIconLayerControl,
    SdIconLayerTextControl,
    SdIconLayerCounterControl
  ],
  declarations: [
    SdIconControl,
    SdIconLayerControl,
    SdIconLayerTextControl,
    SdIconLayerCounterControl
  ]
})
export class SdIconModule {
}
