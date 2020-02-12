import {NgModule, ApplicationModule} from "@angular/core";
import {../../controls/SdSheetControl} from "../../controls/SdSheetControl";
import {SdSheetColumnControlModule} from "./SdSheetColumnControlModule";
import {SdAnchorControlModule} from "./SdAnchorControlModule";
import {SdDockContainerControlModule} from "./SdDockContainerControlModule";
import {SdIconControlModule} from "./SdIconControlModule";
import {SdPaginationControlModule} from "./SdPaginationControlModule";
import {SdPaneControlModule} from "./SdPaneControlModule";

@NgModule({
  imports: [
    ApplicationModule,
    SdSheetColumnControlModule,
    SdAnchorControlModule,
    SdDockContainerControlModule,
    SdIconControlModule,
    SdPaginationControlModule,
    SdPaneControlModule
  ],
  declarations: [
    SdSheetControl
  ],
  exports: [
    SdSheetControl
  ],
  entryComponents: []
})
export class SdSheetControlModule {
}