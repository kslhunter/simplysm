import {NgModule} from "@angular/core";
import {SdTabItemControl} from "../../controls/SdTabItemControl";
import {SdTabControlModule} from "./SdTabControlModule";

@NgModule({
  imports: [
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