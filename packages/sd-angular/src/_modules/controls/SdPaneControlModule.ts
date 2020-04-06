import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdPaneControl} from "../../controls/SdPaneControl";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    SdPaneControl
  ],
  exports: [
    SdPaneControl
  ],
  entryComponents: [],
  providers: []
})
export class SdPaneControlModule {
}