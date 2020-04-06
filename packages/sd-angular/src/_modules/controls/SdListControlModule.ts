import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdListControl} from "../../controls/SdListControl";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    SdListControl
  ],
  exports: [
    SdListControl
  ],
  entryComponents: [],
  providers: []
})
export class SdListControlModule {
}