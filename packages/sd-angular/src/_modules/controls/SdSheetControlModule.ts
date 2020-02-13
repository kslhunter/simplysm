import {NgModule, ApplicationModule} from "@angular/core";
import {SdSheetControl} from "../../controls/SdSheetControl";
import {SdSheetColumnControlModule} from "./SdSheetColumnControlModule";
import {SdAnchorControlModule} from "./SdAnchorControlModule";
import {SdIconControlModule} from "./SdIconControlModule";
import {SdDockContainerControlModule} from "./SdDockContainerControlModule";
import {SdPaginationControlModule} from "./SdPaginationControlModule";
import {SdPaneControlModule} from "./SdPaneControlModule";

@NgModule({
  imports: [
    ApplicationModule,
    SdSheetColumnControlModule,
    SdAnchorControlModule,
    SdIconControlModule,
    SdDockContainerControlModule,
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