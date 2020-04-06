import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdViewControl} from "../../controls/SdViewControl";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    SdViewControl
  ],
  exports: [
    SdViewControl
  ],
  entryComponents: [],
  providers: []
})
export class SdViewControlModule {
}