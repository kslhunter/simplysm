import {NgModule} from "@angular/core";
import {SdCollapseControl} from "../../controls/SdCollapseControl";
import {SdResizeDirectiveModule} from "../directives/SdResizeDirectiveModule";

@NgModule({
  imports: [
    SdResizeDirectiveModule
  ],
  declarations: [
    SdCollapseControl
  ],
  exports: [
    SdCollapseControl
  ],
  entryComponents: []
})
export class SdCollapseControlModule {
}