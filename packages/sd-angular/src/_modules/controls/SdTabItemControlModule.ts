import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdTabItemControl} from "../../controls/SdTabItemControl";
import {SdTabControlModule} from "./SdTabControlModule";

@NgModule({
  imports: [
    CommonModule,
    SdTabControlModule
  ],
  declarations: [
    SdTabItemControl
  ],
  exports: [
    SdTabItemControl
  ],
  entryComponents: [],
  providers: []
})
export class SdTabItemControlModule {
}