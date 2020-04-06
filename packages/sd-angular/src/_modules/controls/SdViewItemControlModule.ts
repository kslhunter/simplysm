import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdViewItemControl} from "../../controls/SdViewItemControl";
import {SdViewControlModule} from "./SdViewControlModule";

@NgModule({
  imports: [
    CommonModule,
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