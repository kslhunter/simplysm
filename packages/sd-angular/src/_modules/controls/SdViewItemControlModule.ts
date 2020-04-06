import {NgModule} from "@angular/core";
import {SdViewItemControl} from "../../controls/SdViewItemControl";
import {SdViewControlModule} from "./SdViewControlModule";

@NgModule({
  imports: [
    SdViewControlModule
  ],
  declarations: [
    SdViewItemControl
  ],
  exports: [
    SdViewItemControl
  ],
  entryComponents: [],
  providers: []
})
export class SdViewItemControlModule {
}