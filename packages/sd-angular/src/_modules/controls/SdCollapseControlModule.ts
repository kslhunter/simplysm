import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdCollapseControl} from "../../controls/SdCollapseControl";
import {SdResizeDirectiveModule} from "../directives/SdResizeDirectiveModule";

@NgModule({
  imports: [
    CommonModule,
    SdResizeDirectiveModule
  ],
  declarations: [
    SdCollapseControl
  ],
  exports: [
    SdCollapseControl
  ],
  entryComponents: [],
  providers: []
})
export class SdCollapseControlModule {
}